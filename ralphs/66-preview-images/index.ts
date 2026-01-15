/**
 * 66-preview-images: Generate preview images for examples and display on gallery
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
# Task: Generate Preview Images for Examples Gallery

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── apps/
│   └── docs/                 (Next.js docs app)
│       ├── public/
│       │   └── examples/     (← CREATE - store preview images)
│       ├── lib/
│       │   └── examples.ts   (read example slugs)
│       ├── components/
│       │   └── ExampleCard.tsx (← MODIFY - show preview image)
│       └── scripts/
│           └── generate-previews.ts (← CREATE - screenshot script)
└── ralphs/
    └── 66-preview-images/    (← YOU ARE HERE)
\`\`\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists
2. Read the current ExampleCard.tsx and examples.ts

## Context & Goal

The gallery page shows example cards with only title and description. We want to add preview images to make it visually browsable.

**Goal**: 
1. Create a script that generates preview screenshots using Playwright
2. Update ExampleCard to display the preview images

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create Preview Images Directory
- [ ] Create apps/docs/public/examples/ directory

### 2. Create Preview Generation Script
- [ ] Create apps/docs/scripts/generate-previews.ts
- [ ] Script reads example slugs from lib/examples.ts
- [ ] Uses Playwright to navigate to each example
- [ ] Takes screenshot of the canvas/preview area
- [ ] Saves as public/examples/[slug].png
- [ ] Add script to package.json: "generate-previews": "tsx scripts/generate-previews.ts"

### 3. Generate Preview Images
- [ ] Run the script to generate images for all 7 examples
- [ ] Verify images exist in public/examples/

### 4. Update ExampleCard Component
- [ ] Add Image component to show preview
- [ ] Use Next.js Image with /examples/[slug].png
- [ ] Add aspect ratio container for consistent sizing
- [ ] Handle missing images gracefully

### 5. Build & Visual Verification (REQUIRED!)
- [ ] pnpm build --filter docs passes
- [ ] Start dev server
- [ ] Navigate to http://localhost:3001/examples
- [ ] Take screenshot showing gallery with preview images
- [ ] Verify images display correctly

## Implementation Guide

### Step 1: Create Script Directory and File

Create apps/docs/scripts/generate-previews.ts:
\`\`\`typescript
import { chromium } from 'playwright';
import { getAllExamples } from '../lib/examples';
import * as fs from 'fs';
import * as path from 'path';

async function generatePreviews() {
  const examples = getAllExamples();
  const outputDir = path.join(__dirname, '../public/examples');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 800, height: 450 });

  for (const example of examples) {
    console.log(\\\`Generating preview for: \\\${example.slug}\\\`);
    
    try {
      await page.goto(\\\`http://localhost:3001/examples/\\\${example.slug}\\\`, {
        waitUntil: 'networkidle'
      });
      
      // Wait for canvas to render
      await page.waitForTimeout(1000);
      
      // Take screenshot of the preview area
      const previewArea = await page.locator('.bg-black').first();
      if (await previewArea.isVisible()) {
        await previewArea.screenshot({
          path: path.join(outputDir, \\\`\\\${example.slug}.png\\\`)
        });
      } else {
        // Fallback to full page
        await page.screenshot({
          path: path.join(outputDir, \\\`\\\${example.slug}.png\\\`),
          clip: { x: 0, y: 200, width: 800, height: 400 }
        });
      }
    } catch (error) {
      console.error(\\\`Failed to generate preview for \\\${example.slug}:\\\`, error);
    }
  }

  await browser.close();
  console.log('Done generating previews!');
}

generatePreviews();
\`\`\`

### Step 2: Update package.json
Add script: "generate-previews": "tsx scripts/generate-previews.ts"

### Step 3: Update ExampleCard.tsx
\`\`\`typescript
import Link from 'next/link';
import Image from 'next/image';
import { Example } from '@/lib/examples';

interface ExampleCardProps {
  example: Example;
}

export function ExampleCard({ example }: ExampleCardProps) {
  return (
    <Link
      href={\\\`/examples/\\\${example.slug}\\\`}
      className="group block rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 transition-all hover:bg-slate-800/50 overflow-hidden"
    >
      <div className="aspect-video relative bg-black">
        <Image
          src={\\\`/examples/\\\${example.slug}.png\\\`}
          alt={example.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-primary-400 transition-colors">
          {example.title}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {example.description}
        </p>
      </div>
    </Link>
  );
}
\`\`\`

### Step 4: Run Script
\`\`\`bash
cd ${PROJECT_ROOT}/apps/docs
pnpm dev &  # Start dev server
sleep 5
pnpm generate-previews
\`\`\`

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Browser Validation (REQUIRED!)
⚠️ **You MUST take screenshots to verify:**
1. Start dev server
2. Navigate to http://localhost:3001/examples  
3. Take screenshot showing gallery with preview images

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If Playwright fails, check if chromium is installed: npx playwright install chromium

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Check existing progress and read current files before making changes.
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
      maxIterations: 20,
      maxCost: 8.0,
      timeout: "25m",
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

  console.log("🚀 Starting preview images agent...\n");

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
