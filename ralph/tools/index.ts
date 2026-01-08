/**
 * Tools for the Ralph agent
 */

import { tool } from "ai";
import { z } from "zod";
import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { globby } from "globby";
import { createPlaywrightTools } from "./playwright.js";

const execAsync = promisify(exec);

export function createTools(projectRoot: string) {
  const baseTools = {
    /**
     * Read a file from the project
     */
    readFile: tool({
      description: "Read a file from the project. Can read specific line ranges for large files.",
      parameters: z.object({
        path: z.string().describe("Path to file relative to project root"),
        lineStart: z
          .number()
          .optional()
          .describe("Starting line number (1-indexed, optional)"),
        lineEnd: z
          .number()
          .optional()
          .describe("Ending line number (inclusive, optional)"),
      }),
      execute: async ({ path: filePath, lineStart, lineEnd }) => {
        try {
          const fullPath = path.join(projectRoot, filePath);
          const content = await readFile(fullPath, "utf-8");

          // If line range specified, extract those lines
          if (lineStart !== undefined) {
            const lines = content.split("\n");
            const start = Math.max(0, lineStart - 1);
            const end = lineEnd !== undefined ? lineEnd : lines.length;
            const selectedLines = lines.slice(start, end);

            return {
              path: filePath,
              content: selectedLines.join("\n"),
              lineRange: `${lineStart}-${end}`,
              totalLines: lines.length,
            };
          }

          return {
            path: filePath,
            content,
            totalLines: content.split("\n").length,
          };
        } catch (error: any) {
          return {
            error: `Failed to read file: ${error.message}`,
            path: filePath,
          };
        }
      },
    }),

    /**
     * Write content to a file
     */
    writeFile: tool({
      description: "Write content to a file. Creates parent directories if needed. Use for new files or complete rewrites.",
      parameters: z.object({
        path: z.string().describe("Path to file relative to project root"),
        content: z.string().describe("Content to write to the file"),
      }),
      execute: async ({ path: filePath, content }) => {
        try {
          const fullPath = path.join(projectRoot, filePath);

          // Ensure parent directory exists
          await mkdir(path.dirname(fullPath), { recursive: true });

          await writeFile(fullPath, content, "utf-8");

          return {
            success: true,
            path: filePath,
            bytes: Buffer.byteLength(content, "utf-8"),
          };
        } catch (error: any) {
          return {
            error: `Failed to write file: ${error.message}`,
            path: filePath,
          };
        }
      },
    }),

    /**
     * Edit a file using search and replace
     */
    editFile: tool({
      description: "Search and replace in a file. More token-efficient than rewriting entire file. searchText must match exactly (including whitespace).",
      parameters: z.object({
        path: z.string().describe("Path to file relative to project root"),
        searchText: z
          .string()
          .describe("Exact text to search for (must match exactly)"),
        replaceText: z.string().describe("Text to replace with"),
        replaceAll: z
          .boolean()
          .optional()
          .describe("Replace all occurrences (default: false)"),
      }),
      execute: async ({ path: filePath, searchText, replaceText, replaceAll }) => {
        try {
          const fullPath = path.join(projectRoot, filePath);
          let content = await readFile(fullPath, "utf-8");

          if (!content.includes(searchText)) {
            return {
              error: "Search text not found in file",
              path: filePath,
              searchText: searchText.slice(0, 100),
            };
          }

          // Replace
          const newContent = replaceAll
            ? content.replaceAll(searchText, replaceText)
            : content.replace(searchText, replaceText);

          await writeFile(fullPath, newContent, "utf-8");

          // Count replacements
          const count = replaceAll
            ? content.split(searchText).length - 1
            : 1;

          return {
            success: true,
            path: filePath,
            replacements: count,
          };
        } catch (error: any) {
          return {
            error: `Failed to edit file: ${error.message}`,
            path: filePath,
          };
        }
      },
    }),

    /**
     * Delete a file
     */
    deleteFile: tool({
      description: "Delete a file from the project",
      parameters: z.object({
        path: z.string().describe("Path to file relative to project root"),
      }),
      execute: async ({ path: filePath }) => {
        try {
          const fullPath = path.join(projectRoot, filePath);
          await unlink(fullPath);

          return {
            success: true,
            path: filePath,
          };
        } catch (error: any) {
          return {
            error: `Failed to delete file: ${error.message}`,
            path: filePath,
          };
        }
      },
    }),

    /**
     * List files matching a glob pattern
     */
    listFiles: tool({
      description: "List files matching a glob pattern. Examples: '**/*.ts', 'src/**/*.tsx', 'packages/*/package.json'",
      parameters: z.object({
        pattern: z
          .string()
          .describe("Glob pattern to match files (e.g., '**/*.ts')"),
        ignore: z
          .array(z.string())
          .optional()
          .describe("Patterns to ignore (e.g., ['node_modules', 'dist'])"),
      }),
      execute: async ({ pattern, ignore }) => {
        try {
          const files = await globby(pattern, {
            cwd: projectRoot,
            ignore: ignore || ["node_modules/**", "**/dist/**", "**/.next/**"],
            onlyFiles: true,
          });

          return {
            files,
            count: files.length,
            pattern,
          };
        } catch (error: any) {
          return {
            error: `Failed to list files: ${error.message}`,
            pattern,
          };
        }
      },
    }),

    /**
     * Run a shell command
     */
    runCommand: tool({
      description: "Run a shell command in the project directory. Returns stdout, stderr, and exit code.",
      parameters: z.object({
        command: z.string().describe("Command to run"),
        cwd: z
          .string()
          .optional()
          .describe("Working directory relative to project root"),
        timeout: z
          .number()
          .optional()
          .describe("Timeout in milliseconds (default: 120000)"),
      }),
      execute: async ({ command, cwd, timeout }) => {
        try {
          const workingDir = cwd ? path.join(projectRoot, cwd) : projectRoot;

          const { stdout, stderr } = await execAsync(command, {
            cwd: workingDir,
            timeout: timeout || 120000,
            maxBuffer: 10 * 1024 * 1024, // 10MB
          });

          return {
            success: true,
            command,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: 0,
          };
        } catch (error: any) {
          return {
            success: false,
            command,
            stdout: error.stdout?.trim() || "",
            stderr: error.stderr?.trim() || error.message,
            exitCode: error.code || 1,
          };
        }
      },
    }),

    /**
     * Check if a file or directory exists
     */
    fileExists: tool({
      description: "Check if a file or directory exists",
      parameters: z.object({
        path: z.string().describe("Path to check relative to project root"),
      }),
      execute: async ({ path: filePath }) => {
        try {
          const fullPath = path.join(projectRoot, filePath);
          await readFile(fullPath);
          return { exists: true, path: filePath };
        } catch {
          return { exists: false, path: filePath };
        }
      },
    }),

    /**
     * Mark task as complete
     */
    markComplete: tool({
      description: "Mark the current task/phase as complete. Only call this when ALL requirements are verified and working.",
      parameters: z.object({
        summary: z
          .string()
          .describe(
            "Summary of what was accomplished (be specific about features implemented)"
          ),
        filesModified: z
          .array(z.string())
          .describe("List of all files created or modified"),
      }),
      execute: async ({ summary, filesModified }) => {
        return {
          complete: true,
          summary,
          filesModified,
          timestamp: new Date().toISOString(),
        };
      },
    }),
  };

  // Add Playwright MCP tools if enabled
  const playwrightTools = process.env.ENABLE_PLAYWRIGHT_MCP === "true"
    ? createPlaywrightTools()
    : {};

  return {
    ...baseTools,
    ...playwrightTools,
  };
}

export type AllTools = ReturnType<typeof createTools>;
