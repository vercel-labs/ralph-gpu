/**
 * 60-monaco-setup: Install Monaco Editor and create wrapper component for docs app
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule } from "@ralph/agent-loop";

// Configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-3-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Setup Monaco Editor in Docs App

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   └── core/                 (main WebGPU library - ralph-gpu)
├── apps/
│   └── docs/                 (Next.js docs app - TARGET FOR THIS TASK)
│       ├── app/
│       │   └── examples/     (current examples page)
│       ├── components/       (existing components)
│       └── package.json      (add Monaco here)
└── ralphs/
    └── 60-monaco-setup/      (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access project files: use relative paths from ${PROJECT_ROOT}
- To access this script's files: use paths relative to ${process.cwd()}
- Example: To edit docs app: \`cd ${PROJECT_ROOT}/apps/docs\`
- Example: To update progress: \`cat >> ${process.cwd()}/.progress.md\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Check if .brain/ exists: \`ls ${process.cwd()}/.brain/ 2>/dev/null && cat ${process.cwd()}/.brain/index.md 2>/dev/null || echo "No brain"\`
3. Check what files already exist in the target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**
**If files already exist, skip creating them and move to the NEXT incomplete task.**

## Context
We're building an interactive examples gallery for the ralph-gpu docs. This ralph focuses on:
1. Installing @monaco-editor/react package in the docs app
2. Creating a MonacoEditor wrapper component with dark theme

The docs app already has:
- Working examples page at /examples with live WebGPU shaders
- Tailwind CSS configured
- Dark theme styling

## Acceptance Criteria (ALL MUST BE MET)

### 1. Monaco Package Installation
- [ ] @monaco-editor/react is added to apps/docs/package.json
- [ ] pnpm install runs successfully from project root

### 2. MonacoEditor Component
- [ ] Create apps/docs/components/MonacoEditor.tsx
- [ ] Component accepts: code (string), onChange (callback), onRun (callback)
- [ ] Uses dark theme (vs-dark)
- [ ] Has Cmd/Ctrl+Enter keyboard shortcut that calls onRun
- [ ] Language set to "typescript" (works well enough for WGSL)
- [ ] Component is a client component ('use client')

### 3. Build Verification
- [ ] pnpm build passes in apps/docs (no TypeScript errors)

### 4. Browser Validation (REQUIRED)
- [ ] Start dev server: \`pnpm dev\` (check listProcesses first, reuse if running)
- [ ] Navigate to http://localhost:3001/examples in headless browser
- [ ] Take screenshot to verify the existing examples page still works
- [ ] Check browser console for errors
- [ ] If screenshot shows UI working with no errors → DONE

## Implementation Guide

### Step 1: Install Monaco
\`\`\`bash
cd ${PROJECT_ROOT}/apps/docs
pnpm add @monaco-editor/react
\`\`\`

### Step 2: Create MonacoEditor Component
Create \`apps/docs/components/MonacoEditor.tsx\`:

\`\`\`typescript
'use client';

import Editor, { OnMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';

interface MonacoEditorProps {
  code: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  language?: string;
  height?: string;
}

export function MonacoEditor({
  code,
  onChange,
  onRun,
  language = 'typescript',
  height = '100%',
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+Enter shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.();
    });
  }, [onRun]);

  const handleChange = useCallback((value: string | undefined) => {
    onChange?.(value ?? '');
  }, [onChange]);

  return (
    <Editor
      height={height}
      language={language}
      theme="vs-dark"
      value={code}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
}
\`\`\`

### Step 3: Verify Build
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Browser Automation
⚠️ **CRITICAL**: Browser automation ALWAYS runs in headless mode by default.
- Do NOT set headless: false
- Do NOT write custom Playwright scripts for interaction testing
- Visual verification (screenshot + no console errors) is SUFFICIENT
- After ONE successful visual verification → call done() immediately

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm install
pnpm build --filter docs
\`\`\`

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY
3. Do NOT re-read files or take more screenshots after this

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error and fix the actual issue
- If stuck after 2-3 attempts on same error, call done() with failure summary

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress and what already exists.
Based on what already exists, SKIP completed tasks and proceed to the next incomplete one.
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule],
    debug: DEBUG,
    limits: {
      maxIterations: 15,
      maxCost: 5.0,
      timeout: "20m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting Monaco setup agent...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
