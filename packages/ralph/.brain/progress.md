# Progress

## Completed

- [x] Package setup (package.json, tsconfig.json)
- [x] TypeScript types (`types.ts`) - all interfaces defined
- [x] Default rules (`rules.ts`) - 8 rules implemented
- [x] ProcessManager (`managers/process.ts`) - handles long-running processes
- [x] BrowserManager (`managers/browser.ts`) - Playwright browser management
- [x] Bash tools (`tools/bash.ts`) - bash-tool integration with fallback
- [x] Process tools (`tools/process.ts`) - startProcess, stopProcess, etc.
- [x] Browser tools (`tools/browser.ts`) - openBrowser, screenshot, click, etc.
- [x] Utility tools (`tools/utility.ts`) - done, think
- [x] Tools aggregator (`tools/index.ts`)
- [x] Stuck detection (`stuck.ts`) - pattern detection algorithm
- [x] System prompt builder (`prompt.ts`)
- [x] Core loop logic (`loop.ts`) - main iteration engine
- [x] LoopAgent class (`agent.ts`) - public API
- [x] Main exports (`index.ts`)
- [x] README documentation
- [x] TypeScript compilation passing
- [x] Package builds successfully (CJS + ESM + DTS)
- [x] **Test suite** - 182 tests across 8 test files (see [testing.md](./testing.md))
- [x] **Logging system** (`logger.ts`) - structured logging with debug mode
- [x] **Image handling** - AI SDK v6 `image-data` format for screenshots
- [x] **JPEG compression** - Screenshots compressed to ~30-50KB
- [x] **Context management** - Message summarization to prevent overflow
- [x] **Browser WebGPU support** - Headed mode with GPU flags by default
- [x] **Process group killing** - Properly kills child processes on cleanup (Jan 2026)

## In Progress

None currently.

## Next Steps

- [ ] Consider streaming support (`streamText` alternative)
- [ ] Consider checkpoint/restore functionality
- [ ] Tool middleware support
- [ ] Integration tests with real AI model (manual)

## Blockers

None currently.

## Notes

### AI SDK v6 Migration

The implementation uses AI SDK v6 which has breaking changes from v4:

- `parameters` → `inputSchema` in tool definitions
- `maxSteps` → `stopWhen: stepCountIs(n)`
- `usage.promptTokens` → `usage.inputTokens`
- `usage.completionTokens` → `usage.outputTokens`

### AI SDK v6 Image Handling

Tool results with images must use the `content` format:

```typescript
{
  type: "content",
  value: [
    { type: "text", text: "..." },
    { type: "image-data", data: base64, mediaType: "image/jpeg" }
  ]
}
```

Raw base64 strings are treated as text tokens and will blow up context.

### Browser Screenshots

Screenshots are compressed as JPEG (quality 60) to reduce token usage.
A 1280x720 screenshot typically results in ~30-50KB of data.

### Peer Dependency

`ai` ^6.0.0 is a peer dependency because `bash-tool` requires it.
