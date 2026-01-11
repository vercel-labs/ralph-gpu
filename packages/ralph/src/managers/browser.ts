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
   */
  async open(options: {
    url: string;
    name?: string;
    viewport?: { width: number; height: number };
    headless?: boolean;
  }): Promise<{
    name: string;
    url: string;
    screenshot: string;
    consoleErrors: string[];
  }> {
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

    // Take initial screenshot and convert to base64
    const screenshotBuffer = await page.screenshot();
    const screenshot = screenshotBuffer.toString("base64");

    return {
      name,
      url,
      screenshot,
      consoleErrors: [...consoleErrors],
    };
  }

  /**
   * Take a screenshot of current page state.
   */
  async screenshot(options: {
    name?: string;
    selector?: string;
    fullPage?: boolean;
  }): Promise<{ screenshot: string; url: string }> {
    const { name = "main", selector, fullPage = false } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    let screenshotBuffer: Buffer;

    if (selector) {
      const element = await managed.page.$(selector);
      if (!element) {
        throw new Error(`Element "${selector}" not found`);
      }
      screenshotBuffer = await element.screenshot();
    } else {
      screenshotBuffer = await managed.page.screenshot({ fullPage });
    }

    return {
      screenshot: screenshotBuffer.toString("base64"),
      url: managed.page.url(),
    };
  }

  /**
   * Click an element.
   */
  async click(options: {
    selector: string;
    name?: string;
  }): Promise<{ clicked: string; screenshot: string }> {
    const { selector, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.click(selector);
    await managed.page.waitForLoadState("networkidle").catch(() => {});

    const screenshotBuffer = await managed.page.screenshot();

    return {
      clicked: selector,
      screenshot: screenshotBuffer.toString("base64"),
    };
  }

  /**
   * Type text into an input.
   */
  async type(options: {
    selector: string;
    text: string;
    name?: string;
  }): Promise<{ typed: string; screenshot: string }> {
    const { selector, text, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.fill(selector, text);

    const screenshotBuffer = await managed.page.screenshot();

    return {
      typed: text,
      screenshot: screenshotBuffer.toString("base64"),
    };
  }

  /**
   * Scroll the page.
   */
  async scroll(options: {
    direction: "up" | "down";
    amount?: number;
    name?: string;
  }): Promise<{ scrolled: number; screenshot: string }> {
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

    const screenshotBuffer = await managed.page.screenshot();

    return {
      scrolled: amount,
      screenshot: screenshotBuffer.toString("base64"),
    };
  }

  /**
   * Navigate to a new URL.
   */
  async navigate(options: {
    url: string;
    name?: string;
  }): Promise<{ url: string; screenshot: string }> {
    const { url, name = "main" } = options;

    const managed = this.browsers.get(name);
    if (!managed) {
      throw new Error(`Browser "${name}" not found. Call openBrowser first.`);
    }

    await managed.page.goto(url, { waitUntil: "networkidle" });
    managed.info.url = url;

    const screenshotBuffer = await managed.page.screenshot();

    return {
      url,
      screenshot: screenshotBuffer.toString("base64"),
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
