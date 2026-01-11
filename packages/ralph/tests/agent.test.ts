import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoopAgent } from "../src/agent";
import type { LanguageModel, Tool } from "ai";

/**
 * Create a mock language model for testing
 */
function createMockModel(): LanguageModel {
  return {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: "json",
  } as LanguageModel;
}

describe("LoopAgent", () => {
  describe("constructor", () => {
    it("should create instance with minimal config", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should create instance with full config", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        defaultTools: false,
        tools: {
          customTool: {
            description: "A custom tool",
            execute: async () => ({ done: true }),
          } as Tool,
        },
        limits: {
          maxIterations: 100,
          maxCost: 5.0,
          timeout: "1h",
        },
        completion: {
          type: "tool",
        },
        context: "Some context",
        rules: ["Rule 1", "Rule 2"],
        stuckDetection: {
          threshold: 5,
          disabled: false,
        },
        onUpdate: () => {},
        onStuck: async () => null,
        onComplete: () => {},
        onError: () => {},
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept context files", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        context: [
          { name: "file1.ts", content: "const x = 1;" },
          { name: "file2.ts", content: "const y = 2;" },
        ],
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept custom system prompt", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        systemPrompt: "You are a helpful assistant.",
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });

  describe("getStatus", () => {
    it("should return idle status before run", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
      });

      const status = agent.getStatus();

      expect(status.state).toBe("idle");
      expect(status.iteration).toBe(0);
      expect(status.cost).toBe(0);
      expect(status.tokens).toEqual({ input: 0, output: 0, total: 0 });
      expect(status.elapsed).toBe(0);
      expect(status.lastActions).toEqual([]);
    });
  });

  describe("getHistory", () => {
    it("should return empty history before run", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
      });

      const history = agent.getHistory();

      expect(history).toEqual([]);
    });
  });

  describe("stop", () => {
    it("should not throw before run", async () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
      });

      // Should not throw
      await expect(agent.stop()).resolves.not.toThrow();
    });
  });

  describe("nudge", () => {
    it("should not throw before run", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
      });

      // Should not throw
      expect(() => agent.nudge("Focus on the main task")).not.toThrow();
    });
  });

  describe("configuration validation", () => {
    it("should accept all valid completion types", () => {
      const completionTypes: Array<{
        type: "file" | "tool" | "command" | "custom";
        file?: string;
        command?: string;
        check?: () => Promise<{ complete: boolean }>;
      }> = [
        { type: "tool" },
        { type: "file", file: ".done" },
        { type: "command", command: "npm test" },
        { type: "custom", check: async () => ({ complete: false }) },
      ];

      completionTypes.forEach((completion) => {
        const agent = new LoopAgent({
          model: createMockModel(),
          task: "Test task",
          completion,
        });
        expect(agent).toBeInstanceOf(LoopAgent);
      });
    });

    it("should accept numeric timeout", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        limits: {
          timeout: 3600000, // 1 hour in ms
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept string timeout", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        limits: {
          timeout: "2h",
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });

  describe("defaultTools option", () => {
    it("should accept defaultTools: true", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        defaultTools: true,
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept defaultTools: false", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        defaultTools: false,
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });

  describe("callbacks", () => {
    it("should accept all callback types", () => {
      const onUpdate = vi.fn();
      const onStuck = vi.fn().mockResolvedValue(null);
      const onComplete = vi.fn();
      const onError = vi.fn();

      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        onUpdate,
        onStuck,
        onComplete,
        onError,
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept onStuck that returns nudge message", () => {
      const onStuck = vi.fn().mockResolvedValue("Try a different approach");

      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        onStuck,
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });

  describe("custom tools", () => {
    it("should accept custom tools", () => {
      const customTool: Tool = {
        description: "A custom tool for testing",
        parameters: { type: "object", properties: {} },
        execute: async () => ({ result: "success" }),
      };

      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        tools: {
          myCustomTool: customTool,
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept multiple custom tools", () => {
      const tool1: Tool = {
        description: "Tool 1",
        execute: async () => ({ result: 1 }),
      };

      const tool2: Tool = {
        description: "Tool 2",
        execute: async () => ({ result: 2 }),
      };

      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        tools: {
          tool1,
          tool2,
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });

  describe("stuckDetection options", () => {
    it("should accept disabled stuck detection", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        stuckDetection: {
          disabled: true,
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });

    it("should accept custom threshold", () => {
      const agent = new LoopAgent({
        model: createMockModel(),
        task: "Test task",
        stuckDetection: {
          threshold: 10,
        },
      });

      expect(agent).toBeInstanceOf(LoopAgent);
    });
  });
});
