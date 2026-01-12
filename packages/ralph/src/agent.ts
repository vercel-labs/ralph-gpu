import type { LanguageModel, Tool } from "ai";
import { nanoid } from "nanoid";
import type {
  LoopAgentConfig,
  LoopResult,
  LoopStatus,
  LoopState,
  Iteration,
  StuckContext,
  LoopError,
} from "./types";
import { ProcessManager } from "./managers/process";
import { BrowserManager } from "./managers/browser";
import { createDefaultTools } from "./tools";
import { buildSystemPrompt } from "./prompt";
import { runLoop } from "./loop";
import { setDebugMode, loopLogger } from "./logger";
import { Tracer, getTraceConfigFromEnv, normalizeTraceConfig } from "./tracer";

/**
 * LoopAgent - Autonomous AI agent that runs in a loop until task completion.
 *
 * @example
 * ```typescript
 * const agent = new LoopAgent({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   task: 'Fix all TypeScript errors in src/',
 *   limits: {
 *     maxIterations: 50,
 *     maxCost: 5.0
 *   }
 * });
 *
 * const result = await agent.run();
 * console.log(result.success); // true
 * console.log(result.summary); // "Fixed 7 type errors..."
 * ```
 */
export class LoopAgent {
  private config: LoopAgentConfig;
  private state: LoopState | null = null;
  private processManager: ProcessManager;
  private browserManager: BrowserManager;
  private tracer: Tracer | null = null;
  private initialized = false;
  private tools: Record<string, Tool> | null = null;

  constructor(config: LoopAgentConfig) {
    this.config = config;
    this.processManager = new ProcessManager();
    this.browserManager = new BrowserManager();
  }

  /**
   * Initialize tools and managers.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set debug mode if enabled
    if (this.config.debug) {
      setDebugMode(true);
      loopLogger.debug("Debug mode enabled");
    }

    // Track done signal
    let doneSignaled = false;
    const onDone = (summary: string) => {
      doneSignaled = true;
      if (this.state) {
        this.state.summary = summary;
      }
    };

    // Create default tools if enabled
    const defaultToolsEnabled = this.config.defaultTools !== false;
    const enableToolLogging = this.config.enableToolLogging !== false;

    if (defaultToolsEnabled) {
      const defaultTools = await createDefaultTools({
        processManager: this.processManager,
        browserManager: this.browserManager,
        onDone,
        enableLogging: enableToolLogging,
      });

      // Merge with custom tools (custom tools take precedence)
      this.tools = {
        ...defaultTools,
        ...(this.config.tools ?? {}),
      };
    } else {
      // Use only custom tools
      this.tools = this.config.tools ?? {};
    }

    this.initialized = true;
  }

  /**
   * Start the agent loop.
   */
  async run(): Promise<LoopResult> {
    await this.initialize();

    // Create initial state
    this.state = {
      id: nanoid(),
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

    // Initialize tracer if enabled (config takes precedence over env)
    const traceConfig = this.config.trace ?? getTraceConfigFromEnv();
    const traceOptions = normalizeTraceConfig(traceConfig);
    
    if (traceOptions) {
      this.tracer = new Tracer(this.state.id, this.config.task, traceOptions);
      loopLogger.debug(`Trace mode enabled, output: ${this.tracer.getOutputPath()}`);
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      task: this.config.task,
      rules: this.config.rules,
      context: this.config.context,
      customSystemPrompt: this.config.systemPrompt,
    });

    // Record trace metadata
    if (this.tracer) {
      this.tracer.setSystemPrompt(systemPrompt);
      this.tracer.setConfig({
        limits: this.config.limits as unknown as Record<string, unknown>,
        completion: this.config.completion as unknown as Record<string, unknown>,
        rules: this.config.rules,
      });
      this.tracer.recordAgentStart({
        task: this.config.task,
        toolCount: Object.keys(this.tools || {}).length,
      });
    }

    try {
      // Run the loop
      const result = await runLoop(this.state, {
        model: this.config.model,
        systemPrompt,
        tools: this.tools!,
        limits: this.config.limits,
        completion: this.config.completion,
        stuckDetection: this.config.stuckDetection,
        onUpdate: this.config.onUpdate,
        onStuck: this.config.onStuck,
        onError: this.config.onError,
        tracer: this.tracer,
      });

      // Record completion in trace
      if (this.tracer) {
        this.tracer.recordAgentComplete(result, this.state);
      }

      // Call completion callback
      if (this.config.onComplete) {
        this.config.onComplete(result);
      }

      return result;
    } catch (error) {
      // Record error in trace
      if (this.tracer) {
        this.tracer.recordAgentError(error);
      }
      throw error;
    } finally {
      // Log trace file location
      if (this.tracer) {
        console.log(`\n📊 Trace file: ${this.tracer.getOutputPath()}`);
      }

      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Stop the loop gracefully.
   */
  async stop(): Promise<void> {
    if (this.state) {
      this.state.shouldStop = true;
    }
  }

  /**
   * Inject a nudge message into the next iteration.
   */
  nudge(message: string): void {
    if (this.state) {
      this.state.pendingNudge = message;
    }
  }

  /**
   * Get current status.
   */
  getStatus(): LoopStatus {
    if (!this.state) {
      return {
        id: "",
        state: "idle",
        iteration: 0,
        cost: 0,
        tokens: { input: 0, output: 0, total: 0 },
        elapsed: 0,
        lastActions: [],
      };
    }

    const lastActions = this.state.iterations
      .slice(-5)
      .flatMap((iter) => iter.toolCalls.map((tc) => tc.name));

    return {
      id: this.state.id,
      state: this.state.state,
      iteration: this.state.iteration,
      cost: this.state.cost,
      tokens: { ...this.state.tokens },
      elapsed: Date.now() - this.state.startTime,
      lastActions,
    };
  }

  /**
   * Get iteration history.
   */
  getHistory(): Iteration[] {
    return this.state?.iterations ?? [];
  }

  /**
   * Cleanup resources.
   */
  private async cleanup(): Promise<void> {
    // Stop all processes
    await this.processManager.stopAll();

    // Close all browsers
    await this.browserManager.closeAll();
  }
}
