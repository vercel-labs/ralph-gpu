/**
 * 59-playground-preview: Build the Preview component and full Playground page
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  trackProgressRule,
  minimalChangesRule,
  completionRule,
  visualCheckRule,
  processManagementRule,
} from "@ralph/agent-loop";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-2.5-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Build Preview Component and Full Playground Page

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   └── core/                 (main WebGPU library - "ralph-gpu" package)
│       └── src/
├── apps/
│   └── examples/             (Next.js app with examples)
│       ├── app/
│       │   ├── page.tsx      (gallery page - DONE)
│       │   ├── playground/
│       │   │   └── [slug]/
│       │   │       └── page.tsx  (placeholder - TO IMPLEMENT)
│       │   ├── basic/page.tsx   (example - reference this)
│       │   └── uniforms/page.tsx (example with uniforms)
│       ├── components/
│       │   ├── ExampleCard.tsx  (DONE)
│       │   └── MonacoEditor.tsx (DONE - Monaco wrapper)
│       └── lib/
│           └── examples.ts     (example registry with shaderCode)
└── ralphs/
    └── 59-playground-preview/  (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access project files: use relative paths like \`../../apps/examples\`
- To access this script's files: use paths relative to \`.\`
- Example: To edit playground page: \`../../apps/examples/app/playground/[slug]/page.tsx\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat .progress.md 2>/dev/null || echo "No progress file"\`
2. Check if .brain/ exists: \`ls .brain/ 2>/dev/null && cat .brain/index.md || echo "No brain"\`
3. Check what files already exist in target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart!**

## Context

The examples gallery is complete with:
- Gallery page at \`/\` showing examples grouped by category
- ExampleCard component with hover effects
- Placeholder playground page at \`/playground/[slug]\`
- MonacoEditor component for code editing
- examples.ts registry with metadata and shaderCode for 4 examples (basic, uniforms, raymarching, lines)

Now we need to build the FULL playground page with:
1. **Preview component** - Renders WebGPU canvas with shader code
2. **Full playground page** - Split layout with Monaco editor + Preview

## Reference Code Pattern

Here's how the basic example uses ralph-gpu (from apps/examples/app/basic/page.tsx):

\`\`\`tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

// Initialize context
ctx = await gpu.init(canvasRef.current, { dpr: Math.min(window.devicePixelRatio, 2) });

// Create pass with shader code  
const pass = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
\`);

// Animation loop
function frame() {
  pass.draw();
  requestAnimationFrame(frame);
}
frame();

// Cleanup
ctx.dispose();
\`\`\`

## Acceptance Criteria (ALL MUST BE MET)

### 1. Preview Component (apps/examples/components/Preview.tsx)
- [ ] Props: \`shaderCode: string\`, \`onError?: (error: string) => void\`
- [ ] Initialize WebGPU context with ralph-gpu
- [ ] Compile and render the shader code
- [ ] Catch and report compilation errors via onError callback
- [ ] Clean up on unmount or when shaderCode changes
- [ ] Show loading state while initializing
- [ ] Use "use client" directive

### 2. Full Playground Page (apps/examples/app/playground/[slug]/page.tsx)
- [ ] Split layout: Monaco editor (left ~50%) + Preview canvas (right ~50%)
- [ ] Load example's shaderCode from registry on mount
- [ ] Display error panel when shader compilation fails
- [ ] Run button that triggers re-render with current editor code
- [ ] Cmd/Ctrl+Enter keyboard shortcut triggers run (already in MonacoEditor)
- [ ] Dark theme matching gallery design (#0a0a0f background)
- [ ] Responsive layout (stack on mobile)
- [ ] Back to Gallery link

### 3. Build Verification
- [ ] \`pnpm build\` passes with no errors

### Browser Validation (REQUIRED)
- [ ] Start dev server: \`pnpm dev\` (check listProcesses first, reuse if running)
- [ ] Navigate to /playground/basic in headless browser
- [ ] Take screenshot to verify split layout renders
- [ ] Check browser console for WebGPU errors (some browsers don't support WebGPU - that's OK)
- [ ] If screenshot shows split layout (editor + canvas area) → verification passes

## Implementation Guide

### Step 1: Create Preview.tsx

\`\`\`tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

interface PreviewProps {
  shaderCode: string;
  onError?: (error: string | null) => void;
}

export function Preview({ shaderCode, onError }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<GPUContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ... implement initialization, error handling, cleanup
}
\`\`\`

### Step 2: Update Playground Page

Replace the placeholder with full implementation:

\`\`\`tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { getExampleBySlug } from '../../../lib/examples';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MonacoEditor } from '../../../components/MonacoEditor';
import { Preview } from '../../../components/Preview';

export default function PlaygroundPage({ params }: { params: { slug: string } }) {
  const example = getExampleBySlug(params.slug);
  if (!example) notFound();

  const [code, setCode] = useState(example.shaderCode);
  const [activeCode, setActiveCode] = useState(example.shaderCode);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    setActiveCode(code);
    setError(null);
  }, [code]);

  // ... implement full layout
}
\`\`\`

## Completion Criteria

After visual verification passes (screenshot shows split layout with editor + preview area):
1. Update .progress.md to mark ALL items [x] complete
2. Call done() IMMEDIATELY
3. Do NOT re-read files or take more screenshots

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress:
\`\`\`bash
cat .progress.md 2>/dev/null || echo "No progress"
ls .brain/ 2>/dev/null && cat .brain/index.md || echo "No brain"
ls ../../apps/examples/components/Preview.tsx 2>/dev/null || echo "No Preview.tsx"
\`\`\`
Based on what exists, SKIP completed tasks and proceed to the next incomplete one.

## Anti-Patterns to AVOID
- Do NOT re-verify if screenshot already shows working UI
- Do NOT spawn multiple dev servers (check listProcesses first)
- Do NOT re-read files you just wrote
- After ONE successful visual verification → call done() immediately
`;

async function checkFeatureImplemented(): Promise<Record<string, boolean>> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const examplesPath = path.join(PROJECT_ROOT, "apps/examples");
  const checks: Record<string, boolean> = {};

  // Check Preview.tsx exists
  try {
    await fs.access(path.join(examplesPath, "components/Preview.tsx"));
    checks.previewComponent = true;
  } catch {
    checks.previewComponent = false;
  }

  // Check playground page exists and is not placeholder
  try {
    const content = await fs.readFile(
      path.join(examplesPath, "app/playground/[slug]/page.tsx"),
      "utf-8"
    );
    checks.playgroundPage =
      content.includes("Preview") && content.includes("MonacoEditor");
  } catch {
    checks.playgroundPage = false;
  }

  return checks;
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [
      brainRule,
      trackProgressRule,
      minimalChangesRule,
      completionRule,
      visualCheckRule,
      processManagementRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 15,
      maxCost: 5.0,
      timeout: "15m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "If UI is verified working, call done() immediately. Otherwise, try a different approach.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting agent...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const checks = await checkFeatureImplemented();
  console.log("Check results:", checks);

  const passed = checks.previewComponent && checks.playgroundPage;
  console.log(`\n${passed ? "🎉 Playground implemented!" : "⚠️ Some checks failed"}`);

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
