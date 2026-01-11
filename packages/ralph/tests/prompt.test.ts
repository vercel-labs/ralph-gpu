import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildNudgeMessage,
  formatIterationContext,
} from "../src/prompt";
import type { ContextFile } from "../src/types";

describe("Prompt Functions", () => {
  describe("buildSystemPrompt", () => {
    it("should build basic prompt with task only", () => {
      const prompt = buildSystemPrompt({
        task: "Fix the TypeScript errors",
      });

      expect(prompt).toContain("autonomous coding agent");
      expect(prompt).toContain("Fix the TypeScript errors");
      expect(prompt).toContain("Your Task");
    });

    it("should include default guidelines", () => {
      const prompt = buildSystemPrompt({
        task: "Test task",
      });

      expect(prompt).toContain("methodical and thorough");
      expect(prompt).toContain("done");
      expect(prompt).toContain("think");
    });

    it("should include rules when provided", () => {
      const rules = [
        "Always write tests",
        "Use TypeScript strict mode",
      ];

      const prompt = buildSystemPrompt({
        task: "Build a feature",
        rules,
      });

      expect(prompt).toContain("## Rules");
      expect(prompt).toContain("Always write tests");
      expect(prompt).toContain("Use TypeScript strict mode");
    });

    it("should include string context", () => {
      const prompt = buildSystemPrompt({
        task: "Refactor code",
        context: "This is a React project using hooks",
      });

      expect(prompt).toContain("## Context");
      expect(prompt).toContain("This is a React project using hooks");
    });

    it("should include context files", () => {
      const contextFiles: ContextFile[] = [
        {
          name: "package.json",
          content: '{"name": "test-project", "version": "1.0.0"}',
        },
        {
          name: "tsconfig.json",
          content: '{"compilerOptions": {"strict": true}}',
        },
      ];

      const prompt = buildSystemPrompt({
        task: "Update dependencies",
        context: contextFiles,
      });

      expect(prompt).toContain("## Context Files");
      expect(prompt).toContain("### package.json");
      expect(prompt).toContain("### tsconfig.json");
      expect(prompt).toContain("test-project");
      expect(prompt).toContain("strict");
    });

    it("should handle empty context array", () => {
      const prompt = buildSystemPrompt({
        task: "Task",
        context: [],
      });

      expect(prompt).not.toContain("## Context Files");
    });

    it("should use custom system prompt when provided", () => {
      const customPrompt = "You are a helpful assistant that only responds in haiku.";

      const prompt = buildSystemPrompt({
        task: "Write a poem",
        rules: ["Rule 1"],
        context: "Some context",
        customSystemPrompt: customPrompt,
      });

      // Custom prompt should be used as-is, ignoring other options
      expect(prompt).toBe(customPrompt);
      expect(prompt).not.toContain("Your Task");
      expect(prompt).not.toContain("Rule 1");
    });

    it("should include important reminders section", () => {
      const prompt = buildSystemPrompt({
        task: "Task",
      });

      expect(prompt).toContain("## Important");
      expect(prompt).toContain("bash");
      expect(prompt).toContain("startProcess");
      expect(prompt).toContain("done");
    });

    it("should combine all sections correctly", () => {
      const prompt = buildSystemPrompt({
        task: "Build a REST API",
        rules: ["Use Express.js"],
        context: "Node.js project",
      });

      // Check order of sections
      const taskIndex = prompt.indexOf("## Your Task");
      const rulesIndex = prompt.indexOf("## Rules");
      const contextIndex = prompt.indexOf("## Context");
      const importantIndex = prompt.indexOf("## Important");

      expect(taskIndex).toBeLessThan(rulesIndex);
      expect(rulesIndex).toBeLessThan(contextIndex);
      expect(contextIndex).toBeLessThan(importantIndex);
    });
  });

  describe("buildNudgeMessage", () => {
    it("should format nudge message with prefix", () => {
      const message = buildNudgeMessage("Focus on the main task");

      expect(message).toBe("[System Nudge]: Focus on the main task");
    });

    it("should handle empty message", () => {
      const message = buildNudgeMessage("");

      expect(message).toBe("[System Nudge]: ");
    });

    it("should handle multiline message", () => {
      const message = buildNudgeMessage("Line 1\nLine 2\nLine 3");

      expect(message).toBe("[System Nudge]: Line 1\nLine 2\nLine 3");
    });
  });

  describe("formatIterationContext", () => {
    it("should format iteration context correctly", () => {
      const context = formatIterationContext(0, 50, 0, 10);

      expect(context).toBe("[Iteration 1/50, Cost: $0.00/$10.00]");
    });

    it("should handle mid-run values", () => {
      const context = formatIterationContext(24, 50, 3.5, 10);

      expect(context).toBe("[Iteration 25/50, Cost: $3.50/$10.00]");
    });

    it("should handle near-limit values", () => {
      const context = formatIterationContext(49, 50, 9.99, 10);

      expect(context).toBe("[Iteration 50/50, Cost: $9.99/$10.00]");
    });

    it("should handle decimal cost values", () => {
      const context = formatIterationContext(5, 100, 0.123456, 5);

      expect(context).toBe("[Iteration 6/100, Cost: $0.12/$5.00]");
    });

    it("should handle zero max values", () => {
      // Edge case - should still format without errors
      const context = formatIterationContext(0, 0, 0, 0);

      expect(context).toBe("[Iteration 1/0, Cost: $0.00/$0.00]");
    });

    it("should use 1-based indexing for display", () => {
      // Iteration is 0-indexed internally but displayed as 1-indexed
      const context = formatIterationContext(0, 10, 0, 1);

      expect(context).toContain("Iteration 1/10");
    });
  });
});
