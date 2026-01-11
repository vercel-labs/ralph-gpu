import { describe, it, expect } from "vitest";
import type {
  ContextFile,
  CompletionResult,
  CompletionContext,
  TokenUsage,
  ToolCall,
  Iteration,
  StuckReason,
  StuckContext,
  LoopStatus,
  LoopEndReason,
  LoopResult,
  LoopError,
  CompletionConfig,
  LimitsConfig,
  StuckDetectionConfig,
  LoopAgentConfig,
  LoopState,
  ProcessInfo,
  BrowserInfo,
} from "../src/types";

describe("Type Definitions", () => {
  describe("ContextFile", () => {
    it("should create valid ContextFile", () => {
      const file: ContextFile = {
        name: "package.json",
        content: '{"name": "test"}',
      };

      expect(file.name).toBe("package.json");
      expect(file.content).toBe('{"name": "test"}');
    });
  });

  describe("CompletionResult", () => {
    it("should create incomplete result", () => {
      const result: CompletionResult = {
        complete: false,
      };

      expect(result.complete).toBe(false);
      expect(result.summary).toBeUndefined();
    });

    it("should create complete result with summary", () => {
      const result: CompletionResult = {
        complete: true,
        summary: "Task completed successfully",
      };

      expect(result.complete).toBe(true);
      expect(result.summary).toBe("Task completed successfully");
    });
  });

  describe("TokenUsage", () => {
    it("should create valid TokenUsage", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
      };

      expect(usage.input).toBe(1000);
      expect(usage.output).toBe(500);
      expect(usage.total).toBe(1500);
    });
  });

  describe("ToolCall", () => {
    it("should create valid ToolCall", () => {
      const call: ToolCall = {
        name: "bash",
        args: { command: "ls -la" },
        result: { stdout: "file.txt", stderr: "", exitCode: 0 },
        duration: 150,
        timestamp: new Date(),
      };

      expect(call.name).toBe("bash");
      expect(call.args.command).toBe("ls -la");
      expect(call.duration).toBe(150);
    });
  });

  describe("Iteration", () => {
    it("should create valid Iteration", () => {
      const iteration: Iteration = {
        index: 0,
        timestamp: new Date(),
        duration: 2000,
        tokens: { input: 500, output: 200 },
        cost: 0.01,
        toolCalls: [],
      };

      expect(iteration.index).toBe(0);
      expect(iteration.duration).toBe(2000);
      expect(iteration.cost).toBe(0.01);
    });

    it("should create Iteration with optional fields", () => {
      const iteration: Iteration = {
        index: 1,
        timestamp: new Date(),
        duration: 3000,
        tokens: { input: 600, output: 300 },
        cost: 0.015,
        toolCalls: [
          {
            name: "writeFile",
            args: { path: "test.ts", content: "console.log('hi')" },
            result: { success: true },
            duration: 50,
            timestamp: new Date(),
          },
        ],
        filesModified: ["test.ts"],
        responseText: "I will create a test file",
        nudgeMessage: "Focus on the main task",
      };

      expect(iteration.filesModified).toContain("test.ts");
      expect(iteration.responseText).toBeDefined();
      expect(iteration.nudgeMessage).toBe("Focus on the main task");
    });
  });

  describe("StuckReason", () => {
    it("should have valid StuckReason values", () => {
      const reasons: StuckReason[] = [
        "repetitive",
        "error_loop",
        "oscillation",
        "no_progress",
      ];

      expect(reasons).toHaveLength(4);
      expect(reasons).toContain("repetitive");
      expect(reasons).toContain("error_loop");
    });
  });

  describe("StuckContext", () => {
    it("should create valid StuckContext", () => {
      const ctx: StuckContext = {
        reason: "error_loop",
        details: "Same error repeated 3 times",
        recentIterations: [],
        repeatedError: "Cannot find module 'foo'",
      };

      expect(ctx.reason).toBe("error_loop");
      expect(ctx.repeatedError).toBeDefined();
    });
  });

  describe("LoopStatus", () => {
    it("should create valid LoopStatus", () => {
      const status: LoopStatus = {
        id: "abc123",
        state: "running",
        iteration: 5,
        cost: 0.25,
        tokens: { input: 10000, output: 5000, total: 15000 },
        elapsed: 60000,
        lastActions: ["bash", "readFile", "writeFile"],
      };

      expect(status.state).toBe("running");
      expect(status.lastActions).toHaveLength(3);
    });

    it("should accept all valid states", () => {
      const states: LoopStatus["state"][] = [
        "idle",
        "running",
        "stuck",
        "completing",
        "done",
        "failed",
        "stopped",
      ];

      expect(states).toHaveLength(7);
    });
  });

  describe("LoopEndReason", () => {
    it("should have valid LoopEndReason values", () => {
      const reasons: LoopEndReason[] = [
        "completed",
        "max_iterations",
        "max_cost",
        "timeout",
        "stopped",
        "error",
      ];

      expect(reasons).toHaveLength(6);
    });
  });

  describe("LoopResult", () => {
    it("should create successful LoopResult", () => {
      const result: LoopResult = {
        success: true,
        reason: "completed",
        iterations: 10,
        cost: 0.5,
        tokens: { input: 20000, output: 10000, total: 30000 },
        elapsed: 120000,
        summary: "Fixed all TypeScript errors",
      };

      expect(result.success).toBe(true);
      expect(result.reason).toBe("completed");
      expect(result.error).toBeUndefined();
    });

    it("should create failed LoopResult with error", () => {
      const result: LoopResult = {
        success: false,
        reason: "error",
        iterations: 5,
        cost: 0.1,
        tokens: { input: 5000, output: 2000, total: 7000 },
        elapsed: 30000,
        summary: "Task ended: error",
        error: {
          code: "ITERATION_ERROR",
          message: "API rate limit exceeded",
        },
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("ITERATION_ERROR");
    });
  });

  describe("LoopError", () => {
    it("should create LoopError with cause", () => {
      const originalError = new Error("Network timeout");
      const error: LoopError = {
        code: "NETWORK_ERROR",
        message: "Failed to call AI model",
        cause: originalError,
      };

      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.cause).toBe(originalError);
    });
  });

  describe("CompletionConfig", () => {
    it("should create tool completion config", () => {
      const config: CompletionConfig = {
        type: "tool",
      };

      expect(config.type).toBe("tool");
    });

    it("should create file completion config", () => {
      const config: CompletionConfig = {
        type: "file",
        file: ".done",
      };

      expect(config.type).toBe("file");
      expect(config.file).toBe(".done");
    });

    it("should create command completion config", () => {
      const config: CompletionConfig = {
        type: "command",
        command: "npm test",
      };

      expect(config.type).toBe("command");
      expect(config.command).toBe("npm test");
    });

    it("should create custom completion config", () => {
      const config: CompletionConfig = {
        type: "custom",
        check: async () => ({ complete: false }),
      };

      expect(config.type).toBe("custom");
      expect(config.check).toBeDefined();
    });
  });

  describe("LimitsConfig", () => {
    it("should create LimitsConfig with all options", () => {
      const config: LimitsConfig = {
        maxIterations: 100,
        maxCost: 5.0,
        timeout: "2h",
        maxTokensPerIteration: 50000,
      };

      expect(config.maxIterations).toBe(100);
      expect(config.timeout).toBe("2h");
    });

    it("should accept numeric timeout", () => {
      const config: LimitsConfig = {
        timeout: 3600000,
      };

      expect(config.timeout).toBe(3600000);
    });
  });

  describe("StuckDetectionConfig", () => {
    it("should create StuckDetectionConfig", () => {
      const config: StuckDetectionConfig = {
        threshold: 5,
        disabled: false,
      };

      expect(config.threshold).toBe(5);
      expect(config.disabled).toBe(false);
    });
  });

  describe("LoopState", () => {
    it("should create valid LoopState", () => {
      const state: LoopState = {
        id: "test-123",
        state: "idle",
        iteration: 0,
        cost: 0,
        tokens: { input: 0, output: 0, total: 0 },
        startTime: Date.now(),
        iterations: [],
        filesModified: new Set(),
        summary: "",
        pendingNudge: null,
        shouldStop: false,
      };

      expect(state.id).toBe("test-123");
      expect(state.filesModified).toBeInstanceOf(Set);
      expect(state.shouldStop).toBe(false);
    });
  });

  describe("ProcessInfo", () => {
    it("should create valid ProcessInfo", () => {
      const info: ProcessInfo = {
        name: "dev",
        command: "npm run dev",
        pid: 12345,
        startTime: new Date(),
        cwd: "/app",
      };

      expect(info.name).toBe("dev");
      expect(info.pid).toBe(12345);
    });
  });

  describe("BrowserInfo", () => {
    it("should create valid BrowserInfo", () => {
      const info: BrowserInfo = {
        name: "main",
        url: "http://localhost:3000",
        viewport: { width: 1280, height: 720 },
      };

      expect(info.url).toBe("http://localhost:3000");
      expect(info.viewport.width).toBe(1280);
    });
  });

  describe("CompletionContext", () => {
    it("should create valid CompletionContext", () => {
      const ctx: CompletionContext = {
        iteration: 10,
        cost: 0.5,
        tokens: { input: 10000, output: 5000, total: 15000 },
        recentIterations: [],
        filesModified: ["src/index.ts", "src/utils.ts"],
      };

      expect(ctx.iteration).toBe(10);
      expect(ctx.filesModified).toHaveLength(2);
    });
  });
});
