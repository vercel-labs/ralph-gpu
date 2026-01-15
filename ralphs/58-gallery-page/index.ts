/**
 * 58-gallery-page: Redesign gallery page with thumbnail grid layout
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";
const CWD = process.cwd();

const TASK = `
# Task: Redesign Gallery Page with Thumbnail Grid Layout

## Working Directory & Navigation
This script is running from: ${CWD}
Project root is: ${PROJECT_ROOT}

### Repository Structure
ralph-gpu/                    (project root)
├── apps/
│   └── examples/             (Next.js examples app)
│       ├── app/
│       │   ├── page.tsx      (← MODIFY THIS - gallery page)
│       │   ├── page.module.css (existing styles)
│       │   └── playground/   (← CREATE THIS for playground pages)
│       │       └── [slug]/
│       │           └── page.tsx
│       ├── components/
│       │   ├── MonacoEditor.tsx (already created)
│       │   └── ExampleCard.tsx (may need to create/update)
│       └── lib/
│           └── examples.ts   (← USE THIS - examples registry)
└── ralphs/
    └── 58-gallery-page/      (← YOU ARE HERE)

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists and read it
2. Check if .brain/ exists and read its contents  
3. Check what files already exist in the target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**

## Context
We are building a Shadertoy-like interactive playground. The examples registry is complete.
Now we need to redesign the gallery page to show a beautiful grid of example cards.
Each card links to /playground/[slug] where users can edit the shader code.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Redesign Gallery Page (apps/examples/app/page.tsx)
- [ ] Import examples and categories from lib/examples.ts
- [ ] Show examples grouped by category
- [ ] Each example card shows: title, description, category badge
- [ ] Cards link to /playground/[slug]
- [ ] Beautiful dark theme grid layout (like Shadertoy)
- [ ] Responsive design (2-4 columns depending on screen size)

### 2. Create ExampleCard Component (if not exists)
- [ ] Create apps/examples/components/ExampleCard.tsx
- [ ] Props: slug, title, description, category
- [ ] Hover effects and transitions
- [ ] Placeholder for thumbnail (colored gradient based on category)

### 3. Create Placeholder Playground Page
- [ ] Create apps/examples/app/playground/[slug]/page.tsx
- [ ] Basic placeholder that shows the example title
- [ ] Will be fully implemented in next task

### 4. Styling
- [ ] Dark theme with dark background (#0a0a0f or similar)
- [ ] Card hover effects with subtle glow
- [ ] Category badges with distinct colors per category
- [ ] Proper spacing and typography

### 5. Browser Validation (REQUIRED)
- [ ] Start dev server and navigate to http://localhost:3000
- [ ] Verify gallery renders with all examples
- [ ] Click on a card to verify navigation to /playground/[slug]
- [ ] Take screenshot to confirm visual rendering

## Category Color Scheme
- basics: blue gradient
- techniques: purple gradient  
- simulations: cyan gradient
- advanced: orange gradient
- features: green gradient

## Testing
cd ${PROJECT_ROOT}/apps/examples
pnpm dev
# Navigate to http://localhost:3000 and verify

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Check existing progress and what files already exist first.
`;

async function checkGalleryRedesigned(): Promise<boolean> {
  const pagePath = path.join(PROJECT_ROOT, "apps/examples/app/page.tsx");
  const playgroundPath = path.join(PROJECT_ROOT, "apps/examples/app/playground/[slug]/page.tsx");
  
  try {
    const [page, playground] = await Promise.all([
      fs.readFile(pagePath, "utf-8").catch(() => ""),
      fs.readFile(playgroundPath, "utf-8").catch(() => ""),
    ]);
    
    const hasExamplesImport = page.includes("examples") && page.includes("lib/examples");
    const hasCategories = page.includes("category") || page.includes("Category");
    const hasPlayground = playground.includes("slug") || playground.includes("params");
    
    console.log("Check results:", { hasExamplesImport, hasCategories, hasPlayground });
    return hasExamplesImport && hasCategories && hasPlayground;
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
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting gallery page redesign agent...\n");
  
  const result = await agent.run();
  
  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const passed = await checkGalleryRedesigned();
  console.log(`\n${passed ? "🎉 Gallery page redesigned!" : "⚠️ Gallery incomplete"}`);

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
