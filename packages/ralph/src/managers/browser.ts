import type { Browser, Page, BrowserContext } from "playwright";
import { BrowserInfo } from "../types";

interface ManagedBrowser {
  info: BrowserInfo;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  consoleErrors: string[];
}

/**
 * AI SDK v6 ToolResultOutput format for content with images.
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message#languagemodelv3toolresultoutput
 */
interface ImageToolResult {
  type: "content";
  value: Array<
    | { type: "text"; text: string }
    | { type: "image-data"; data: string; mediaType: string }
  >;
}

/**
 * Compress/resize image to reduce token usage.
 * Playwright screenshots can be quite large, we resize to max 800px and use JPEG.
 */
async function compressScreenshot(
  page: Page,
  options: { selector?: string; fullPage?: boolean } = {}
): Promise<{ data: string; mediaType: string }> {
  const { selector, fullPage = false } = options;
  
  // Take screenshot as JPEG with lower quality to reduce size
  let screenshotBuffer: Buffer;
  
  if (selector) {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element "${selector}" not found`);
    }
    screenshotBuffer = await element.screenshot({ 
      type: "jpeg", 
      quality: 60,
    });
  } else {
    screenshotBuffer = await page.screenshot({ 
      fullPage,
      type: "jpeg",
      quality: 60,
    });
  }
  
  // Log the size for debugging
  const sizeKB = (screenshotBuffer.length / 1024).toFixed(1);
  console.log(`     📷 Screenshot: ${sizeKB}KB (JPEG q60)`);
  
  return {
    data: screenshotBuffer.toString("base64"),
    mediaType: "image/jpeg",
  };
}

/**
 * Create a properly formatted tool result with an image for AI SDK v6.
 */
function createImageResult(
  imageData: { data: string; mediaType: string },
  textInfo: Record<string, unknown>
): ImageToolResult {
  return {
    type: "content",
    value: [
      { type: "text", text: JSON.stringify(textInfo, null, 2) },
      { type: "image-data", data: imageData.data, mediaType: imageData.mediaType },
    ],
  };
}

/**
 * Manages Playwright browsers for the agent.
 * Handles opening, interacting with, and closing browsers.
 */
export class BrowserManager {
  private browsers: Map<string, ManagedBrowser> = new Map();
  private playwrightModule: typeof import("playwright") | null = null;

  private async getPlaywright(): Promise<typeof import("playwright")> {
    if (!this.playwrightModule) {
      // Dynamic import to avoid requiring playwright if not used
      this.playwrightModule = await import("playwright");
    }
    return this.playwrightModule;
  }

  /**
   * Open a browser and navigate to a URL.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async open(options: {
    url: string;
    name?: string;
    viewport?: { width: number; height: number };
    headless?: boolean;
  }): Promise<ImageToolResult> {
    const {
      url,
      name = "main",
      viewport = { width: 1280, height: 720 },
      headless = false, // Default to headed mode for WebGPU support
    } = options;

    // Close existing browser with same name
    if (this.browsers.has(name)) {
      await this.close(name);
    }

    const playwright = await this.getPlaywright();
    
    let browser: Browser;
    try {
      browser = await playwright.chromium.launch({
        headless,
        // Enable GPU for WebGPU support
        args: [
          '--enable-unsafe-webgpu',
          '--enable-features=Vulkan',
          '--use-gl=angle',
          '--use-angle=metal', // For macOS
          '--ignore-gpu-blocklist',
        ],
      });
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("Executable doesn't exist")) {
        throw new Error(
          `Playwright browser not installed. Run: npx playwright install chromium\n` +
          `Original error: ${err.message}`
        );
      }
      throw error;
    }

    const context = await browser.newContext({
      viewport,
    });

    const page = await context.newPage();
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto(url, { waitUntil: "networkidle" });

    const managed: ManagedBrowser = {
      info: { name, url, viewport },
      browser,
      context,
      page,
      consoleErrors,
    };

    this.browsers.set(name, managed);

    // Take compressed screenshot for AI SDK
    const imageData = await compressScreenshot(page);

    // Return in AI SDK v6 content format
    return createImageResult(imageData, {
      name,
      url,
      consoleErrors: [...consoleErrors],
    });
  }

  /**
   * Take a screenshot of current page state.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async screenshot(options: {
    name?: string;
    selector?: string;
    fullPage?: boolean;
  }): Promise<ImageToolResult> {
    const { name = "main", selector, fullPage = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    const imageData = await compressScreenshot(managed.page, { selector, fullPage });

    return createImageResult(imageData, {
      url: managed.page.url(),
      selector: selector || null,
    });
  }

  /**
   * Click an element.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async click(options: {
    selector: string;
    name?: string;
  }): Promise<ImageToolResult> {
    const { selector, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.click(selector);
    await managed.page.waitForLoadState("networkidle").catch(() => {});

    const imageData = await compressScreenshot(managed.page);

    return createImageResult(imageData, {
      clicked: selector,
      url: managed.page.url(),
    });
  }

  /**
   * Type text into an input.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async type(options: {
    selector: string;
    text: string;
    name?: string;
  }): Promise<ImageToolResult> {
    const { selector, text, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.fill(selector, text);

    const imageData = await compressScreenshot(managed.page);

    return createImageResult(imageData, {
      typed: text,
      selector,
      url: managed.page.url(),
    });
  }

  /**
   * Scroll the page.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async scroll(options: {
    direction: "up" | "down";
    amount?: number;
    name?: string;
  }): Promise<ImageToolResult> {
    const { direction, amount = 500, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    const scrollAmount = direction === "down" ? amount : -amount;
    await managed.page.evaluate((y: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).scrollBy(0, y);
    }, scrollAmount);

    const imageData = await compressScreenshot(managed.page);

    return createImageResult(imageData, {
      scrolled: amount,
      direction,
      url: managed.page.url(),
    });
  }

  /**
   * Navigate to a new URL.
   * Returns screenshot in AI SDK v6 content format for proper image handling.
   */
  async navigate(options: {
    url: string;
    name?: string;
  }): Promise<ImageToolResult> {
    const { url, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.goto(url, { waitUntil: "networkidle" });
    managed.info.url = url;

    const imageData = await compressScreenshot(managed.page);

    return createImageResult(imageData, {
      url,
      navigatedTo: url,
    });
  }

  /**
   * Get console errors from a browser.
   */
  getConsoleErrors(name: string = "main"): string[] {
    const managed = this.browsers.get(name);
    if (!managed) {
      return [];
    }
    return [...managed.consoleErrors];
  }

  /**
   * Close a browser.
   */
  async close(name: string = "main"): Promise<boolean> {
    const managed = this.browsers.get(name);
    if (!managed) {
      return false;
    }

    await managed.browser.close();
    this.browsers.delete(name);
    return true;
  }

  /**
   * Get list of all open browsers.
   */
  list(): BrowserInfo[] {
    return Array.from(this.browsers.values()).map((m) => m.info);
  }

  /**
   * Close all browsers. Called during cleanup.
   */
  async closeAll(): Promise<void> {
    const names = Array.from(this.browsers.keys());
    await Promise.all(names.map((name) => this.close(name)));
  }
}
