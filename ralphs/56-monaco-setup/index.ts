/**
 * 56-monaco-setup: Install Monaco Editor and create wrapper component for the examples playground
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

const TASK = `
# Task: Set Up Monaco Editor for Examples Playground

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package)
│   └── ralph/                (agent-loop package)
├── apps/
│   └── examples/             (Next.js examples app - YOUR TARGET)
│       ├── app/              (Next.js app router pages)
│       ├── components/       (shared components - CREATE HERE)
│       └── package.json      (add dependencies here)
└── ralphs/
    └── 56-monaco-setup/      (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- Examples app is at: ${PROJECT_ROOT}/apps/examples
- To install packages: cd ${PROJECT_ROOT}/apps/examples && pnpm add <package>
- To run dev server: cd ${PROJECT_ROOT}/apps/examples && pnpm dev

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Check if .brain/ exists: \`ls ${process.cwd()}/.brain/ 2>/dev/null && cat ${process.cwd()}/.brain/index.md 2>/dev/null || echo "No brain"\`
3. Check what files already exist in the target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**
**If files already exist (MonacoEditor.tsx, test-monaco/page.tsx), skip creating them and move to the NEXT incomplete task.**

## Progress Tracking Rules
- ONLY create .progress.md if it doesn't exist
- ONLY update .progress.md by APPENDING to it or updating checkboxes, never recreate from scratch
- Read your previous progress before each action to avoid repeating work
- If a task is already marked [x] complete, skip it and move to the next one

## Context
We are building a Shadertoy-like interactive playground for the ralph-gpu examples app.
The first step is to set up Monaco Editor - the VS Code editor component.
This will be used to let users edit shader code in the browser.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Install Monaco Editor Package
- [ ] Add @monaco-editor/react to apps/examples/package.json
- [ ] Run pnpm install from project root to install dependencies

### 2. Create Monaco Editor Wrapper Component
- [ ] Create file: apps/examples/components/MonacoEditor.tsx
- [ ] Component accepts props: value, onChange, language, onRun
- [ ] Configure dark theme (vs-dark)
- [ ] Add Cmd/Ctrl+Enter keyboard shortcut to trigger onRun callback
- [ ] Export as default and named export

### 3. Create Test Page
- [ ] Create file: apps/examples/app/test-monaco/page.tsx
- [ ] Page shows Monaco editor with sample TypeScript code
- [ ] Editor fills most of the viewport
- [ ] Cmd/Ctrl+Enter logs "Run!" to console

### 4. Browser Validation (REQUIRED)
- [ ] Start dev server: cd ${PROJECT_ROOT}/apps/examples && pnpm dev
- [ ] Navigate to http://localhost:3000/test-monaco in headless browser
- [ ] Verify Monaco editor renders (look for monaco-editor class)
- [ ] Take screenshot to confirm visual rendering
- [ ] Check browser console for errors

## Implementation Guide

### Step 1: Install Package
\`\`\`bash
cd ${PROJECT_ROOT}/apps/examples
pnpm add @monaco-editor/react
\`\`\`

### Step 2: Create MonacoEditor Component
File: apps/examples/components/MonacoEditor.tsx
\`\`\`tsx
"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useCallback, useRef } from "react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "typescript" | "html" | "javascript";
  onRun?: () => void;
}

export function MonacoEditor({ value, onChange, language = "typescript", onRun }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Add Cmd/Ctrl+Enter to run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.();
    });
  }, [onRun]);

  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val || "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}

export default MonacoEditor;
\`\`\`

### Step 3: Create Test Page
File: apps/examples/app/test-monaco/page.tsx
\`\`\`tsx
"use client";

import { useState } from "react";
import MonacoEditor from "../../components/MonacoEditor";

const DEFAULT_CODE = \\\`// Sample TypeScript code
import { gpu } from "ralph-gpu";

async function main() {
  const canvas = document.querySelector("canvas")!;
  const ctx = await gpu.init(canvas);
  
  const pass = ctx.pass(\\\\\\\`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / globals.resolution;
      return vec4f(uv, 0.5, 1.0);
    }
  \\\\\\\`);
  
  function frame() {
    pass.draw();
    requestAnimationFrame(frame);
  }
  frame();
}

main();
\\\`;

export default function TestMonacoPage() {
  const [code, setCode] = useState(DEFAULT_CODE);

  const handleRun = () => {
    console.log("Run! Code length:", code.length);
  };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      background: "#1e1e1e"
    }}>
      <div style={{ 
        padding: "1rem", 
        borderBottom: "1px solid #333",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, color: "#fff" }}>Monaco Editor Test</h1>
        <button 
          onClick={handleRun}
          style={{
            padding: "0.5rem 1rem",
            background: "#0e639c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Run (Cmd+Enter)
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <MonacoEditor 
          value={code} 
          onChange={setCode} 
          language="typescript"
          onRun={handleRun}
        />
      </div>
    </div>
  );
}
\`\`\`

## Browser Automation
⚠️ **CRITICAL**: Use headless mode for all browser validation:
\`\`\`typescript
// Use Playwright to validate
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3000/test-monaco');
// Wait for Monaco to load
await page.waitForSelector('.monaco-editor', { timeout: 10000 });
// Take screenshot
await page.screenshot({ path: 'monaco-test.png' });
await browser.close();
\`\`\`

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}/apps/examples
pnpm dev &
sleep 5
# Then use Playwright to verify
\`\`\`

## Success Indicators
- Monaco editor loads without console errors
- Editor shows syntax highlighting for TypeScript
- Cmd/Ctrl+Enter triggers the onRun callback
- Dark theme is applied correctly

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress:
\`\`\`bash
echo "=== Checking existing progress ===" && \
cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file yet" && \
echo "=== Checking existing brain ===" && \
cat ${process.cwd()}/.brain/index.md 2>/dev/null || echo "No brain yet" && \
echo "=== Checking if Monaco already installed ===" && \
grep -q "@monaco-editor/react" ${PROJECT_ROOT}/apps/examples/package.json && echo "Monaco ALREADY INSTALLED" || echo "Monaco not installed" && \
echo "=== Checking if component exists ===" && \
ls -la ${PROJECT_ROOT}/apps/examples/components/MonacoEditor.tsx 2>/dev/null && echo "Component ALREADY EXISTS" || echo "Component not created" && \
echo "=== Checking if test page exists ===" && \
ls -la ${PROJECT_ROOT}/apps/examples/app/test-monaco/page.tsx 2>/dev/null && echo "Test page ALREADY EXISTS" || echo "Test page not created"
\`\`\`

Based on what already exists, SKIP completed tasks and proceed to the next incomplete one.
`;

async function checkMonacoSetup(): Promise<boolean> {
  const componentPath = path.join(PROJECT_ROOT, "apps/examples/components/MonacoEditor.tsx");
  const testPagePath = path.join(PROJECT_ROOT, "apps/examples/app/test-monaco/page.tsx");
  const packagePath = path.join(PROJECT_ROOT, "apps/examples/package.json");
  
  try {
    const [component, testPage, pkg] = await Promise.all([
      fs.readFile(componentPath, "utf-8").catch(() => ""),
      fs.readFile(testPagePath, "utf-8").catch(() => ""),
      fs.readFile(packagePath, "utf-8").catch(() => "{}"),
    ]);
    
    const hasComponent = component.includes("monaco-editor/react") && component.includes("onMount");
    const hasTestPage = testPage.includes("MonacoEditor") && testPage.includes("use client");
    const hasPackage = pkg.includes("@monaco-editor/react");
    
    console.log("Check results:", { hasComponent, hasTestPage, hasPackage });
    return hasComponent && hasTestPage && hasPackage;
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  const agent = new LoopAgent({
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule],
    limits: { maxIterations: 25, maxCost: 10.0, timeout: "30m" },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`);
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Update .progress.md with what you tried and what didn't work.";
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

  const passed = await checkMonacoSetup();
  console.log(`\n${passed ? "🎉 Monaco setup complete!" : "⚠️ Monaco setup incomplete"}`);

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
