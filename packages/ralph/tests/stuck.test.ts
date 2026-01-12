import { describe, it, expect, beforeEach } from "vitest";
import { StuckDetector } from "../src/stuck";
import type { Iteration, ToolCall } from "../src/types";

/**
 * Helper to create mock iterations
 */
function createIteration(overrides: Partial<Iteration> = {}): Iteration {
  return {
    index: 0,
    timestamp: new Date(),
    duration: 1000,
    tokens: { input: 500, output: 200 },
    cost: 0.01,
    toolCalls: [],
    ...overrides,
  };
}

/**
 * Helper to create mock tool calls
 */
function createToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    name: "bash",
    args: { command: "echo hello" },
    result: { stdout: "hello", stderr: "", exitCode: 0 },
    duration: 100,
    timestamp: new Date(),
    ...overrides,
  };
}

describe("StuckDetector", () => {
  let detector: StuckDetector;

  beforeEach(() => {
    // Use threshold: 3 so tests with 3 iterations can detect stuck patterns
    detector = new StuckDetector({ threshold: 3 });
  });

  describe("constructor", () => {
    it("should use default options", () => {
      const detector = new StuckDetector();
      // With fewer than threshold iterations, should not detect stuck
      expect(detector.check([])).toBeNull();
    });

    it("should accept custom options", () => {
      const detector = new StuckDetector({
        windowSize: 3,
        threshold: 2,
      });
      // Should work with custom threshold
      expect(detector).toBeDefined();
    });
  });

  describe("check - insufficient iterations", () => {
    it("should return null with empty iterations", () => {
      expect(detector.check([])).toBeNull();
    });

    it("should return null with fewer iterations than threshold", () => {
      const iterations = [createIteration(), createIteration()];
      expect(detector.check(iterations)).toBeNull();
    });
  });

  describe("check - repetitive detection", () => {
    it("should detect repetitive tool calls", () => {
      const toolCall = createToolCall({
        name: "bash",
        args: { command: "npm test" },
      });

      const iterations = [
        createIteration({ index: 0, toolCalls: [toolCall] }),
        createIteration({ index: 1, toolCalls: [toolCall] }),
        createIteration({ index: 2, toolCalls: [toolCall] }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("repetitive");
      expect(result?.details).toContain("Same tool calls repeated");
    });

    it("should not flag different tool calls as repetitive", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ args: { command: "npm test" } })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ args: { command: "npm build" } })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ args: { command: "npm lint" } })],
        }),
      ];

      const result = detector.check(iterations);

      // Should not detect as repetitive (may detect as other type)
      expect(result?.reason !== "repetitive" || result === null).toBe(true);
    });

    it("should not detect empty tool calls as repetitive", () => {
      const iterations = [
        createIteration({ index: 0, toolCalls: [] }),
        createIteration({ index: 1, toolCalls: [] }),
        createIteration({ index: 2, toolCalls: [] }),
      ];

      const result = detector.check(iterations);

      // Empty tool calls shouldn't trigger repetitive detection
      expect(result?.reason).not.toBe("repetitive");
    });
  });

  describe("check - error loop detection", () => {
    it("should detect repeated errors", () => {
      const errorResult = {
        stdout: "",
        stderr: "Module not found: @foo/bar",
        exitCode: 1,
      };

      // Use different commands to avoid triggering repetitive check
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ args: { command: "npm test file1" }, result: errorResult })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ args: { command: "npm test file2" }, result: errorResult })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ args: { command: "npm test file3" }, result: errorResult })],
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("error_loop");
      expect(result?.repeatedError).toContain("Module not found");
    });

    it("should detect error from error property", () => {
      const errorResult = {
        error: "Connection refused",
        exitCode: 1,
      };

      // Use different commands to avoid triggering repetitive check
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ args: { command: "curl url1" }, result: errorResult })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ args: { command: "curl url2" }, result: errorResult })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ args: { command: "curl url3" }, result: errorResult })],
        }),
      ];

      const result = detector.check(iterations);

      expect(result?.reason).toBe("error_loop");
    });

    it("should not flag different errors as error loop", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [
            createToolCall({
              result: { stderr: "Error A", exitCode: 1 },
            }),
          ],
        }),
        createIteration({
          index: 1,
          toolCalls: [
            createToolCall({
              result: { stderr: "Error B", exitCode: 1 },
            }),
          ],
        }),
        createIteration({
          index: 2,
          toolCalls: [
            createToolCall({
              result: { stderr: "Error C", exitCode: 1 },
            }),
          ],
        }),
      ];

      const result = detector.check(iterations);

      // Different errors shouldn't trigger error loop detection
      expect(result?.reason !== "error_loop" || result === null).toBe(true);
    });
  });

  describe("check - oscillation detection", () => {
    it("should detect A-B-A-B oscillation pattern", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ name: "writeFile" })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
        createIteration({
          index: 3,
          toolCalls: [createToolCall({ name: "writeFile" })],
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("oscillation");
      expect(result?.details).toContain("Oscillating between");
    });

    it("should not detect non-oscillating patterns", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ name: "writeFile" })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ name: "bash" })],
        }),
        createIteration({
          index: 3,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
      ];

      const result = detector.check(iterations);

      expect(result?.reason !== "oscillation" || result === null).toBe(true);
    });

    it("should require at least 4 iterations for oscillation", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ name: "writeFile" })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ name: "readFile" })],
        }),
      ];

      const result = detector.check(iterations);

      // With only 3 iterations, can't detect oscillation
      expect(result?.reason !== "oscillation" || result === null).toBe(true);
    });
  });

  describe("check - no progress detection", () => {
    it("should detect high token usage with no file changes", () => {
      // no_progress requires at least 5 iterations and >150k tokens
      // Using same tool to avoid triggering repetitive check with different args
      const iterations = [
        createIteration({
          index: 0,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd1" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 1,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd2" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 2,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd3" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 3,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd4" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 4,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd5" } })],
          filesModified: undefined,
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("no_progress");
      expect(result?.details).toContain("tokens");
      expect(result?.details).toContain("no file changes");
    });

    it("should not flag progress with file changes", () => {
      // 5 iterations needed for no_progress check
      const iterations = [
        createIteration({
          index: 0,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd1" } })],
          filesModified: ["file1.ts"],
        }),
        createIteration({
          index: 1,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd2" } })],
          filesModified: ["file2.ts"],
        }),
        createIteration({
          index: 2,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd3" } })],
          filesModified: ["file3.ts"],
        }),
        createIteration({
          index: 3,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd4" } })],
          filesModified: ["file4.ts"],
        }),
        createIteration({
          index: 4,
          tokens: { input: 25000, output: 10000 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd5" } })],
          filesModified: ["file5.ts"],
        }),
      ];

      const result = detector.check(iterations);

      expect(result?.reason !== "no_progress" || result === null).toBe(true);
    });

    it("should not flag low token usage without file changes", () => {
      // 5 iterations needed for no_progress check
      const iterations = [
        createIteration({
          index: 0,
          tokens: { input: 1000, output: 500 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd1" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 1,
          tokens: { input: 1000, output: 500 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd2" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 2,
          tokens: { input: 1000, output: 500 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd3" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 3,
          tokens: { input: 1000, output: 500 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd4" } })],
          filesModified: undefined,
        }),
        createIteration({
          index: 4,
          tokens: { input: 1000, output: 500 },
          toolCalls: [createToolCall({ name: "bash", args: { command: "cmd5" } })],
          filesModified: undefined,
        }),
      ];

      const result = detector.check(iterations);

      // Low token usage shouldn't trigger no_progress
      expect(result?.reason !== "no_progress" || result === null).toBe(true);
    });
  });

  describe("setThreshold", () => {
    it("should update threshold", () => {
      const detector = new StuckDetector({ threshold: 5 });

      // Create iterations that would trigger with threshold 3
      const toolCall = createToolCall({ name: "bash", args: { command: "test" } });
      const iterations = [
        createIteration({ index: 0, toolCalls: [toolCall] }),
        createIteration({ index: 1, toolCalls: [toolCall] }),
        createIteration({ index: 2, toolCalls: [toolCall] }),
      ];

      // With threshold 5, should not detect
      expect(detector.check(iterations)).toBeNull();

      // Update threshold to 3
      detector.setThreshold(3);

      // Now should detect
      const result = detector.check(iterations);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe("repetitive");
    });
  });

  describe("priority of detection", () => {
    it("should check repetitive before other patterns", () => {
      // Create iterations that could match multiple patterns
      const errorToolCall = createToolCall({
        name: "bash",
        args: { command: "npm test" },
        result: { stderr: "Test failed", exitCode: 1 },
      });

      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [errorToolCall],
          tokens: { input: 20000, output: 10000 },
        }),
        createIteration({
          index: 1,
          toolCalls: [errorToolCall],
          tokens: { input: 20000, output: 10000 },
        }),
        createIteration({
          index: 2,
          toolCalls: [errorToolCall],
          tokens: { input: 20000, output: 10000 },
        }),
      ];

      const result = detector.check(iterations);

      // Repetitive should be checked first
      expect(result?.reason).toBe("repetitive");
    });
  });

  describe("check - browser loop detection", () => {
    it("should detect repeated URL visits without file changes", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
        createIteration({
          index: 1,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page2" } }),
          ],
        }),
        createIteration({
          index: 2,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
        createIteration({
          index: 3,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page2" } }),
          ],
        }),
        createIteration({
          index: 4,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("browser_loop");
      expect(result?.details).toContain("Visiting same URLs");
    });

    it("should detect excessive browser activity with few other actions", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
            createToolCall({ name: "screenshot", args: {} }),
          ],
        }),
        createIteration({
          index: 1,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page2" } }),
            createToolCall({ name: "screenshot", args: {} }),
          ],
        }),
        createIteration({
          index: 2,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page3" } }),
            createToolCall({ name: "screenshot", args: {} }),
          ],
        }),
        createIteration({
          index: 3,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page4" } }),
            createToolCall({ name: "screenshot", args: {} }),
          ],
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("browser_loop");
      expect(result?.details).toContain("Excessive browser/screenshot activity");
    });

    it("should not flag browser activity when file changes are made", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
          filesModified: ["file1.ts"],
        }),
        createIteration({
          index: 1,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
        createIteration({
          index: 2,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
        createIteration({
          index: 3,
          toolCalls: [
            createToolCall({ name: "openBrowser", args: { url: "http://localhost:3000/page1" } }),
          ],
        }),
      ];

      const result = detector.check(iterations);

      // With file changes, browser_loop shouldn't trigger
      expect(result?.reason !== "browser_loop" || result === null).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle iterations with multiple tool calls", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [
            createToolCall({ name: "readFile" }),
            createToolCall({ name: "writeFile" }),
          ],
        }),
        createIteration({
          index: 1,
          toolCalls: [
            createToolCall({ name: "readFile" }),
            createToolCall({ name: "writeFile" }),
          ],
        }),
        createIteration({
          index: 2,
          toolCalls: [
            createToolCall({ name: "readFile" }),
            createToolCall({ name: "writeFile" }),
          ],
        }),
      ];

      const result = detector.check(iterations);

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("repetitive");
    });

    it("should handle null/undefined tool results gracefully", () => {
      const iterations = [
        createIteration({
          index: 0,
          toolCalls: [createToolCall({ result: null })],
        }),
        createIteration({
          index: 1,
          toolCalls: [createToolCall({ result: undefined })],
        }),
        createIteration({
          index: 2,
          toolCalls: [createToolCall({ result: "string result" })],
        }),
      ];

      // Should not throw
      expect(() => detector.check(iterations)).not.toThrow();
    });
  });
});
