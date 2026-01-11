# Decision 005: Context Management and Message Summarization

## Status

Implemented

## Context

Long-running agents can accumulate large message histories, leading to:

1. "Input is too long for requested model" errors
2. Increased costs due to repeated context
3. Slower response times

## Decision

Implement automatic context management with message summarization.

## Implementation

### Token Estimation

Rough estimate of tokens in messages (4 chars per token average):

```typescript
function estimateTokens(str: string): number {
  return Math.ceil(str.length / 4);
}
```

### Summarization Threshold

When estimated context exceeds 80,000 tokens, older messages are summarized:

```typescript
const MAX_CONTEXT_TOKENS = 80000;
```

### Summarization Strategy

1. Keep last 6 messages intact (recent context)
2. Summarize older messages into a brief overview:
   - Tools used
   - Files explored
   - Iteration count
3. Replace old messages with summary

```typescript
function summarizeMessages(messages, systemPrompt) {
  // Calculate total tokens
  // If under threshold, return as-is
  // Otherwise, keep recent + summarize older
}
```

### Note on Tool Results

Tool results are NOT persisted across iterations in our implementation. Each `generateText` call is independent - we only store `result.text` in the messages array. Screenshots and other tool results are only visible within a single iteration.

## Consequences

- ✅ Prevents context overflow errors
- ✅ Allows longer-running agents
- ✅ Maintains recent context for coherent responses
- ⚠️ Very old context details may be lost (summarized)
