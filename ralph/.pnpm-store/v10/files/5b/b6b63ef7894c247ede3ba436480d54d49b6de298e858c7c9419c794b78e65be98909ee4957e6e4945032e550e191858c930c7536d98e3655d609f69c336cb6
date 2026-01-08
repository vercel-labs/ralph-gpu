import type { ModelMessage, AssistantModelMessage, ToolResultPart } from '@ai-sdk/provider-utils';
import type { LanguageModel, GenerateTextResult, ToolSet } from 'ai';
import { generateText } from 'ai';

/**
 * Configuration for context management.
 */
export interface RalphContextConfig {
  /**
   * Maximum tokens to use for context (default: 150,000 - leaves room for output).
   * Set to match your model's context window minus output buffer.
   */
  maxContextTokens?: number;

  /**
   * Token budget reserved for the change log (default: 5,000).
   */
  changeLogBudget?: number;

  /**
   * Token budget reserved for file context (default: 50,000).
   */
  fileContextBudget?: number;

  /**
   * Maximum characters for a single file read before truncation (default: 30,000).
   * Files larger than this will be chunked with line numbers.
   */
  maxFileChars?: number;

  /**
   * Whether to enable auto-summarization of older messages.
   */
  enableSummarization?: boolean;

  /**
   * Number of recent iterations to keep in full detail (default: 2).
   */
  recentIterationsToKeep?: number;

  /**
   * Model to use for summarization (optional, uses main model if not provided).
   */
  summarizationModel?: LanguageModel;
}

/**
 * A tracked file in context.
 */
export interface TrackedFile {
  path: string;
  content: string;
  estimatedTokens: number;
  lastAccessed: number;
  /** If the file was chunked, this is the line range */
  lineRange?: { start: number; end: number };
}

/**
 * A change log entry.
 */
export interface ChangeLogEntry {
  timestamp: number;
  iteration: number;
  type: 'decision' | 'action' | 'error' | 'observation';
  summary: string;
  /** Optional details (will be truncated if too long) */
  details?: string;
}

/**
 * Summary of a previous iteration.
 */
export interface IterationSummary {
  iteration: number;
  summary: string;
  toolsUsed: string[];
  filesModified: string[];
  estimatedTokens: number;
}

/**
 * Rough token estimation (4 chars ≈ 1 token for English text).
 * This is intentionally conservative.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate tokens for a ModelMessage.
 */
export function estimateMessageTokens(message: ModelMessage): number {
  if (typeof message.content === 'string') {
    return estimateTokens(message.content);
  }
  if (Array.isArray(message.content)) {
    return message.content.reduce((sum, part) => {
      if ('text' in part && typeof part.text === 'string') {
        return sum + estimateTokens(part.text);
      }
      if ('result' in part) {
        const result = typeof part.result === 'string' 
          ? part.result 
          : JSON.stringify(part.result);
        return sum + estimateTokens(result);
      }
      return sum + 100; // Default estimate for other parts
    }, 0);
  }
  return 100;
}

/**
 * Manages context for long-running agent loops.
 * 
 * Tracks:
 * - File context (recently accessed files)
 * - Change log (decisions and actions)
 * - Message history (with optional summarization)
 */
export class RalphContextManager {
  private config: Required<Omit<RalphContextConfig, 'summarizationModel'>> & 
    Pick<RalphContextConfig, 'summarizationModel'>;
  
  private trackedFiles: Map<string, TrackedFile> = new Map();
  private changeLog: ChangeLogEntry[] = [];
  private iterationSummaries: IterationSummary[] = [];
  private currentIteration: number = 0;

  constructor(config: RalphContextConfig = {}) {
    this.config = {
      maxContextTokens: config.maxContextTokens ?? 150_000,
      changeLogBudget: config.changeLogBudget ?? 5_000,
      fileContextBudget: config.fileContextBudget ?? 50_000,
      maxFileChars: config.maxFileChars ?? 30_000,
      enableSummarization: config.enableSummarization ?? true,
      recentIterationsToKeep: config.recentIterationsToKeep ?? 2,
      summarizationModel: config.summarizationModel,
    };
  }

  /**
   * Get the current token budget status.
   */
  getTokenBudget(): {
    total: number;
    used: {
      files: number;
      changeLog: number;
      summaries: number;
    };
    available: number;
  } {
    const filesTokens = Array.from(this.trackedFiles.values())
      .reduce((sum, f) => sum + f.estimatedTokens, 0);
    
    const changeLogTokens = this.changeLog
      .reduce((sum, e) => sum + estimateTokens(e.summary) + estimateTokens(e.details ?? ''), 0);
    
    const summariesTokens = this.iterationSummaries
      .reduce((sum, s) => sum + s.estimatedTokens, 0);

    const used = filesTokens + changeLogTokens + summariesTokens;

    return {
      total: this.config.maxContextTokens,
      used: {
        files: filesTokens,
        changeLog: changeLogTokens,
        summaries: summariesTokens,
      },
      available: this.config.maxContextTokens - used,
    };
  }

  /**
   * Set the current iteration number.
   */
  setIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  /**
   * Track a file being read. Returns the content (potentially truncated).
   */
  trackFileRead(
    path: string, 
    content: string,
    options?: {
      /** Specific line range to read */
      lineRange?: { start: number; end: number };
      /** Force refresh even if cached */
      refresh?: boolean;
    }
  ): {
    content: string;
    truncated: boolean;
    totalLines?: number;
    lineRange?: { start: number; end: number };
  } {
    const existing = this.trackedFiles.get(path);
    
    // If cached and not refreshing, just update access time
    if (existing && !options?.refresh && !options?.lineRange) {
      existing.lastAccessed = Date.now();
      return {
        content: existing.content,
        truncated: existing.lineRange !== undefined,
        lineRange: existing.lineRange,
      };
    }

    // Handle large files
    const lines = content.split('\n');
    let finalContent = content;
    let lineRange = options?.lineRange;
    let truncated = false;

    if (content.length > this.config.maxFileChars) {
      if (options?.lineRange) {
        // Extract specific range
        const { start, end } = options.lineRange;
        const selectedLines = lines.slice(start - 1, end);
        finalContent = selectedLines
          .map((line, i) => `${String(start + i).padStart(6)}| ${line}`)
          .join('\n');
        lineRange = { start, end };
      } else {
        // Auto-truncate: show first part with line numbers
        const maxLines = Math.floor(this.config.maxFileChars / 80);
        const selectedLines = lines.slice(0, maxLines);
        finalContent = selectedLines
          .map((line, i) => `${String(i + 1).padStart(6)}| ${line}`)
          .join('\n');
        finalContent += `\n\n... [TRUNCATED: File has ${lines.length} lines, showing 1-${maxLines}. Use lineRange to read specific sections] ...`;
        lineRange = { start: 1, end: maxLines };
        truncated = true;
      }
    }

    const estimatedTokens = estimateTokens(finalContent);

    // Evict old files if over budget
    this.evictFilesIfNeeded(estimatedTokens);

    this.trackedFiles.set(path, {
      path,
      content: finalContent,
      estimatedTokens,
      lastAccessed: Date.now(),
      lineRange,
    });

    return {
      content: finalContent,
      truncated,
      totalLines: lines.length,
      lineRange,
    };
  }

  /**
   * Track a file being written/modified.
   */
  trackFileWrite(path: string, content: string): void {
    // Remove from tracked files (content has changed)
    this.trackedFiles.delete(path);
    
    // Add to change log
    this.addChangeLogEntry({
      type: 'action',
      summary: `Modified file: ${path}`,
      details: `Wrote ${content.length} chars`,
    });
  }

  /**
   * Track a file edit (search/replace style).
   */
  trackFileEdit(path: string, oldString: string, newString: string): void {
    // Update cached file if present
    const existing = this.trackedFiles.get(path);
    if (existing) {
      existing.content = existing.content.replace(oldString, newString);
      existing.estimatedTokens = estimateTokens(existing.content);
      existing.lastAccessed = Date.now();
    }

    // Add to change log
    this.addChangeLogEntry({
      type: 'action',
      summary: `Edited file: ${path}`,
      details: `Replaced "${oldString.slice(0, 50)}${oldString.length > 50 ? '...' : ''}" with "${newString.slice(0, 50)}${newString.length > 50 ? '...' : ''}"`,
    });
  }

  /**
   * Add an entry to the change log.
   */
  addChangeLogEntry(entry: Omit<ChangeLogEntry, 'timestamp' | 'iteration'>): void {
    this.changeLog.push({
      ...entry,
      timestamp: Date.now(),
      iteration: this.currentIteration,
    });

    // Trim change log if over budget
    this.trimChangeLog();
  }

  /**
   * Get the change log as a formatted string for context.
   */
  getChangeLogContext(): string {
    if (this.changeLog.length === 0) {
      return '';
    }

    const header = '## Change Log (Recent Decisions & Actions)\n\n';
    const entries = this.changeLog.map(e => {
      const icon = e.type === 'decision' ? '📋' : 
                   e.type === 'action' ? '✅' :
                   e.type === 'error' ? '❌' : '👁️';
      return `- [Iter ${e.iteration}] ${icon} ${e.summary}${e.details ? ` (${e.details})` : ''}`;
    }).join('\n');

    return header + entries;
  }

  /**
   * Get tracked files context.
   */
  getFileContext(): string {
    if (this.trackedFiles.size === 0) {
      return '';
    }

    const header = '## Files in Context\n\n';
    const files = Array.from(this.trackedFiles.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .map(f => {
        const rangeInfo = f.lineRange 
          ? ` (lines ${f.lineRange.start}-${f.lineRange.end})`
          : '';
        return `### ${f.path}${rangeInfo}\n\`\`\`\n${f.content}\n\`\`\``;
      })
      .join('\n\n');

    return header + files;
  }

  /**
   * Summarize an iteration's messages for future context.
   */
  async summarizeIteration(
    iteration: number,
    messages: ModelMessage[],
    model: LanguageModel
  ): Promise<IterationSummary> {
    // Extract tool calls and results
    const toolsUsed: string[] = [];
    const filesModified: string[] = [];
    
    for (const msg of messages) {
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if ('toolName' in part) {
            toolsUsed.push((part as { toolName: string }).toolName);
            const toolName = (part as { toolName: string }).toolName;
            if (toolName === 'writeFile' || toolName === 'editFile') {
              // Handle both 'args' and 'input' property names
              const args = ('args' in part ? part.args : 'input' in part ? (part as any).input : null) as Record<string, unknown> | null;
              if (args?.path || args?.filePath) {
                filesModified.push((args.path || args.filePath) as string);
              }
            }
          }
        }
      }
    }

    // Generate a summary using the model
    const messagesText = messages.map(m => {
      if (typeof m.content === 'string') return m.content;
      return JSON.stringify(m.content).slice(0, 500);
    }).join('\n');

    let summary: string;
    
    try {
      const result = await generateText({
        model: this.config.summarizationModel ?? model,
        messages: [
          {
            role: 'system',
            content: 'Summarize this agent iteration in 2-3 concise sentences. Focus on: what was accomplished, key decisions made, and any blockers encountered. Be specific about files modified and tools used.',
          },
          {
            role: 'user',
            content: `Iteration ${iteration}:\n\nTools used: ${toolsUsed.join(', ') || 'none'}\nFiles modified: ${filesModified.join(', ') || 'none'}\n\nMessages:\n${messagesText.slice(0, 3000)}`,
          },
        ],
        maxOutputTokens: 200,
      });
      summary = result.text;
    } catch {
      // Fallback to simple summary
      summary = `Iteration ${iteration}: Used ${toolsUsed.length} tools (${toolsUsed.slice(0, 5).join(', ')}${toolsUsed.length > 5 ? '...' : ''}). Modified ${filesModified.length} files.`;
    }

    const iterationSummary: IterationSummary = {
      iteration,
      summary,
      toolsUsed: [...new Set(toolsUsed)],
      filesModified: [...new Set(filesModified)],
      estimatedTokens: estimateTokens(summary),
    };

    this.iterationSummaries.push(iterationSummary);
    return iterationSummary;
  }

  /**
   * Get summaries of previous iterations.
   */
  getIterationSummariesContext(): string {
    if (this.iterationSummaries.length === 0) {
      return '';
    }

    const header = '## Previous Iterations Summary\n\n';
    const summaries = this.iterationSummaries.map(s => 
      `### Iteration ${s.iteration}\n${s.summary}\n- Tools: ${s.toolsUsed.join(', ')}\n- Files: ${s.filesModified.join(', ') || 'none'}`
    ).join('\n\n');

    return header + summaries;
  }

  /**
   * Build context to inject into messages.
   * Call this before each iteration to get current context state.
   */
  buildContextInjection(): string {
    const parts: string[] = [];

    const summaries = this.getIterationSummariesContext();
    if (summaries) parts.push(summaries);

    const changeLog = this.getChangeLogContext();
    if (changeLog) parts.push(changeLog);

    // Note: File context is usually handled by tools, not injected
    // But we track it for budget management

    if (parts.length === 0) {
      return '';
    }

    return `\n\n---\n## Agent Context (Auto-managed)\n\n${parts.join('\n\n')}`;
  }

  /**
   * Prepare messages for a new iteration.
   * Compresses old iterations and manages context budget.
   */
  async prepareMessagesForIteration<TOOLS extends ToolSet>(
    currentMessages: ModelMessage[],
    iteration: number,
    model: LanguageModel,
    previousResult?: GenerateTextResult<TOOLS, never>
  ): Promise<{
    messages: ModelMessage[];
    summarized: boolean;
  }> {
    this.setIteration(iteration);

    // If first iteration or summarization disabled, return as-is
    if (iteration <= this.config.recentIterationsToKeep || !this.config.enableSummarization) {
      return { messages: currentMessages, summarized: false };
    }

    // Check if we need to summarize
    const totalTokens = currentMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m), 
      0
    );

    // Leave room for output and new content
    const targetBudget = this.config.maxContextTokens * 0.7;

    if (totalTokens < targetBudget) {
      return { messages: currentMessages, summarized: false };
    }

    // We need to compress! Summarize older iterations
    // Find the boundary between "old" and "recent" messages
    const messagesFromPreviousIteration = previousResult?.response.messages ?? [];
    
    if (messagesFromPreviousIteration.length > 0) {
      // Summarize the previous iteration
      await this.summarizeIteration(
        iteration - 1,
        messagesFromPreviousIteration,
        model
      );
    }

    // Keep only recent messages
    const recentStartIndex = Math.max(
      0, 
      currentMessages.length - (this.config.recentIterationsToKeep * 10) // Rough estimate: 10 messages per iteration
    );

    const recentMessages = currentMessages.slice(recentStartIndex);

    return {
      messages: recentMessages,
      summarized: true,
    };
  }

  /**
   * Evict least-recently-used files to stay within budget.
   */
  private evictFilesIfNeeded(newFileTokens: number): void {
    const currentFileTokens = Array.from(this.trackedFiles.values())
      .reduce((sum, f) => sum + f.estimatedTokens, 0);

    if (currentFileTokens + newFileTokens <= this.config.fileContextBudget) {
      return;
    }

    // Sort by last accessed (oldest first)
    const sorted = Array.from(this.trackedFiles.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let tokensToFree = (currentFileTokens + newFileTokens) - this.config.fileContextBudget;

    for (const [path, file] of sorted) {
      if (tokensToFree <= 0) break;
      this.trackedFiles.delete(path);
      tokensToFree -= file.estimatedTokens;
    }
  }

  /**
   * Trim change log to stay within budget.
   */
  private trimChangeLog(): void {
    const currentTokens = this.changeLog
      .reduce((sum, e) => sum + estimateTokens(e.summary) + estimateTokens(e.details ?? ''), 0);

    if (currentTokens <= this.config.changeLogBudget) {
      return;
    }

    // Remove oldest entries
    while (this.changeLog.length > 0) {
      const tokens = this.changeLog
        .reduce((sum, e) => sum + estimateTokens(e.summary) + estimateTokens(e.details ?? ''), 0);
      if (tokens <= this.config.changeLogBudget) break;
      this.changeLog.shift();
    }
  }

  /**
   * Clear all tracked state.
   */
  clear(): void {
    this.trackedFiles.clear();
    this.changeLog = [];
    this.iterationSummaries = [];
    this.currentIteration = 0;
  }
}

/**
 * Create context-aware tool wrappers.
 * These wrap existing tools to track file operations.
 */
export function createContextAwareTools<TOOLS extends ToolSet>(
  tools: TOOLS,
  contextManager: RalphContextManager
): TOOLS {
  const wrapped: Record<string, unknown> = {};

  for (const [name, tool] of Object.entries(tools)) {
    if (name === 'readFile') {
      wrapped[name] = {
        ...tool,
        execute: async (args: { filePath?: string; path?: string; lineRange?: { start: number; end: number } }) => {
          const result = await (tool as any).execute(args);
          const path = args.filePath ?? args.path;
          
          if (result.success && result.content && path) {
            const tracked = contextManager.trackFileRead(path, result.content, {
              lineRange: args.lineRange,
            });
            return {
              ...result,
              content: tracked.content,
              truncated: tracked.truncated,
              totalLines: tracked.totalLines,
              lineRange: tracked.lineRange,
            };
          }
          return result;
        },
      };
    } else if (name === 'writeFile') {
      wrapped[name] = {
        ...tool,
        execute: async (args: { filePath?: string; path?: string; content: string }) => {
          const result = await (tool as any).execute(args);
          const path = args.filePath ?? args.path;
          
          if (result.success && path) {
            contextManager.trackFileWrite(path, args.content);
          }
          return result;
        },
      };
    } else if (name === 'editFile') {
      wrapped[name] = {
        ...tool,
        execute: async (args: { filePath?: string; path?: string; old_string: string; new_string: string }) => {
          const result = await (tool as any).execute(args);
          const path = args.filePath ?? args.path;
          
          if (result.success && path) {
            contextManager.trackFileEdit(path, args.old_string, args.new_string);
          }
          return result;
        },
      };
    } else {
      wrapped[name] = tool;
    }
  }

  return wrapped as TOOLS;
}

