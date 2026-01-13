/**
 * Ralph 13: Documentation App Setup
 * 
 * Creates the Next.js documentation app at apps/documentation with examples
 * integrated into the same app (not separate).
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  minimalChangesRule,
  trackProgressRule,
  visualCheckRule,
} from "@ralph/agent-loop";
import * as fs from "fs/promises";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🔷 Ralph 13 - Documentation App Setup");
console.log("━".repeat(60));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) console.log(`🐛 Debug: enabled`);
console.log("━".repeat(60));

const DOCS_APP = `${PROJECT_ROOT}/apps/documentation`;
const RALPH_GL_PKG = `${PROJECT_ROOT}/packages/ralph-gl`;
const EXAMPLES_APP = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Create Documentation App with Examples

## Working Directory
Script running from: ${process.cwd()}
Documentation app: ${DOCS_APP}
ralph-gl package: ${RALPH_GL_PKG}
Reference examples app: ${EXAMPLES_APP}

## CRITICAL: Update Progress
Update ${RALPH_GL_PKG}/brain/progress.md:
- Mark Ralph 13 as "In Progress"
- Update with completed tasks
- Mark as "Done" when finished

## Context

Create a Next.js documentation app that includes BOTH documentation AND examples.
Each example should be its own page under /examples/.

Reference the existing examples app at ${EXAMPLES_APP} for structure.

## Tasks

### 1. Create Next.js App

Initialize at ${DOCS_APP}:
\`\`\`bash
cd ${PROJECT_ROOT}/apps
npx create-next-app@latest documentation --typescript --tailwind --app --no-src-dir --import-alias "@/*"
\`\`\`

Or manually create the folder structure:
- app/ (Next.js 13+ app directory)
- components/
- public/
- package.json
- next.config.js
- tsconfig.json
- tailwind.config.js
- postcss.config.js

### 2. Package.json Setup

Create ${DOCS_APP}/package.json:
\`\`\`json
{
  "name": "@apps/documentation",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ralph-gl": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "typescript": "^5.7.2",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20"
  }
}
\`\`\`

### 3. App Structure

Create these pages:

\`\`\`
app/
├── layout.tsx           # Root layout with navigation
├── page.tsx             # Home page (intro to ralph-gl)
├── getting-started/
│   └── page.tsx         # Installation & quick start
├── api/
│   ├── page.tsx         # API overview
│   ├── context/
│   │   └── page.tsx     # GLContext API
│   ├── pass/
│   │   └── page.tsx     # Pass API
│   └── ...
├── concepts/
│   └── page.tsx         # Core concepts
└── examples/
    ├── page.tsx         # Examples gallery
    ├── basic/
    │   └── page.tsx     # Basic gradient example
    ├── uniforms/
    │   └── page.tsx     # Uniforms example
    ├── render-target/
    │   └── page.tsx     # Render target example
    └── ...
\`\`\`

### 4. Layout Component

Create ${DOCS_APP}/app/layout.tsx:
- Dark theme
- Sidebar navigation
- Main content area
- Responsive design

Navigation structure:
- Getting Started
- Concepts
- API Reference
  - GLContext
  - Pass
  - Material
  - RenderTarget
  - etc.
- Examples
  - Basic
  - Uniforms
  - Render Target
  - Ping-Pong
  - Particles
  - etc.

### 5. Home Page

${DOCS_APP}/app/page.tsx:
- Hero section with ralph-gl branding
- Brief description
- Feature highlights
- Quick start code snippet
- Link to Getting Started

### 6. Example Template

Each example page should follow this structure:

\`\`\`tsx
"use client";
import { useEffect, useRef } from "react";
import { gl, GLContext } from "ralph-gl";

export default function ExamplePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GLContext | null = null;
    let disposed = false;

    async function init() {
      if (!canvasRef.current || !gl.isSupported()) return;
      ctx = await gl.init(canvasRef.current);
      if (disposed) { ctx.dispose(); return; }

      // Example code here
      const pass = ctx.pass(/* glsl */ \`
        void main() {
          vec2 uv = gl_FragCoord.xy / u_globals_resolution;
          gl_FragColor = vec4(uv, 0.5, 1.0);
        }
      \`);

      function frame() {
        if (disposed) return;
        pass.draw();
        requestAnimationFrame(frame);
      }
      frame();
    }

    init();
    return () => { disposed = true; ctx?.dispose(); };
  }, []);

  return (
    <div className="example-page">
      <h1>Example Name</h1>
      <p>Description of what this example demonstrates.</p>
      
      <div className="canvas-container">
        <canvas ref={canvasRef} width={800} height={600} />
      </div>
      
      <div className="code-section">
        <h2>Code</h2>
        <pre><code>{/* Show the shader code */}</code></pre>
      </div>
    </div>
  );
}
\`\`\`

### 7. Shared Components

Create ${DOCS_APP}/components/:
- Navigation.tsx (sidebar navigation)
- CodeBlock.tsx (syntax highlighted code)
- ExampleCanvas.tsx (reusable canvas wrapper)

### 8. Styling

Use Tailwind CSS with custom theme:
- Dark background (#0a0a0a or similar)
- Accent color for links
- Code syntax highlighting
- Responsive layout

### 9. Next Config

${DOCS_APP}/next.config.js:
\`\`\`js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['ralph-gl'],
}

module.exports = nextConfig
\`\`\`

### 10. Initial Examples

Create these example pages:

1. **basic** - Simple gradient
2. **uniforms** - Animated uniforms
3. **render-target** - Offscreen rendering

Each should be fully functional and render correctly.

### 11. Verify Build

Run:
\`\`\`bash
cd ${DOCS_APP}
pnpm install
pnpm dev
\`\`\`

Visit http://localhost:3000 and check:
- Home page loads
- Navigation works
- Examples render (if ralph-gl is ready)
- No build errors

## Acceptance Criteria

### App Structure
- [ ] ${DOCS_APP} created with Next.js app directory
- [ ] package.json with dependencies
- [ ] Layout with sidebar navigation
- [ ] Home page

### Documentation Pages
- [ ] Getting Started page
- [ ] API overview page
- [ ] Concepts page

### Examples
- [ ] Examples gallery page
- [ ] At least 3 example pages created
- [ ] Each example has canvas and code display
- [ ] Examples directory structure follows pattern

### Build & Run
- [ ] \`pnpm install\` succeeds
- [ ] \`pnpm dev\` starts successfully
- [ ] No TypeScript errors
- [ ] App accessible at http://localhost:3000

### Progress
- [ ] brain/progress.md updated

## Important Notes

- Use the examples app (${EXAMPLES_APP}) as reference
- Keep examples simple initially
- Add more examples as ralph-gl features are implemented
- Update brain/progress.md when done
- Use browser tool to verify pages load correctly
`;

async function checkAppExists(): Promise<boolean> {
  try {
    await fs.access(`${DOCS_APP}/app/layout.tsx`);
    await fs.access(`${DOCS_APP}/package.json`);
    return true;
  } catch {
    return false;
  }
}

async function checkExamplesExist(): Promise<boolean> {
  try {
    await fs.access(`${DOCS_APP}/app/examples/basic/page.tsx`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    debug: DEBUG,
    limits: {
      maxIterations: 80,
      maxCost: 20.0,
      timeout: "60m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Starting Ralph 13: Documentation App Setup\n");
  const result = await agent.run();

  console.log("\n" + "━".repeat(60));
  console.log("📊 Results");
  console.log("━".repeat(60));
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log("━".repeat(60));

  const app = await checkAppExists();
  console.log(`${app ? "✅" : "❌"} App structure created`);

  const examples = await checkExamplesExist();
  console.log(`${examples ? "✅" : "❌"} Example pages created`);

  const allPassed = app && examples;
  console.log(`\n${allPassed ? "🎉" : "⚠️"} ${allPassed ? "All checks passed!" : "Some checks failed"}`);

  if (!result.success) process.exit(1);
  console.log("\n✨ Ralph 13 complete!");
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
