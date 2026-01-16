import { tool, type Tool } from "ai";
import { z } from "zod";
import { BrowserManager } from "../managers/browser";

/**
 * Create browser automation tools.
 * These use Playwright for visual verification and browser automation.
 * ALWAYS runs in headless mode by default for reliability.
 * 
 * Most action tools (click, type, etc.) do NOT return screenshots by default to save tokens.
 * Use the `screenshot` tool explicitly when you need visual feedback.
 */
export function createBrowserTools(manager: BrowserManager): Record<string, Tool> {
  return {
    openBrowser: tool({
      description:
        "Open a browser and navigate to a URL. Returns a screenshot and any console errors. " +
        "ALWAYS runs in headless mode by default. Do NOT set headless: false unless explicitly required by the task.",
      inputSchema: z.object({
        url: z.string().describe("URL to navigate to"),
        name: z
          .string()
          .optional()
          .describe('Browser name for managing multiple browsers (default: "main")'),
        viewport: z
          .object({
            width: z.number(),
            height: z.number(),
          })
          .optional()
          .describe("Viewport size (default: 1280x720)"),
        headless: z
          .boolean()
          .optional()
          .default(true)
          .describe("Run in headless mode (default: true). Do NOT change unless task explicitly requires headed mode."),
      }),
      execute: async ({ url, name, viewport, headless }) => {
        return await manager.open({ url, name, viewport, headless });
      },
    }),

    screenshot: tool({
      description: 
        "Take a screenshot of the current page state. " +
        "Use this tool when you need visual feedback - most other tools do NOT return screenshots by default.",
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        selector: z
          .string()
          .optional()
          .describe("CSS selector to screenshot a specific element"),
        fullPage: z
          .boolean()
          .optional()
          .describe("Take a full page screenshot instead of viewport"),
      }),
      execute: async ({ name, selector, fullPage }) => {
        return await manager.screenshot({ name, selector, fullPage });
      },
    }),

    click: tool({
      description:
        "Click an element on the page. Does NOT return a screenshot by default (use screenshot tool if needed).",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of element to click"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after clicking (default: false)"),
      }),
      execute: async ({ selector, name, screenshot }) => {
        return await manager.click({ selector, name, screenshot });
      },
    }),

    type: tool({
      description:
        "Type text into an input field (replaces existing content). Does NOT return a screenshot by default.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of input element"),
        text: z.string().describe("Text to type"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after typing (default: false)"),
      }),
      execute: async ({ selector, text, name, screenshot }) => {
        return await manager.type({ selector, text, name, screenshot });
      },
    }),

    scroll: tool({
      description: "Scroll the page. Does NOT return a screenshot by default.",
      inputSchema: z.object({
        direction: z.enum(["up", "down"]).describe("Scroll direction"),
        amount: z
          .number()
          .optional()
          .describe("Pixels to scroll (default: 500)"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after scrolling (default: false)"),
      }),
      execute: async ({ direction, amount, name, screenshot }) => {
        return await manager.scroll({ direction, amount, name, screenshot });
      },
    }),

    navigate: tool({
      description: "Navigate to a new URL in an existing browser. Returns a screenshot by default (since you usually want to see the new page).",
      inputSchema: z.object({
        url: z.string().describe("URL to navigate to"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(true)
          .describe("Take a screenshot after navigation (default: true)"),
      }),
      execute: async ({ url, name, screenshot }) => {
        return await manager.navigate({ url, name, screenshot });
      },
    }),

    reload: tool({
      description: "Reload the current page. Clears console errors. Returns a screenshot by default.",
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(true)
          .describe("Take a screenshot after reload (default: true)"),
      }),
      execute: async ({ name, screenshot }) => {
        return await manager.reload({ name, screenshot });
      },
    }),

    browserEval: tool({
      description:
        "Execute arbitrary JavaScript code in the browser page context. " +
        "Use this for custom automation that other browser tools don't cover. " +
        "The script should be valid JavaScript that will be executed via new Function(). " +
        "Return values are captured and returned. Example: 'return document.title' or 'return Array.from(document.querySelectorAll(\"a\")).map(a => a.href)'",
      inputSchema: z.object({
        script: z.string().describe("JavaScript code to execute in the page. Use 'return' to return values."),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        takeScreenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after execution (default: false)"),
      }),
      execute: async ({ script, name, takeScreenshot }) => {
        return await manager.evaluate({ script, name, takeScreenshot });
      },
    }),

    waitForSelector: tool({
      description: "Wait for a CSS selector to appear on the page. Useful for waiting for dynamic content.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector to wait for"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        timeout: z
          .number()
          .optional()
          .default(10000)
          .describe("Timeout in milliseconds (default: 10000)"),
        state: z
          .enum(["attached", "detached", "visible", "hidden"])
          .optional()
          .default("visible")
          .describe("State to wait for (default: visible)"),
      }),
      execute: async ({ selector, name, timeout, state }) => {
        return await manager.waitForSelector({ selector, name, timeout, state });
      },
    }),

    waitForText: tool({
      description: "Wait for specific text to appear anywhere on the page.",
      inputSchema: z.object({
        text: z.string().describe("Text to wait for"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        timeout: z
          .number()
          .optional()
          .default(10000)
          .describe("Timeout in milliseconds (default: 10000)"),
      }),
      execute: async ({ text, name, timeout }) => {
        return await manager.waitForText({ text, name, timeout });
      },
    }),

    getContent: tool({
      description: "Get text content, HTML, or input value from the page or a specific element.",
      inputSchema: z.object({
        selector: z
          .string()
          .optional()
          .describe("CSS selector of element (omit for full page)"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        type: z
          .enum(["text", "html", "value"])
          .optional()
          .default("text")
          .describe("Type of content to get: text (innerText), html (innerHTML), value (input value)"),
      }),
      execute: async ({ selector, name, type }) => {
        return await manager.getContent({ selector, name, type });
      },
    }),

    hover: tool({
      description: "Hover over an element. Does NOT return a screenshot by default.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of element to hover"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after hovering (default: false)"),
      }),
      execute: async ({ selector, name, screenshot }) => {
        return await manager.hover({ selector, name, screenshot });
      },
    }),

    pressKey: tool({
      description:
        "Press a keyboard key or key combination. " +
        "Examples: 'Enter', 'Tab', 'Escape', 'ArrowDown', 'Control+a', 'Meta+Enter', 'Shift+Tab'. " +
        "Does NOT return a screenshot by default.",
      inputSchema: z.object({
        key: z.string().describe("Key to press (e.g., 'Enter', 'Tab', 'Control+a', 'Meta+Enter')"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after pressing (default: false)"),
      }),
      execute: async ({ key, name, screenshot }) => {
        return await manager.pressKey({ key, name, screenshot });
      },
    }),

    focus: tool({
      description: "Focus an element. Useful before typing or pressing keys on a specific element.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of element to focus"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
      }),
      execute: async ({ selector, name }) => {
        return await manager.focus({ selector, name });
      },
    }),

    selectOption: tool({
      description: "Select an option in a dropdown/select element. Does NOT return a screenshot by default.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of the select element"),
        value: z
          .string()
          .optional()
          .describe("Option value to select"),
        label: z
          .string()
          .optional()
          .describe("Option label/text to select"),
        index: z
          .number()
          .optional()
          .describe("Option index to select (0-based)"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe("Take a screenshot after selecting (default: false)"),
      }),
      execute: async ({ selector, value, label, index, name, screenshot }) => {
        return await manager.selectOption({ selector, value, label, index, name, screenshot });
      },
    }),

    elementExists: tool({
      description: "Check if an element exists on the page. Fast check without waiting.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector to check"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
      }),
      execute: async ({ selector, name }) => {
        return await manager.elementExists({ selector, name });
      },
    }),

    queryAll: tool({
      description:
        "Query all elements matching a selector and get their text content or an attribute. " +
        "Useful for extracting lists of data from the page.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector to match"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
        attribute: z
          .string()
          .optional()
          .describe("Attribute to extract instead of text content (e.g., 'href', 'src', 'class')"),
      }),
      execute: async ({ selector, name, attribute }) => {
        return await manager.queryAll({ selector, name, attribute });
      },
    }),

    getConsoleErrors: tool({
      description: "Get all console errors captured since the browser was opened or reloaded.",
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
      }),
      execute: async ({ name }) => {
        return {
          errors: manager.getConsoleErrors(name),
        };
      },
    }),

    listBrowsers: tool({
      description: "List all open browser instances.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          browsers: manager.list(),
        };
      },
    }),

    closeBrowser: tool({
      description: "Close a browser instance",
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe('Browser name to close (default: "main")'),
      }),
      execute: async ({ name }) => {
        const closed = await manager.close(name);
        return {
          closed: name ?? "main",
          success: closed,
        };
      },
    }),
  };
}

export const browserTools = {
  create: createBrowserTools,
};
