/**
 * Simple logger for ralph agent with debug mode support.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Global debug mode flag
let globalDebugMode = false;
let globalLogLevel: LogLevel = "info";

/**
 * Enable or disable debug mode globally.
 */
export function setDebugMode(enabled: boolean): void {
  globalDebugMode = enabled;
  if (enabled) {
    globalLogLevel = "debug";
  }
}

/**
 * Set the global log level.
 */
export function setLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

/**
 * Check if debug mode is enabled.
 */
export function isDebugMode(): boolean {
  return globalDebugMode;
}

/**
 * Get current log level.
 */
export function getLogLevel(): LogLevel {
  return globalLogLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[globalLogLevel];
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

function formatValue(value: unknown, maxLength = 200): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return truncate(value, maxLength);
  }
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value);
      return truncate(str, maxLength);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

/**
 * Logger for tool execution.
 */
export const toolLogger = {
  /**
   * Log when a tool is called.
   */
  call(toolName: string, args: Record<string, unknown>): void {
    if (!shouldLog("info")) return;

    const timestamp = formatTimestamp();
    const icon = getToolIcon(toolName);

    console.log(`  ${icon} [${timestamp}] ${toolName}`);

    // Always show key arguments
    if (args.command) {
      console.log(`     ▸ command: ${formatValue(args.command, 100)}`);
    }
    if (args.path) {
      console.log(`     ▸ path: ${args.path}`);
    }
    if (args.url) {
      console.log(`     ▸ url: ${args.url}`);
    }
    // Show thought content for think tool
    if (toolName === "think" && args.thought) {
      const thought = String(args.thought);
      const lines = thought.split("\n");
      const preview = lines.slice(0, 3).map(l => truncate(l, 100)).join("\n     │ ");
      console.log(`     │ ${preview}`);
      if (lines.length > 3) {
        console.log(`     │ ... (${lines.length} lines total)`);
      }
    }

    // In debug mode, show all arguments
    if (globalDebugMode) {
      for (const [key, value] of Object.entries(args)) {
        if (!["command", "path", "url", "content"].includes(key)) {
          console.log(`     ▸ ${key}: ${formatValue(value, 80)}`);
        }
      }
      if (args.content) {
        const content = String(args.content);
        console.log(`     ▸ content: (${content.length} chars)`);
        if (content.length < 200) {
          console.log(`       ${content.split("\n").slice(0, 3).join("\n       ")}`);
        }
      }
    }
  },

  /**
   * Log tool success.
   */
  success(toolName: string, result: unknown, durationMs?: number): void {
    if (!shouldLog("info")) return;

    const duration = durationMs ? ` (${durationMs}ms)` : "";
    const preview = getResultPreview(toolName, result);

    console.log(`     ✓ ${preview}${duration}`);

    // In debug mode, show full result
    if (globalDebugMode && result !== undefined) {
      console.log(`     [debug] result: ${formatValue(result, 500)}`);
    }
  },

  /**
   * Log tool error.
   */
  error(toolName: string, error: unknown, durationMs?: number): void {
    if (!shouldLog("error")) return;

    const duration = durationMs ? ` (${durationMs}ms)` : "";
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    console.log(`     ✗ Error: ${truncate(errorMsg, 150)}${duration}`);

    // In debug mode, show stack trace
    if (globalDebugMode && error instanceof Error && error.stack) {
      console.log(`     [debug] stack: ${error.stack.split("\n").slice(0, 3).join("\n       ")}`);
    }
  },

  /**
   * Log debug information.
   */
  debug(message: string, data?: unknown): void {
    if (!shouldLog("debug")) return;

    console.log(`     [debug] ${message}`);
    if (data !== undefined) {
      console.log(`             ${formatValue(data, 300)}`);
    }
  },
};

/**
 * Logger for loop/iteration events.
 */
export const loopLogger = {
  /**
   * Log iteration start.
   */
  iterationStart(iteration: number): void {
    if (!shouldLog("info")) return;
    console.log(`\n┌─ Iteration ${iteration} ${"─".repeat(40)}`);
  },

  /**
   * Log iteration end.
   */
  iterationEnd(
    iteration: number,
    stats: { durationMs: number; tokens: number; cost: number; toolCalls: number }
  ): void {
    if (!shouldLog("info")) return;
    console.log(
      `└─ Iteration ${iteration} completed: ${stats.toolCalls} tools, ` +
        `${stats.tokens.toLocaleString()} tokens, $${stats.cost.toFixed(4)} ` +
        `(${(stats.durationMs / 1000).toFixed(1)}s)`
    );
  },

  /**
   * Log stuck detection.
   */
  stuck(reason: string): void {
    if (!shouldLog("warn")) return;
    console.log(`\n⚠️  Agent stuck: ${reason}`);
  },

  /**
   * Log completion.
   */
  complete(reason: string, summary?: string): void {
    if (!shouldLog("info")) return;
    console.log(`\n✅ Agent completed: ${reason}`);
    if (summary) {
      console.log(`   Summary: ${truncate(summary, 200)}`);
    }
  },

  /**
   * Log error.
   */
  error(message: string, error?: unknown): void {
    if (!shouldLog("error")) return;
    console.log(`\n❌ Error: ${message}`);
    if (globalDebugMode && error instanceof Error && error.stack) {
      console.log(`   Stack: ${error.stack.split("\n").slice(0, 5).join("\n   ")}`);
    }
  },

  /**
   * Log debug info.
   */
  debug(message: string, data?: unknown): void {
    if (!shouldLog("debug")) return;
    console.log(`[debug] ${message}`);
    if (data !== undefined) {
      console.log(`        ${formatValue(data, 500)}`);
    }
  },
};

/**
 * Get an icon for a tool.
 */
function getToolIcon(toolName: string): string {
  const icons: Record<string, string> = {
    bash: "🔧",
    readFile: "📄",
    writeFile: "✏️",
    startProcess: "▶️",
    stopProcess: "⏹️",
    listProcesses: "📋",
    getProcessOutput: "📝",
    openBrowser: "🌐",
    screenshot: "📸",
    click: "👆",
    type: "⌨️",
    scroll: "📜",
    closeBrowser: "🚪",
    done: "🏁",
    think: "💭",
  };
  return icons[toolName] || "🔹";
}

/**
 * Get a preview of the result for logging.
 */
function getResultPreview(toolName: string, result: unknown): string {
  if (result === null || result === undefined) {
    return "completed";
  }

  if (typeof result === "string") {
    if (result.length === 0) return "empty result";
    const lines = result.split("\n").length;
    if (lines > 1) {
      return `${lines} lines`;
    }
    return truncate(result, 80);
  }

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;

    // Special handling for think tool results
    if (toolName === "think" && "thought" in obj) {
      const thought = String(obj.thought);
      const firstLine = thought.split("\n")[0];
      return truncate(firstLine, 80);
    }

    // Special handling for bash results
    if ("stdout" in obj || "stderr" in obj || "exitCode" in obj) {
      const exitCode = obj.exitCode ?? 0;
      const stdout = String(obj.stdout || "");
      const stderr = String(obj.stderr || "");

      if (exitCode !== 0) {
        return `exit ${exitCode}: ${truncate(stderr || stdout, 60)}`;
      }

      const output = stdout || stderr;
      const lines = output.split("\n").filter((l: string) => l.trim()).length;
      if (lines > 0) {
        return `exit 0, ${lines} lines`;
      }
      return "exit 0";
    }

    // Generic object
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    if (keys.length <= 3) {
      return `{${keys.join(", ")}}`;
    }
    return `{${keys.slice(0, 3).join(", ")}, ...}`;
  }

  return String(result);
}
