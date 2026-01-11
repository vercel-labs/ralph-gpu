import type { Tool } from "ai";
import { ProcessManager } from "../managers/process";
import { BrowserManager } from "../managers/browser";
import { createBashTools, createFallbackBashTools } from "./bash";
import { createProcessTools } from "./process";
import { createBrowserTools } from "./browser";
import { createUtilityTools } from "./utility";
import { toolLogger } from "../logger";

export { bashTools, createBashTools, createFallbackBashTools } from "./bash";
export { processTools, createProcessTools } from "./process";
export { browserTools, createBrowserTools } from "./browser";
export { utilityTools, createUtilityTools } from "./utility";

export interface DefaultToolsOptions {
  processManager: ProcessManager;
  browserManager: BrowserManager;
  onDone: (summary: string) => void;
  /** Enable logging for tool calls (default: true) */
  enableLogging?: boolean;
}

/**
 * Wrap a tool with logging.
 * 
 * Note: We do NOT sanitize results here because the model needs to see
 * screenshots for visual verification. Context management happens at
 * the message level between iterations, not at the tool result level.
 */
function wrapToolWithLogging(name: string, tool: Tool): Tool {
  const originalExecute = tool.execute;

  if (!originalExecute) {
    return tool;
  }

  return {
    ...tool,
    execute: async (args, options) => {
      const startTime = Date.now();

      // Log the tool call
      toolLogger.call(name, args as Record<string, unknown>);

      try {
        const result = await originalExecute(args, options);
        const duration = Date.now() - startTime;

        // Log success
        toolLogger.success(name, result, duration);

        // Return full result - model needs to see screenshots!
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        toolLogger.error(name, error, duration);

        // Re-throw the error
        throw error;
      }
    },
  } as Tool;
}

/**
 * Wrap all tools with logging.
 */
function wrapToolsWithLogging(
  tools: Record<string, Tool>
): Record<string, Tool> {
  const wrapped: Record<string, Tool> = {};

  for (const [name, tool] of Object.entries(tools)) {
    wrapped[name] = wrapToolWithLogging(name, tool);
  }

  return wrapped;
}

/**
 * Create all default tools.
 * This is the main function to get all built-in tools.
 */
export async function createDefaultTools(
  options: DefaultToolsOptions
): Promise<Record<string, Tool>> {
  const { processManager, browserManager, onDone, enableLogging = true } = options;

  // Try to use bash-tool, fall back to built-in implementation
  let bashToolsResult: Record<string, Tool>;
  try {
    bashToolsResult = await createBashTools();
  } catch {
    // bash-tool not available, use fallback
    bashToolsResult = createFallbackBashTools();
  }

  const processToolsResult = createProcessTools(processManager);
  const browserToolsResult = createBrowserTools(browserManager);
  const utilityToolsResult = createUtilityTools(onDone);

  const allTools = {
    ...bashToolsResult,
    ...processToolsResult,
    ...browserToolsResult,
    ...utilityToolsResult,
  };

  // Wrap with logging if enabled
  if (enableLogging) {
    return wrapToolsWithLogging(allTools);
  }

  return allTools;
}
