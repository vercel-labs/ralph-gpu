/**
 * 07-documentation-app: Create documentation for ralph-gpu
 *
 * This script uses the LoopAgent to create a comprehensive documentation
 * web application for the ralph-gpu WebGPU shader library.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  visualCheckRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/core";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL =
  process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  console.error("Copy the .env file from ../06-raymarching-gallery/");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("📚 Ralph Agent - Documentation App Generator");
console.log("━".repeat(55));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

const DOCS_DIR = `${PROJECT_ROOT}/apps/docs`;
const CORE_PACKAGE = `${PROJECT_ROOT}/packages/core`;
const EXAMPLES_DIR = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Create Documentation App for ralph-gpu

## Working Directory
You are running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}
Documentation app will be at: ${DOCS_DIR}

## CRITICAL: Update Progress Regularly
After EVERY significant action (file created, section completed, error fixed), update .progress.md in this script folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria
- Document any errors encountered
This ensures the next agent can resume if this session is interrupted.

## Objective
Create a beautiful, comprehensive documentation website for the ralph-gpu WebGPU shader library. The documentation should help developers understand and use ralph-gpu effectively.

## Source Material
The main documentation source is: ${CORE_PACKAGE}/README.md
You MUST read this file first - it contains all the API documentation and examples.

For reference implementations, look at: ${EXAMPLES_DIR}/app/*/page.tsx

## Acceptance Criteria (ALL MUST BE MET)

### 1. App Setup
- [ ] Next.js app created at ${DOCS_DIR}
- [ ] Proper package.json with dependencies
- [ ] Tailwind CSS configured for styling
- [ ] App structure follows conventions in .brain/conventions.md

### 2. Landing Page (/)
- [ ] Hero section with library name and tagline
- [ ] Quick code example showing the simplest usage
- [ ] Feature highlights (from README features list)
- [ ] Links to main documentation sections
- [ ] Modern, dark-themed design suitable for creative coding

### 3. Getting Started (/getting-started)
- [ ] Installation instructions (npm, pnpm)
- [ ] Browser support information
- [ ] First shader example (copy from README)
- [ ] React integration example
- [ ] Common setup issues and solutions

### 4. Core Concepts (/concepts)
- [ ] Explanation of key abstractions:
  - ctx (GPUContext)
  - pass (fullscreen shader)
  - material (custom vertex)
  - target (render target)
  - pingPong (iterative effects)
  - compute (GPU computation)
  - storage (data buffers)
- [ ] Auto-injected globals explanation
- [ ] Diagram or visual aid for data flow

### 5. API Reference (/api)
Document ALL public APIs from the README:
- [ ] gpu module (isSupported, init)
- [ ] GPUContext methods and properties
- [ ] Pass/Material API
- [ ] Compute shader API
- [ ] RenderTarget API
- [ ] PingPong API
- [ ] StorageBuffer API
- [ ] Blend modes
- [ ] Error types

### 6. Interactive Examples (/examples)
Create at least 3 live demos:
- [ ] Simple gradient (basic usage)
- [ ] Animated wave with uniforms
- [ ] Time-based color cycling
Each example should:
- Have working WebGPU canvas
- Show the code alongside
- Handle WebGPU not supported gracefully

### 7. Navigation
- [ ] Sidebar navigation on all pages
- [ ] Mobile-responsive (hamburger menu)
- [ ] Active page highlighting
- [ ] Logical page hierarchy

### 8. Quality Checks
- [ ] App builds without errors: \`cd ${DOCS_DIR} && pnpm build\`
- [ ] App runs correctly: \`cd ${DOCS_DIR} && pnpm dev\`
- [ ] Visual verification via Playwright (take screenshots)
- [ ] All links work
- [ ] Code examples are syntactically correct

## Technical Requirements

### Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- ralph-gpu (workspace:*)

### Design Guidelines
- Dark theme (bg-gray-900, text-gray-100)
- Syntax highlighting for code blocks
- Clear typography with good hierarchy
- Responsive layout (mobile-first)
- Consistent spacing (use Tailwind)

### Package.json Base
\`\`\`json
{
  "name": "docs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "ralph-gpu": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
\`\`\`

## Implementation Order

1. **Exploration Phase**
   - Read ${CORE_PACKAGE}/README.md thoroughly
   - Look at existing examples in ${EXAMPLES_DIR}
   - Check the .brain folder for conventions
   - Update .progress.md with findings

2. **Setup Phase**
   - Create ${DOCS_DIR} directory structure
   - Initialize package.json
   - Configure Tailwind CSS
   - Create base layout with navigation
   - Update .progress.md

3. **Content Phase** (one page at a time)
   - Landing page
   - Getting Started
   - Core Concepts
   - API Reference
   - Examples
   - Update .progress.md after each page

4. **Polish Phase**
   - Verify all links
   - Check responsive design
   - Fix any build errors
   - Update .progress.md

5. **Verification Phase**
   - Run \`pnpm build\` and fix errors
   - Start dev server: \`pnpm dev\`
   - Open browser to http://localhost:3001
   - Navigate all pages and take screenshots
   - Verify examples render correctly
   - Update .progress.md with final status

## Error Handling
- If \`pnpm install\` fails, check package.json syntax
- If build fails, read error messages carefully
- If WebGPU doesn't work in browser, that's expected - add fallback UI
- Document ALL errors in .progress.md

## Completion
When ALL acceptance criteria are met:
1. Take final screenshots of each page
2. Update .progress.md with completed status
3. Call done() with a summary of what was created

## IMPORTANT REMINDERS
- Update .progress.md after EVERY significant action
- Read the README first before writing any code
- Follow the conventions in .brain/conventions.md
- Test with \`pnpm build\` before visual verification
- Use Playwright to visually verify the app works
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true, // Writes to .traces/trace-{timestamp}.ndjson
    task: TASK,
    rules: [
      brainRule,
      visualCheckRule,
      explorationRule,
      minimalChangesRule,
      trackProgressRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 80,
      maxCost: 20.0,
      timeout: "60m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
      if (status.lastActions.length > 0) {
        console.log(`  → Actions: ${status.lastActions.slice(-3).join(", ")}`);
      }
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      if (ctx.reason === "error_loop") {
        return "You're hitting the same error repeatedly. Check the error message carefully. Try a simpler approach or skip to the next section.";
      }
      if (ctx.reason === "no_progress") {
        return "You haven't made visible progress. Start writing code - create files, even if simple. Progress is better than perfection.";
      }
      if (ctx.reason === "repetitive") {
        return "You're repeating actions. Move to the next step. Check .progress.md to see what's done and what's next.";
      }
      return "Try a different approach. Simplify if needed. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");
  console.log("Creating documentation app with:");
  console.log("  📄 Landing page");
  console.log("  🚀 Getting Started guide");
  console.log("  💡 Core Concepts");
  console.log("  📖 API Reference");
  console.log("  🎨 Interactive Examples");
  console.log("");

  const result = await agent.run();

  console.log("\n" + "━".repeat(55));
  console.log("📊 Results");
  console.log("━".repeat(55));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log(
    `🔤 Tokens: ${result.tokens.total.toLocaleString()} (in: ${result.tokens.input.toLocaleString()}, out: ${result.tokens.output.toLocaleString()})`
  );
  console.log("━".repeat(55));

  if (result.summary) {
    console.log("\n📄 Summary:");
    console.log(result.summary);
  }

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    if (result.error) {
      console.error(`Error details: ${result.error.message}`);
    }
    process.exit(1);
  }

  console.log("\n✨ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
