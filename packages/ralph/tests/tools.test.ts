import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUtilityTools } from "../src/tools/utility";
import { createFallbackBashTools } from "../src/tools/bash";
import type { Tool } from "ai";
import { z } from "zod";

describe("Tools", () => {
  describe("createUtilityTools", () => {
    it("should create done and think tools", () => {
      const onDone = vi.fn();
      const tools = createUtilityTools(onDone);

      expect(tools).toHaveProperty("done");
      expect(tools).toHaveProperty("think");
    });

    describe("done tool", () => {
      it("should have correct description", () => {
        const onDone = vi.fn();
        const tools = createUtilityTools(onDone);

        expect(tools.done.description).toContain("complete");
        expect(tools.done.description).toContain("summary");
      });

      it("should call onDone callback when executed", async () => {
        const onDone = vi.fn();
        const tools = createUtilityTools(onDone);

        const result = await tools.done.execute!(
          { summary: "Task completed successfully" },
          { toolCallId: "test", messages: [] }
        );

        expect(onDone).toHaveBeenCalledWith("Task completed successfully");
        expect(result).toEqual({ completed: true });
      });

      it("should have valid inputSchema", () => {
        const onDone = vi.fn();
        const tools = createUtilityTools(onDone);

        // Verify the tool has an input schema
        expect(tools.done).toHaveProperty("inputSchema");
      });
    });

    describe("think tool", () => {
      it("should have correct description", () => {
        const onDone = vi.fn();
        const tools = createUtilityTools(onDone);

        expect(tools.think.description).toContain("Think");
        expect(tools.think.description).toContain("reason");
      });

      it("should return thought without side effects", async () => {
        const onDone = vi.fn();
        const tools = createUtilityTools(onDone);

        const thought = "I need to first understand the problem structure";
        const result = await tools.think.execute!(
          { thought },
          { toolCallId: "test", messages: [] }
        );

        expect(result).toEqual({ thought });
        expect(onDone).not.toHaveBeenCalled();
      });
    });
  });

  describe("createFallbackBashTools", () => {
    it("should create bash, readFile, and writeFile tools", () => {
      const tools = createFallbackBashTools();

      expect(tools).toHaveProperty("bash");
      expect(tools).toHaveProperty("readFile");
      expect(tools).toHaveProperty("writeFile");
    });

    describe("bash tool", () => {
      it("should have correct description", () => {
        const tools = createFallbackBashTools();

        expect(tools.bash.description).toContain("bash");
        expect(tools.bash.description).toContain("command");
      });

      it("should execute simple command successfully", async () => {
        const tools = createFallbackBashTools();

        const result = await tools.bash.execute!(
          { command: "echo hello" },
          { toolCallId: "test", messages: [] }
        );

        expect(result).toHaveProperty("stdout");
        expect(result).toHaveProperty("stderr");
        expect(result).toHaveProperty("exitCode");
        expect((result as { stdout: string }).stdout.trim()).toBe("hello");
        expect((result as { exitCode: number }).exitCode).toBe(0);
      });

      it("should handle command errors gracefully", async () => {
        const tools = createFallbackBashTools();

        const result = await tools.bash.execute!(
          { command: "exit 1" },
          { toolCallId: "test", messages: [] }
        );

        expect((result as { exitCode: number }).exitCode).toBe(1);
      });

      it("should handle command with output", async () => {
        const tools = createFallbackBashTools();

        const result = await tools.bash.execute!(
          { command: "echo -e 'line1\\nline2'" },
          { toolCallId: "test", messages: [] }
        );

        const stdout = (result as { stdout: string }).stdout;
        expect(stdout).toContain("line1");
        expect(stdout).toContain("line2");
      });
    });

    describe("readFile tool", () => {
      it("should have correct description", () => {
        const tools = createFallbackBashTools();

        expect(tools.readFile.description).toContain("Read");
        expect(tools.readFile.description).toContain("file");
      });

      it("should read existing file", async () => {
        const tools = createFallbackBashTools();
        const path = await import("path");

        // Read the package.json from this package using absolute path
        const packagePath = path.join(process.cwd(), "package.json");
        const result = await tools.readFile.execute!(
          { path: packagePath },
          { toolCallId: "test", messages: [] }
        );

        expect(typeof result).toBe("string");
        expect(result as string).toContain("@ralph/core");
      });

      it("should throw error for non-existent file", async () => {
        const tools = createFallbackBashTools();
        const path = await import("path");

        const nonExistentPath = path.join(process.cwd(), "non-existent-file.xyz");
        await expect(
          tools.readFile.execute!(
            { path: nonExistentPath },
            { toolCallId: "test", messages: [] }
          )
        ).rejects.toThrow("Failed to read file");
      });
    });

    describe("writeFile tool", () => {
      it("should have correct description", () => {
        const tools = createFallbackBashTools();

        expect(tools.writeFile.description).toContain("Write");
        expect(tools.writeFile.description).toContain("file");
        expect(tools.writeFile.description).toContain("directories");
      });

      it("should write and read back content", async () => {
        const tools = createFallbackBashTools();
        const testPath = "/tmp/ralph-test-file.txt";
        const testContent = "Hello from test!";

        // Write the file
        const writeResult = await tools.writeFile.execute!(
          { path: testPath, content: testContent },
          { toolCallId: "test", messages: [] }
        );

        expect(writeResult).toEqual({ success: true });

        // Read it back
        const readResult = await tools.readFile.execute!(
          { path: testPath },
          { toolCallId: "test", messages: [] }
        );

        expect(readResult).toBe(testContent);

        // Cleanup
        const fs = await import("fs/promises");
        await fs.unlink(testPath);
      });

      it("should create parent directories", async () => {
        const tools = createFallbackBashTools();
        const timestamp = Date.now();
        const testPath = `/tmp/ralph-test-${timestamp}/nested/dir/file.txt`;
        const testContent = "Nested content";

        const writeResult = await tools.writeFile.execute!(
          { path: testPath, content: testContent },
          { toolCallId: "test", messages: [] }
        );

        expect(writeResult).toEqual({ success: true });

        // Read it back
        const readResult = await tools.readFile.execute!(
          { path: testPath },
          { toolCallId: "test", messages: [] }
        );

        expect(readResult).toBe(testContent);

        // Cleanup
        const fs = await import("fs/promises");
        await fs.rm(`/tmp/ralph-test-${timestamp}`, {
          recursive: true,
        });
      });
    });
  });

  describe("Tool Structure", () => {
    it("utility tools should conform to AI SDK Tool interface", () => {
      const tools = createUtilityTools(() => {});

      for (const [name, tool] of Object.entries(tools)) {
        expect(tool).toHaveProperty("description");
        expect(typeof tool.description).toBe("string");
        expect(tool).toHaveProperty("execute");
        expect(typeof tool.execute).toBe("function");
      }
    });

    it("bash tools should conform to AI SDK Tool interface", () => {
      const tools = createFallbackBashTools();

      for (const [name, tool] of Object.entries(tools)) {
        expect(tool).toHaveProperty("description");
        expect(typeof tool.description).toBe("string");
        expect(tool).toHaveProperty("execute");
        expect(typeof tool.execute).toBe("function");
      }
    });
  });
});
