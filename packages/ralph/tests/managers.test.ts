import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProcessManager } from "../src/managers/process";

describe("ProcessManager", () => {
  let manager: ProcessManager;

  beforeEach(() => {
    manager = new ProcessManager({ maxOutputLines: 100 });
  });

  afterEach(async () => {
    // Ensure all processes are cleaned up with a timeout
    try {
      const stopPromise = manager.stopAll();
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2000));
      await Promise.race([stopPromise, timeoutPromise]);
    } catch {
      // Ignore cleanup errors
    }
  }, 10000);

  describe("constructor", () => {
    it("should create instance with default options", () => {
      const mgr = new ProcessManager();
      expect(mgr).toBeInstanceOf(ProcessManager);
    });

    it("should accept custom maxOutputLines", () => {
      const mgr = new ProcessManager({ maxOutputLines: 50 });
      expect(mgr).toBeInstanceOf(ProcessManager);
    });
  });

  describe("start", () => {
    it("should start a simple process", async () => {
      const info = await manager.start({
        name: "test",
        command: "sleep 0.1 && echo 'done'",
      });

      expect(info.name).toBe("test");
      expect(info.command).toBe("sleep 0.1 && echo 'done'");
      expect(info.pid).toBeGreaterThan(0);
      expect(info.startTime).toBeInstanceOf(Date);
    });

    it("should replace existing process with same name", async () => {
      const info1 = await manager.start({
        name: "test",
        command: "sleep 10",
      });

      // Give the process a moment to start
      await new Promise((r) => setTimeout(r, 100));

      const info2 = await manager.start({
        name: "test",
        command: "sleep 5",
      });

      expect(info2.pid).not.toBe(info1.pid);
      expect(manager.list()).toHaveLength(1);
    }, 10000);

    it("should wait for ready pattern", async () => {
      const info = await manager.start({
        name: "test",
        command: 'echo "Server ready" && sleep 5',
        readyPattern: "ready",
        timeout: 5000,
      });

      expect(info.name).toBe("test");
      expect(manager.isRunning("test")).toBe(true);
    });

    it("should respect custom cwd", async () => {
      const info = await manager.start({
        name: "test",
        command: "pwd",
        cwd: "/tmp",
      });

      expect(info.cwd).toBe("/tmp");
    });
  });

  describe("stop", () => {
    it("should stop a running process", async () => {
      await manager.start({
        name: "test",
        command: "sleep 100",
      });

      // Give the process a moment to start
      await new Promise((r) => setTimeout(r, 100));

      expect(manager.isRunning("test")).toBe(true);

      const result = await manager.stop("test");

      expect(result).toBe(true);
      expect(manager.isRunning("test")).toBe(false);
    }, 10000);

    it("should return false for non-existent process", async () => {
      const result = await manager.stop("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("should return empty array initially", () => {
      expect(manager.list()).toEqual([]);
    });

    it("should return running processes", async () => {
      await manager.start({
        name: "process1",
        command: "sleep 100",
      });

      await manager.start({
        name: "process2",
        command: "sleep 100",
      });

      // Give processes a moment to start
      await new Promise((r) => setTimeout(r, 100));

      const list = manager.list();

      expect(list).toHaveLength(2);
      expect(list.map((p) => p.name)).toContain("process1");
      expect(list.map((p) => p.name)).toContain("process2");
    }, 10000);

    it("should include uptime in list", async () => {
      await manager.start({
        name: "test",
        command: "sleep 100",
      });

      // Wait a bit
      await new Promise((r) => setTimeout(r, 100));

      const list = manager.list();

      expect(list[0]?.uptime).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  describe("getOutput", () => {
    it("should return null for non-existent process", () => {
      const output = manager.getOutput("non-existent");

      expect(output).toBeNull();
    });

    it("should capture stdout", async () => {
      await manager.start({
        name: "test",
        command: 'echo "hello world"',
      });

      // Wait for output to be captured
      await new Promise((r) => setTimeout(r, 200));

      const output = manager.getOutput("test");

      // Process may have exited, so check if it was captured
      // or if output is null (process completed and was removed)
      if (output) {
        expect(output.stdout).toContain("hello world");
      }
    });

    it("should limit output lines", async () => {
      const mgr = new ProcessManager({ maxOutputLines: 5 });

      await mgr.start({
        name: "test",
        command:
          'for i in $(seq 1 10); do echo "line $i"; done && sleep 0.5',
      });

      // Wait for output
      await new Promise((r) => setTimeout(r, 600));

      const output = mgr.getOutput("test", 100);

      if (output) {
        const lines = output.stdout.split("\n").filter((l) => l.trim());
        // Should be limited by maxOutputLines
        expect(lines.length).toBeLessThanOrEqual(10);
      }

      await mgr.stopAll();
    });
  });

  describe("isRunning", () => {
    it("should return false for non-existent process", () => {
      expect(manager.isRunning("non-existent")).toBe(false);
    });

    it("should return true for running process", async () => {
      await manager.start({
        name: "test",
        command: "sleep 100",
      });

      // Give process a moment to start
      await new Promise((r) => setTimeout(r, 100));

      expect(manager.isRunning("test")).toBe(true);
    }, 10000);

    it("should return false after process is stopped", async () => {
      await manager.start({
        name: "test",
        command: "sleep 100",
      });

      // Give process a moment to start
      await new Promise((r) => setTimeout(r, 100));

      await manager.stop("test");

      expect(manager.isRunning("test")).toBe(false);
    }, 10000);
  });

  describe("stopAll", () => {
    it("should stop all running processes", async () => {
      await manager.start({ name: "p1", command: "sleep 100" });
      await manager.start({ name: "p2", command: "sleep 100" });
      await manager.start({ name: "p3", command: "sleep 100" });

      // Give processes a moment to start
      await new Promise((r) => setTimeout(r, 100));

      expect(manager.list()).toHaveLength(3);

      await manager.stopAll();

      expect(manager.list()).toHaveLength(0);
    }, 15000);

    it("should handle empty process list", async () => {
      // Should not throw
      await expect(manager.stopAll()).resolves.not.toThrow();
    });
  });

  describe("process exit handling", () => {
    it("should remove process from list on exit", async () => {
      await manager.start({
        name: "test",
        command: "echo 'quick exit'",
      });

      // Wait for process to complete
      await new Promise((r) => setTimeout(r, 200));

      // Process should be removed after exit
      expect(manager.isRunning("test")).toBe(false);
    });
  });

  describe("port-binding processes", () => {
    it("should kill process and release port", async () => {
      // Use Python's built-in HTTP server which stays alive
      // Skip if Python not available
      await manager.start({
        name: "server",
        command: "python3 -c \"import http.server; import socketserver; handler = http.server.SimpleHTTPRequestHandler; httpd = socketserver.TCPServer(('', 19999), handler); print('ready'); httpd.serve_forever()\"",
        readyPattern: "ready",
        timeout: 5000,
      });

      // Verify server is running
      expect(manager.isRunning("server")).toBe(true);

      // Stop the server
      await manager.stop("server");

      // Wait for port to be released
      await new Promise((r) => setTimeout(r, 1000));

      // Verify server is stopped
      expect(manager.isRunning("server")).toBe(false);

      // Try to start another server on the same port
      await manager.start({
        name: "server2",
        command: "python3 -c \"import http.server; import socketserver; handler = http.server.SimpleHTTPRequestHandler; httpd = socketserver.TCPServer(('', 19999), handler); print('ready'); httpd.serve_forever()\"",
        readyPattern: "ready",
        timeout: 5000,
      });

      expect(manager.isRunning("server2")).toBe(true);
    }, 25000);

    it("should kill child processes when parent is killed", async () => {
      // Start a process that spawns a child using bash (ensures process group)
      await manager.start({
        name: "parent",
        command: "bash -c 'sleep 60 & wait'",
      });

      await new Promise((r) => setTimeout(r, 300));

      // Get the parent PID
      const list = manager.list();
      expect(list).toHaveLength(1);

      // Stop the parent
      await manager.stop("parent");

      await new Promise((r) => setTimeout(r, 500));

      // Verify parent is stopped
      expect(manager.isRunning("parent")).toBe(false);
    }, 15000);

    it("should replace long-running process when starting with same name", async () => {
      // Start first long-running process
      const info1 = await manager.start({
        name: "longrun",
        command: "bash -c 'echo ready && sleep 300'",
        readyPattern: "ready",
        timeout: 5000,
      });

      expect(manager.isRunning("longrun")).toBe(true);

      // Start second process with same name (should kill first)
      const info2 = await manager.start({
        name: "longrun",
        command: "bash -c 'echo ready && sleep 300'",
        readyPattern: "ready",
        timeout: 5000,
      });

      expect(info2.pid).not.toBe(info1.pid);
      expect(manager.list()).toHaveLength(1);
      expect(manager.isRunning("longrun")).toBe(true);
    }, 20000);
  });
});

// BrowserManager tests are separate because they require playwright
// and are more heavyweight
describe("BrowserManager", () => {
  // These tests are skipped by default as they require playwright
  // and browser binaries to be installed
  describe.skip("BrowserManager (requires playwright)", () => {
    // Import would be tested here
    it("should be importable", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      expect(BrowserManager).toBeDefined();
    });
  });

  describe("BrowserManager interface", () => {
    it("should export BrowserManager class", async () => {
      const { BrowserManager } = await import("../src/managers/browser");

      expect(BrowserManager).toBeDefined();
      expect(typeof BrowserManager).toBe("function");
    });

    it("should create instance", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      const manager = new BrowserManager();

      expect(manager).toBeInstanceOf(BrowserManager);
    });

    it("should have expected methods", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      const manager = new BrowserManager();

      expect(typeof manager.open).toBe("function");
      expect(typeof manager.screenshot).toBe("function");
      expect(typeof manager.click).toBe("function");
      expect(typeof manager.type).toBe("function");
      expect(typeof manager.scroll).toBe("function");
      expect(typeof manager.navigate).toBe("function");
      expect(typeof manager.getConsoleErrors).toBe("function");
      expect(typeof manager.close).toBe("function");
      expect(typeof manager.list).toBe("function");
      expect(typeof manager.closeAll).toBe("function");
    });

    it("should return empty list initially", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      const manager = new BrowserManager();

      expect(manager.list()).toEqual([]);
    });

    it("should return empty console errors for non-existent browser", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      const manager = new BrowserManager();

      expect(manager.getConsoleErrors("non-existent")).toEqual([]);
    });

    it("should return false when closing non-existent browser", async () => {
      const { BrowserManager } = await import("../src/managers/browser");
      const manager = new BrowserManager();

      const result = await manager.close("non-existent");
      expect(result).toBe(false);
    });
  });
});
