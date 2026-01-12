import { spawn, ChildProcess } from "child_process";
import { ProcessInfo } from "../types";

interface ManagedProcess {
  info: ProcessInfo;
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
  maxOutputLines: number;
  /** Process group ID for killing entire process tree (same as pid when detached) */
  pgid: number;
}

/**
 * Manages long-running processes for the agent.
 * Handles starting, stopping, and tracking processes.
 * Ensures only one process per name exists.
 */
export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private maxOutputLines: number;

  constructor(options: { maxOutputLines?: number } = {}) {
    this.maxOutputLines = options.maxOutputLines ?? 1000;
  }

  /**
   * Start a process. If one with the same name exists, kill it first.
   */
  async start(options: {
    name: string;
    command: string;
    cwd?: string;
    readyPattern?: string;
    timeout?: number;
  }): Promise<ProcessInfo> {
    const { name, command, cwd, readyPattern, timeout = 30000 } = options;

    // Kill existing process with same name
    if (this.processes.has(name)) {
      await this.stop(name);
    }

    const workingDir = cwd ?? process.cwd();
    
    return new Promise((resolve, reject) => {
      let child: ChildProcess;
      
      try {
        child = spawn(command, [], {
          shell: true,
          cwd: workingDir,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env }, // Ensure environment is passed
          // Create new process group so we can kill entire tree
          detached: true,
        });
      } catch (error) {
        const err = error as Error;
        reject(new Error(
          `Failed to start process "${name}": ${err.message}\n` +
          `Command: ${command}\n` +
          `Working directory: ${workingDir}`
        ));
        return;
      }
      
      if (!child.pid) {
        reject(new Error(
          `Failed to start process "${name}": No PID assigned\n` +
          `Command: ${command}\n` +
          `Working directory: ${workingDir}`
        ));
        return;
      }

      const managed: ManagedProcess = {
        info: {
          name,
          command,
          pid: child.pid!,
          startTime: new Date(),
          cwd,
        },
        process: child,
        stdout: [],
        stderr: [],
        maxOutputLines: this.maxOutputLines,
        // Store process group ID (same as pid when detached)
        pgid: child.pid!,
      };

      // Capture output
      child.stdout?.on("data", (data) => {
        const lines = data.toString().split("\n");
        managed.stdout.push(...lines);
        // Trim to max lines
        if (managed.stdout.length > managed.maxOutputLines) {
          managed.stdout = managed.stdout.slice(-managed.maxOutputLines);
        }
      });

      child.stderr?.on("data", (data) => {
        const lines = data.toString().split("\n");
        managed.stderr.push(...lines);
        if (managed.stderr.length > managed.maxOutputLines) {
          managed.stderr = managed.stderr.slice(-managed.maxOutputLines);
        }
      });

      // Handle process errors
      child.on("error", (err) => {
        this.processes.delete(name);
        reject(new Error(
          `Process "${name}" error: ${err.message}\n` +
          `Command: ${command}\n` +
          `Working directory: ${workingDir}`
        ));
      });

      child.on("exit", () => {
        this.processes.delete(name);
      });

      this.processes.set(name, managed);

      // If readyPattern provided, wait for it
      if (readyPattern) {
        const regex = new RegExp(readyPattern);
        let timeoutId: ReturnType<typeof setTimeout>;

        const checkReady = (data: Buffer) => {
          const text = data.toString();
          if (regex.test(text)) {
            clearTimeout(timeoutId);
            child.stdout?.off("data", checkReady);
            child.stderr?.off("data", checkReady);
            resolve(managed.info);
          }
        };

        timeoutId = setTimeout(() => {
          child.stdout?.off("data", checkReady);
          child.stderr?.off("data", checkReady);
          // Resolve anyway after timeout, process might still be useful
          resolve(managed.info);
        }, timeout);

        child.stdout?.on("data", checkReady);
        child.stderr?.on("data", checkReady);
      } else {
        // No ready pattern, resolve immediately
        resolve(managed.info);
      }
    });
  }

  /**
   * Stop a process by name.
   * Kills the entire process group to ensure child processes are terminated.
   */
  async stop(name: string): Promise<boolean> {
    const managed = this.processes.get(name);
    if (!managed) {
      return false;
    }

    // Remove from map immediately to prevent double-stop
    this.processes.delete(name);

    const { process: child, pgid } = managed;

    // Try to kill the process group first, then the individual process
    const killProcess = (signal: NodeJS.Signals) => {
      // Try process group kill (negative pgid)
      try {
        process.kill(-pgid, signal);
        return true;
      } catch {
        // Process group kill failed, try individual process
      }

      // Try killing just the child
      try {
        child.kill(signal);
        return true;
      } catch {
        // Process already dead
        return false;
      }
    };

    // Send SIGTERM first
    const terminated = killProcess("SIGTERM");
    
    if (!terminated) {
      // Process already dead
      return true;
    }

    // Wait for process to exit gracefully
    const exitPromise = new Promise<void>((resolve) => {
      const onExit = () => {
        child.removeListener("exit", onExit);
        child.removeListener("close", onExit);
        resolve();
      };
      child.on("exit", onExit);
      child.on("close", onExit);
      
      // Check if already exited
      if (child.killed || child.exitCode !== null) {
        resolve();
      }
    });

    // Wait up to 3 seconds for graceful exit
    const gracefulTimeout = new Promise<void>((resolve) => 
      setTimeout(resolve, 3000)
    );

    await Promise.race([exitPromise, gracefulTimeout]);

    // If still running, force kill
    if (!child.killed && child.exitCode === null) {
      killProcess("SIGKILL");
      
      // Wait a bit more for SIGKILL to take effect
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return true;
  }

  /**
   * Get list of all running processes.
   */
  list(): Array<ProcessInfo & { uptime: number }> {
    const now = Date.now();
    return Array.from(this.processes.values()).map((managed) => ({
      ...managed.info,
      uptime: now - managed.info.startTime.getTime(),
    }));
  }

  /**
   * Get output from a process.
   */
  getOutput(
    name: string,
    lines?: number
  ): { stdout: string; stderr: string } | null {
    const managed = this.processes.get(name);
    if (!managed) {
      return null;
    }

    const lineCount = lines ?? 100;
    return {
      stdout: managed.stdout.slice(-lineCount).join("\n"),
      stderr: managed.stderr.slice(-lineCount).join("\n"),
    };
  }

  /**
   * Check if a process is running.
   */
  isRunning(name: string): boolean {
    return this.processes.has(name);
  }

  /**
   * Stop all processes. Called during cleanup.
   */
  async stopAll(): Promise<void> {
    const names = Array.from(this.processes.keys());
    await Promise.all(names.map((name) => this.stop(name)));
  }
}
