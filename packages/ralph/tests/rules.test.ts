import { describe, it, expect } from "vitest";
import {
  brainRule,
  trackProgressRule,
  visualCheckRule,
  testFirstRule,
  minimalChangesRule,
  explorationRule,
  gitCheckpointRule,
  debugRule,
} from "../src/rules";

describe("Rules", () => {
  describe("brainRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof brainRule).toBe("string");
      expect(brainRule.length).toBeGreaterThan(0);
    });

    it("should contain brain structure guidance", () => {
      expect(brainRule).toContain(".brain/");
      expect(brainRule).toContain("index.md");
    });

    it("should explain reading and writing", () => {
      expect(brainRule).toContain("Reading");
      expect(brainRule).toContain("Writing");
    });

    it("should show directory structure example", () => {
      expect(brainRule).toContain("conventions.md");
      expect(brainRule).toContain("architecture.md");
      expect(brainRule).toContain("decisions/");
    });
  });

  describe("trackProgressRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof trackProgressRule).toBe("string");
      expect(trackProgressRule.length).toBeGreaterThan(0);
    });

    it("should reference progress file", () => {
      expect(trackProgressRule).toContain(".progress.md");
    });

    it("should explain progress tracking format", () => {
      expect(trackProgressRule).toContain("Completed");
      expect(trackProgressRule).toContain("In Progress");
      expect(trackProgressRule).toContain("Next");
      expect(trackProgressRule).toContain("Blockers");
    });
  });

  describe("visualCheckRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof visualCheckRule).toBe("string");
      expect(visualCheckRule.length).toBeGreaterThan(0);
    });

    it("should mention visual verification", () => {
      expect(visualCheckRule).toContain("Visual");
      expect(visualCheckRule).toContain("verify");
    });

    it("should reference browser tools", () => {
      expect(visualCheckRule).toContain("startProcess");
      expect(visualCheckRule).toContain("openBrowser");
    });

    it("should mention screenshot checking", () => {
      expect(visualCheckRule).toContain("screenshot");
    });
  });

  describe("testFirstRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof testFirstRule).toBe("string");
      expect(testFirstRule.length).toBeGreaterThan(0);
    });

    it("should describe test workflow", () => {
      expect(testFirstRule).toContain("test");
      expect(testFirstRule).toContain("Run tests");
    });

    it("should mention running tests before and after", () => {
      expect(testFirstRule).toContain("first");
      expect(testFirstRule).toContain("again");
    });
  });

  describe("minimalChangesRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof minimalChangesRule).toBe("string");
      expect(minimalChangesRule.length).toBeGreaterThan(0);
    });

    it("should discourage over-engineering", () => {
      expect(minimalChangesRule).toContain("necessary");
      expect(minimalChangesRule).toContain("Don't refactor");
    });

    it("should encourage focused changes", () => {
      expect(minimalChangesRule).toContain("focused");
      expect(minimalChangesRule).toContain("Small");
    });
  });

  describe("explorationRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof explorationRule).toBe("string");
      expect(explorationRule.length).toBeGreaterThan(0);
    });

    it("should describe exploration steps", () => {
      expect(explorationRule).toContain("Explore");
      expect(explorationRule).toContain("Before making changes");
    });

    it("should mention file listing and searching", () => {
      expect(explorationRule).toContain("List files");
      expect(explorationRule).toContain("Search");
      expect(explorationRule).toContain("grep");
    });
  });

  describe("gitCheckpointRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof gitCheckpointRule).toBe("string");
      expect(gitCheckpointRule.length).toBeGreaterThan(0);
    });

    it("should mention git commits", () => {
      expect(gitCheckpointRule).toContain("git");
      expect(gitCheckpointRule).toContain("commit");
    });

    it("should explain checkpoint purpose", () => {
      expect(gitCheckpointRule).toContain("recovery");
    });
  });

  describe("debugRule", () => {
    it("should be a non-empty string", () => {
      expect(typeof debugRule).toBe("string");
      expect(debugRule.length).toBeGreaterThan(0);
    });

    it("should describe debugging approach", () => {
      expect(debugRule).toContain("Debug");
      expect(debugRule).toContain("Reproduce");
    });

    it("should mention hypothesis and verification", () => {
      expect(debugRule).toContain("hypothesis");
      expect(debugRule).toContain("Verify");
    });

    it("should mention logging", () => {
      expect(debugRule).toContain("logging");
    });
  });

  describe("All rules together", () => {
    const allRules = [
      brainRule,
      trackProgressRule,
      visualCheckRule,
      testFirstRule,
      minimalChangesRule,
      explorationRule,
      gitCheckpointRule,
      debugRule,
    ];

    it("should all be valid strings", () => {
      allRules.forEach((rule) => {
        expect(typeof rule).toBe("string");
        expect(rule.length).toBeGreaterThan(10);
      });
    });

    it("should be usable as array in buildSystemPrompt", () => {
      // Rules should be joinable with newlines
      const joined = allRules.join("\n\n");
      expect(typeof joined).toBe("string");
      expect(joined).toContain(".brain/");
      expect(joined).toContain(".progress.md");
      expect(joined).toContain("Visual");
    });

    it("should have unique content", () => {
      const uniqueRules = new Set(allRules);
      expect(uniqueRules.size).toBe(allRules.length);
    });
  });
});
