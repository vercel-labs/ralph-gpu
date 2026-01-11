import { tool, type Tool } from "ai";
import { z } from "zod";
import { BrowserManager } from "../managers/browser";

/**
 * Create browser automation tools.
 * These use Playwright for visual verification.
 */
export function createBrowserTools(manager: BrowserManager): Record<string, Tool> {
  return {
    openBrowser: tool({
      description:
        "Open a browser and navigate to a URL. Returns a screenshot and any console errors. " +
        "By default runs in headed mode with WebGPU support enabled.",
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
          .describe("Run in headless mode (default: false for WebGPU support)"),
      }),
      execute: async ({ url, name, viewport, headless }) => {
        return await manager.open({ url, name, viewport, headless });
      },
    }),

    screenshot: tool({
      description: "Take a screenshot of the current page state",
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
        "Click an element on the page. Returns a screenshot after clicking.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of element to click"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
      }),
      execute: async ({ selector, name }) => {
        return await manager.click({ selector, name });
      },
    }),

    type: tool({
      description:
        "Type text into an input field. Returns a screenshot after typing.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector of input element"),
        text: z.string().describe("Text to type"),
        name: z
          .string()
          .optional()
          .describe('Browser name (default: "main")'),
      }),
      execute: async ({ selector, text, name }) => {
        return await manager.type({ selector, text, name });
      },
    }),

    scroll: tool({
      description: "Scroll the page. Returns a screenshot after scrolling.",
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
      }),
      execute: async ({ direction, amount, name }) => {
        return await manager.scroll({ direction, amount, name });
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
