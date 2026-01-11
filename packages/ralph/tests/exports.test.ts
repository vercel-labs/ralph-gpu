import { describe, it, expect } from "vitest";

describe("API Exports", () => {
  describe("Main exports from index.ts", () => {
    it("should export LoopAgent class", async () => {
      const { LoopAgent } = await import("../src/index");
      expect(LoopAgent).toBeDefined();
      expect(typeof LoopAgent).toBe("function");
    });

    it("should export all rules", async () => {
      const {
        brainRule,
        trackProgressRule,
        visualCheckRule,
        testFirstRule,
        minimalChangesRule,
        explorationRule,
        gitCheckpointRule,
        debugRule,
      } = await import("../src/index");

      expect(brainRule).toBeDefined();
      expect(trackProgressRule).toBeDefined();
      expect(visualCheckRule).toBeDefined();
      expect(testFirstRule).toBeDefined();
      expect(minimalChangesRule).toBeDefined();
      expect(explorationRule).toBeDefined();
      expect(gitCheckpointRule).toBeDefined();
      expect(debugRule).toBeDefined();
    });

    it("should export bash tools", async () => {
      const { bashTools, createBashTools, createFallbackBashTools } =
        await import("../src/index");

      expect(bashTools).toBeDefined();
      expect(createBashTools).toBeDefined();
      expect(createFallbackBashTools).toBeDefined();
      expect(typeof createBashTools).toBe("function");
      expect(typeof createFallbackBashTools).toBe("function");
    });

    it("should export process tools", async () => {
      const { processTools, createProcessTools } = await import(
        "../src/index"
      );

      expect(processTools).toBeDefined();
      expect(createProcessTools).toBeDefined();
      expect(typeof createProcessTools).toBe("function");
    });

    it("should export browser tools", async () => {
      const { browserTools, createBrowserTools } = await import(
        "../src/index"
      );

      expect(browserTools).toBeDefined();
      expect(createBrowserTools).toBeDefined();
      expect(typeof createBrowserTools).toBe("function");
    });

    it("should export utility tools", async () => {
      const { utilityTools, createUtilityTools } = await import(
        "../src/index"
      );

      expect(utilityTools).toBeDefined();
      expect(createUtilityTools).toBeDefined();
      expect(typeof createUtilityTools).toBe("function");
    });

    it("should export createDefaultTools", async () => {
      const { createDefaultTools } = await import("../src/index");

      expect(createDefaultTools).toBeDefined();
      expect(typeof createDefaultTools).toBe("function");
    });

    it("should export ProcessManager", async () => {
      const { ProcessManager } = await import("../src/index");

      expect(ProcessManager).toBeDefined();
      expect(typeof ProcessManager).toBe("function");
    });

    it("should export BrowserManager", async () => {
      const { BrowserManager } = await import("../src/index");

      expect(BrowserManager).toBeDefined();
      expect(typeof BrowserManager).toBe("function");
    });

    it("should export StuckDetector", async () => {
      const { StuckDetector } = await import("../src/index");

      expect(StuckDetector).toBeDefined();
      expect(typeof StuckDetector).toBe("function");
    });

    it("should export prompt functions", async () => {
      const {
        buildSystemPrompt,
        buildNudgeMessage,
        formatIterationContext,
      } = await import("../src/index");

      expect(buildSystemPrompt).toBeDefined();
      expect(buildNudgeMessage).toBeDefined();
      expect(formatIterationContext).toBeDefined();
      expect(typeof buildSystemPrompt).toBe("function");
      expect(typeof buildNudgeMessage).toBe("function");
      expect(typeof formatIterationContext).toBe("function");
    });
  });

  describe("Type exports", () => {
    it("should export config types", async () => {
      // These are type-only exports, we verify they don't error at import time
      const module = await import("../src/index");

      // Type exports don't have runtime values, but importing should work
      expect(module).toBeDefined();
    });
  });

  describe("Individual module exports", () => {
    describe("agent.ts", () => {
      it("should export LoopAgent", async () => {
        const { LoopAgent } = await import("../src/agent");
        expect(LoopAgent).toBeDefined();
      });
    });

    describe("stuck.ts", () => {
      it("should export StuckDetector", async () => {
        const { StuckDetector } = await import("../src/stuck");
        expect(StuckDetector).toBeDefined();
      });
    });

    describe("prompt.ts", () => {
      it("should export all prompt functions", async () => {
        const {
          buildSystemPrompt,
          buildNudgeMessage,
          formatIterationContext,
        } = await import("../src/prompt");

        expect(buildSystemPrompt).toBeDefined();
        expect(buildNudgeMessage).toBeDefined();
        expect(formatIterationContext).toBeDefined();
      });
    });

    describe("rules.ts", () => {
      it("should export all rules", async () => {
        const rules = await import("../src/rules");

        expect(Object.keys(rules)).toContain("brainRule");
        expect(Object.keys(rules)).toContain("trackProgressRule");
        expect(Object.keys(rules)).toContain("visualCheckRule");
        expect(Object.keys(rules)).toContain("testFirstRule");
        expect(Object.keys(rules)).toContain("minimalChangesRule");
        expect(Object.keys(rules)).toContain("explorationRule");
        expect(Object.keys(rules)).toContain("gitCheckpointRule");
        expect(Object.keys(rules)).toContain("debugRule");
      });
    });

    describe("tools/index.ts", () => {
      it("should export tool factories", async () => {
        const tools = await import("../src/tools/index");

        expect(tools.createDefaultTools).toBeDefined();
        expect(tools.bashTools).toBeDefined();
        expect(tools.createBashTools).toBeDefined();
        expect(tools.createFallbackBashTools).toBeDefined();
        expect(tools.processTools).toBeDefined();
        expect(tools.createProcessTools).toBeDefined();
        expect(tools.browserTools).toBeDefined();
        expect(tools.createBrowserTools).toBeDefined();
        expect(tools.utilityTools).toBeDefined();
        expect(tools.createUtilityTools).toBeDefined();
      });
    });

    describe("managers/process.ts", () => {
      it("should export ProcessManager", async () => {
        const { ProcessManager } = await import("../src/managers/process");
        expect(ProcessManager).toBeDefined();
      });
    });

    describe("managers/browser.ts", () => {
      it("should export BrowserManager", async () => {
        const { BrowserManager } = await import("../src/managers/browser");
        expect(BrowserManager).toBeDefined();
      });
    });
  });

  describe("Integration", () => {
    it("should be able to instantiate LoopAgent with minimal config", async () => {
      const { LoopAgent } = await import("../src/index");

      // Create a mock model (we just need an object with the right shape)
      const mockModel = {} as any;

      // Should not throw during construction
      expect(
        () =>
          new LoopAgent({
            model: mockModel,
            task: "Test task",
          })
      ).not.toThrow();
    });

    it("should be able to use ProcessManager", async () => {
      const { ProcessManager } = await import("../src/index");

      const manager = new ProcessManager();
      expect(manager.list()).toEqual([]);
    });

    it("should be able to create utility tools with callback", async () => {
      const { createUtilityTools } = await import("../src/index");

      const onDone = () => {};
      const tools = createUtilityTools(onDone);

      expect(tools).toHaveProperty("done");
      expect(tools).toHaveProperty("think");
    });

    it("should be able to create fallback bash tools", async () => {
      const { createFallbackBashTools } = await import("../src/index");

      const tools = createFallbackBashTools();

      expect(tools).toHaveProperty("bash");
      expect(tools).toHaveProperty("readFile");
      expect(tools).toHaveProperty("writeFile");
    });

    it("should be able to build system prompt with rules", async () => {
      const { buildSystemPrompt, brainRule, testFirstRule } = await import(
        "../src/index"
      );

      const prompt = buildSystemPrompt({
        task: "Fix bugs",
        rules: [brainRule, testFirstRule],
      });

      expect(prompt).toContain("Fix bugs");
      expect(prompt).toContain(".brain/");
      expect(prompt).toContain("test");
    });
  });
});
