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
 * Simple result without screenshot
 */
interface ActionResult {
  success: boolean;
  [key: string]: unknown;
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
   * ALWAYS runs headless by default for reliability and performance.
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
      headless = true, // ALWAYS headless by default - do not change unless explicitly required
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
      consoleErrors: [...managed.consoleErrors],
    });
  }

  /**
   * Click an element.
   * Screenshot is optional (default: false) to save tokens.
   */
  async click(options: {
    selector: string;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { selector, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.click(selector);
    await managed.page.waitForLoadState("networkidle").catch(() => {});

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        clicked: selector,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      clicked: selector,
      url: managed.page.url(),
    };
  }

  /**
   * Type text into an input.
   * Screenshot is optional (default: false) to save tokens.
   */
  async type(options: {
    selector: string;
    text: string;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { selector, text, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.fill(selector, text);

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        typed: text,
        selector,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      typed: text,
      selector,
      url: managed.page.url(),
    };
  }

  /**
   * Scroll the page.
   * Screenshot is optional (default: false) to save tokens.
   */
  async scroll(options: {
    direction: "up" | "down";
    amount?: number;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { direction, amount = 500, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    const scrollAmount = direction === "down" ? amount : -amount;
    await managed.page.evaluate((y: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).scrollBy(0, y);
    }, scrollAmount);

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        scrolled: amount,
        direction,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      scrolled: amount,
      direction,
      url: managed.page.url(),
    };
  }

  /**
   * Navigate to a new URL.
   * Screenshot is optional (default: true for navigation since seeing the new page is useful).
   */
  async navigate(options: {
    url: string;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { url, name = "main", screenshot = true } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.goto(url, { waitUntil: "networkidle" });
    managed.info.url = url;

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        url,
        navigatedTo: url,
        consoleErrors: [...managed.consoleErrors],
      });
    }

    return {
      success: true,
      url,
      navigatedTo: url,
    };
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
   * Execute arbitrary JavaScript in the page context.
   * This is powerful - use for custom automation that other tools don't cover.
   */
  async evaluate(options: {
    script: string;
    name?: string;
    takeScreenshot?: boolean;
  }): Promise<{ result: unknown; consoleErrors: string[] } | ImageToolResult> {
    const { script, name = "main", takeScreenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    // Execute the script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await managed.page.evaluate((code: string) => {
      // Create a function from the code and execute it
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const fn = new Function(code);
      return fn();
    }, script);

    if (takeScreenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        result,
        consoleErrors: [...managed.consoleErrors],
      });
    }

    return {
      result,
      consoleErrors: [...managed.consoleErrors],
    };
  }

  /**
   * Wait for a selector to appear on the page.
   */
  async waitForSelector(options: {
    selector: string;
    name?: string;
    timeout?: number;
    state?: "attached" | "detached" | "visible" | "hidden";
  }): Promise<{ found: boolean; selector: string }> {
    const { selector, name = "main", timeout = 10000, state = "visible" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    try {
      await managed.page.waitForSelector(selector, { timeout, state });
      return { found: true, selector };
    } catch {
      return { found: false, selector };
    }
  }

  /**
   * Wait for specific text to appear on the page.
   */
  async waitForText(options: {
    text: string;
    name?: string;
    timeout?: number;
  }): Promise<{ found: boolean; text: string }> {
    const { text, name = "main", timeout = 10000 } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    try {
      // Use getByText which is built-in to Playwright and handles the DOM access
      await managed.page.getByText(text, { exact: false }).first().waitFor({ timeout, state: "visible" });
      return { found: true, text };
    } catch {
      return { found: false, text };
    }
  }

  /**
   * Get text content or HTML from the page or a specific element.
   */
  async getContent(options: {
    selector?: string;
    name?: string;
    type?: "text" | "html" | "value";
  }): Promise<{ content: string; selector: string | null }> {
    const { selector, name = "main", type = "text" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    let content: string;

    if (selector) {
      const element = await managed.page.$(selector);
      if (!element) {
        throw new Error(`Element "${selector}" not found`);
      }

      if (type === "html") {
        content = await element.innerHTML();
      } else if (type === "value") {
        content = await element.inputValue().catch(() => "");
      } else {
        content = await element.innerText();
      }
    } else {
      if (type === "html") {
        content = await managed.page.content();
      } else {
        content = await managed.page.innerText("body");
      }
    }

    return { content, selector: selector || null };
  }

  /**
   * Hover over an element.
   * Screenshot is optional (default: false) to save tokens.
   */
  async hover(options: {
    selector: string;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { selector, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.hover(selector);

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        hovered: selector,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      hovered: selector,
      url: managed.page.url(),
    };
  }

  /**
   * Press a keyboard key or key combination.
   * Screenshot is optional (default: false) to save tokens.
   */
  async pressKey(options: {
    key: string;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { key, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.keyboard.press(key);

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        pressed: key,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      pressed: key,
      url: managed.page.url(),
    };
  }

  /**
   * Select an option in a dropdown/select element.
   * Screenshot is optional (default: false) to save tokens.
   */
  async selectOption(options: {
    selector: string;
    value?: string;
    label?: string;
    index?: number;
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { selector, value, label, index, name = "main", screenshot = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    let selectOptions: { value?: string; label?: string; index?: number };
    if (value !== undefined) {
      selectOptions = { value };
    } else if (label !== undefined) {
      selectOptions = { label };
    } else if (index !== undefined) {
      selectOptions = { index };
    } else {
      throw new Error("Must provide value, label, or index to select");
    }

    await managed.page.selectOption(selector, selectOptions);

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        selected: selectOptions,
        selector,
        url: managed.page.url(),
      });
    }

    return {
      success: true,
      selected: selectOptions,
      selector,
      url: managed.page.url(),
    };
  }

  /**
   * Reload the current page.
   * Screenshot is optional (default: true since seeing the reloaded page is useful).
   */
  async reload(options: {
    name?: string;
    screenshot?: boolean;
  }): Promise<ActionResult | ImageToolResult> {
    const { name = "main", screenshot = true } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    // Clear console errors before reload
    managed.consoleErrors.length = 0;

    await managed.page.reload({ waitUntil: "networkidle" });

    if (screenshot) {
      const imageData = await compressScreenshot(managed.page);
      return createImageResult(imageData, {
        success: true,
        reloaded: true,
        url: managed.page.url(),
        consoleErrors: [...managed.consoleErrors],
      });
    }

    return {
      success: true,
      reloaded: true,
      url: managed.page.url(),
    };
  }

  /**
   * Focus an element (useful before typing or pressing keys).
   */
  async focus(options: {
    selector: string;
    name?: string;
  }): Promise<{ focused: string }> {
    const { selector, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.focus(selector);

    return { focused: selector };
  }

  /**
   * Check if an element exists on the page.
   */
  async elementExists(options: {
    selector: string;
    name?: string;
  }): Promise<{ exists: boolean; selector: string }> {
    const { selector, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    const element = await managed.page.$(selector);
    return { exists: element !== null, selector };
  }

  /**
   * Get all matching elements' text content.
   */
  async queryAll(options: {
    selector: string;
    name?: string;
    attribute?: string;
  }): Promise<{ count: number; items: string[] }> {
    const { selector, name = "main", attribute } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    const elements = await managed.page.$$(selector);
    const items: string[] = [];

    for (const el of elements) {
      if (attribute) {
        const attr = await el.getAttribute(attribute);
        if (attr) items.push(attr);
      } else {
        const text = await el.innerText();
        items.push(text);
      }
    }

    return { count: elements.length, items };
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
