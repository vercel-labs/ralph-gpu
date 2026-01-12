# Decision 005: Context Management and Message Summarization

## Status

Implemented (v2 - AI-powered summarization added Jan 2026)

## Context

Long-running agents can accumulate large message histories, leading to:

1. "Input is too long for requested model" errors
2. Increased costs due to repeated context
3. Slower response times
4. Loss of important context when using simple heuristic summarization

## Decision

Implement **two-tier automatic context management**:
1. **Heuristic summarization** (fast, no LLM call) for moderately large contexts
2. **AI-powered summarization** (detailed, uses LLM) for very large contexts

## Implementation

### Token Estimation

Rough estimate of tokens in messages (4 chars per token average):

```typescript
function estimateTokens(str: string): number {
  return Math.ceil(str.length / 4);
}
```

### Two-Tier Thresholds

```typescript
const CONTEXT_THRESHOLD_BASIC = 80000;    // Fast heuristic-based summarization
const CONTEXT_THRESHOLD_AI = 120000;      // AI-powered detailed summarization
```

### Summarization Strategy

**Tier 1: Heuristic (80k-120k tokens)**
- Keep last 8 messages intact
- Create quick summary via regex extraction:
  - Tools used
  - Files explored
  - Commands run
- Fast, no LLM call

**Tier 2: AI-Powered (>120k tokens)**
- Keep last 8 messages intact
- Call LLM to generate detailed summary including:
  - Task progress and current state
  - Key decisions and rationale
  - Files created/modified/read
  - Errors encountered and solutions
  - Current focus area
  - Important domain context
- Allows up to 2000 output tokens for comprehensive summaries
- Cached to avoid re-summarizing unchanged content

```typescript
async function summarizeMessages(
  messages: Message[], 
  systemPrompt: string,
  model?: LanguageModel  // Pass model for AI summarization
): Promise<Message[]>
```

### AI Summary Prompt

The AI summarization uses a detailed prompt that asks for structured output:

```
Create a detailed, structured summary that includes:
1. Task Progress: What has been accomplished so far?
2. Key Decisions: Important choices made and why
3. Files & Changes: What files were created, modified, or read?
4. Errors & Solutions: Any errors and how they were resolved
5. Current Focus: What was the agent working on most recently?
6. Important Context: Domain-specific knowledge discovered
```

### Note on Tool Results

Tool results are NOT persisted across iterations in our implementation. Each `generateText` call is independent - we only store `result.text` in the messages array. Screenshots and other tool results are only visible within a single iteration.

## Consequences

- ✅ Prevents context overflow errors
- ✅ Allows longer-running agents
- ✅ Maintains recent context for coherent responses
- ✅ AI summaries preserve critical context that heuristics miss
- ✅ Summary caching prevents redundant LLM calls
- ⚠️ AI summarization adds ~$0.01-0.02 per call (200-2000 output tokens)
- ⚠️ AI summarization adds latency (~2-5 seconds per summary)

## When AI Summarization Triggers

AI summarization activates when:
1. Total estimated tokens > 120,000
2. A model is available (always true in normal operation)
3. There are >8 messages to summarize

Typical trigger: Long tasks with many file reads, bash commands, and tool calls (usually around iteration 15-25 depending on task complexity).
