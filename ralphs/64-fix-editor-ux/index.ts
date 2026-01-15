/**
 * 64-fix-editor-ux: Fix keyboard shortcut, minimal design, button shortcut label
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule } from "@ralph/agent-loop";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-3-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Fix Editor UX - Keyboard Shortcut, Minimal Design, Button Label

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── apps/
│   └── docs/                 (Next.js docs app)
│       ├── app/
│       │   └── examples/
│       │       └── [slug]/
│       │           └── page.tsx    (MODIFY - remove footer blocks)
│       └── components/
│           ├── MonacoEditor.tsx    (MODIFY - fix keyboard shortcut)
│           └── ShaderPlayground.tsx (MODIFY - button label, minimal header)
└── ralphs/
    └── 64-fix-editor-ux/           (← YOU ARE HERE)
\`\`\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Read the current files to understand what needs to change

## Context & Problems to Fix

### Problem 1: Keyboard Shortcut Only Works Once
The Cmd/Ctrl+Enter shortcut stops working after the first use.

**Root Cause**: In MonacoEditor.tsx, the \`onRun\` callback is captured in a stale closure:
\`\`\`typescript
const handleEditorMount: OnMount = useCallback((editor, monaco) => {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    onRun?.();  // <-- This captures the initial onRun, never updates
  });
}, [onRun]);
\`\`\`

**Fix**: Use a ref to always get the latest callback:
\`\`\`typescript
const onRunRef = useRef(onRun);
useEffect(() => { onRunRef.current = onRun; }, [onRun]);

const handleEditorMount: OnMount = useCallback((editor, monaco) => {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    onRunRef.current?.();  // <-- Always uses latest callback
  });
}, []);  // <-- No dependency on onRun
\`\`\`

### Problem 2: Footer Blocks Take Up Space
The [slug]/page.tsx has footer blocks (Controls, WGSL Syntax, Responsive) that waste space.

**Fix**: Remove the entire <footer> section from the page.

### Problem 3: Run Button Missing Shortcut Label
Button just says "Run Shader" but should show the keyboard shortcut.

**Fix**: Change button text to show shortcut:
- "Run ⌘↵" on Mac
- "Run Ctrl+↵" on Windows/Linux
- Use a simple check: \`typeof navigator !== 'undefined' && navigator.platform.includes('Mac')\`

### Problem 4: Header Too Bulky
The editor header has decorative elements (traffic light dots) that waste space.

**Fix**: Make header more minimal - smaller padding, simpler design.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Keyboard Shortcut Fix
- [ ] MonacoEditor.tsx uses useRef for onRun callback
- [ ] Shortcut works multiple times without clicking button first

### 2. Remove Footer Blocks
- [ ] [slug]/page.tsx has no footer section
- [ ] More vertical space for the editor

### 3. Button Shows Shortcut
- [ ] Button shows "Run ⌘↵" on Mac or "Run Ctrl+↵" on other platforms
- [ ] Keep the play icon

### 4. Minimal Header Design
- [ ] Remove or simplify the traffic light dots
- [ ] Reduce header padding (py-2 instead of py-3)
- [ ] Remove "Shader Editor" label or make it smaller

### 5. Build & Visual Verification (REQUIRED!)
- [ ] pnpm build --filter docs passes
- [ ] Start dev server
- [ ] Navigate to http://localhost:3001/examples/gradient
- [ ] Take screenshot showing:
  - Minimal header with Run button showing shortcut
  - No footer blocks
  - More space for editor and preview
- [ ] Verify no console errors

## Implementation Guide

### Step 1: Fix MonacoEditor.tsx
\`\`\`typescript
'use client';

import Editor, { OnMount } from '@monaco-editor/react';
import { useCallback, useRef, useEffect } from 'react';

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
  const onRunRef = useRef(onRun);

  // Keep ref updated with latest callback
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+Enter shortcut - uses ref to always get latest callback
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });
  }, []);

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
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
\`\`\`

### Step 2: Update ShaderPlayground.tsx Header & Button
- Make header minimal (smaller padding, no traffic lights)
- Button shows shortcut based on platform

### Step 3: Remove Footer from [slug]/page.tsx
- Delete the entire <footer>...</footer> section

## Browser Validation (REQUIRED!)
⚠️ **You MUST take screenshots to verify the changes work:**
1. Start dev server: \`pnpm dev --filter docs\`
2. Navigate to http://localhost:3001/examples/gradient
3. Take a screenshot showing the minimal design
4. Check console for errors

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error and fix it

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Check existing progress and read the current files before making changes.
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

  console.log("🚀 Starting editor UX fix agent...\n");

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
