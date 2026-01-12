/**
 * 08-docs-mdx-redesign: Enhance docs with MDX and Vercel-like design
 *
 * This script uses the LoopAgent to refactor the existing documentation
 * app to use MDX for content and implement a Vercel-inspired design system.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  visualCheckRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/agent-loop";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL =
  process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  console.error("Copy the .env file from ../07-documentation-app/");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🎨 Ralph Agent - Docs MDX Redesign");
console.log("━".repeat(55));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

const DOCS_DIR = `${PROJECT_ROOT}/apps/docs`;

const TASK = `
# Task: Enhance Documentation with MDX and Vercel-like Design

## Working Directory
You are running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}
Documentation app is at: ${DOCS_DIR}

## CRITICAL: Update Progress Regularly
After EVERY significant action, update .progress.md in this script folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria
- Document any errors encountered
This ensures the next agent can resume if this session is interrupted.

## Context
The documentation app was already created by a previous agent. Your job is to ENHANCE it with:
1. MDX support for content pages
2. Vercel-inspired design system
3. Proper syntax highlighting for code blocks

Read the .brain/redesign-plan.md file for detailed design guidance.

## Acceptance Criteria (ALL MUST BE MET)

### 1. MDX Configuration
- [ ] Install MDX dependencies (@next/mdx, @mdx-js/react)
- [ ] Configure next.config.mjs for MDX
- [ ] Create mdx-components.tsx for custom components
- [ ] Verify .mdx files render correctly

### 2. Syntax Highlighting
- [ ] Install Shiki or rehype-pretty-code
- [ ] Configure syntax highlighting in MDX
- [ ] Support WGSL, TypeScript, JavaScript, bash
- [ ] Add line numbers option
- [ ] Add copy-to-clipboard button
- [ ] Style code blocks to match Vercel docs

### 3. Vercel-like Design
- [ ] Update color palette (black background, clean whites)
- [ ] Use Geist or Inter font family
- [ ] Implement clean sidebar navigation
- [ ] Add generous whitespace and padding
- [ ] Create consistent heading styles
- [ ] Add subtle hover effects
- [ ] Implement clean card components

### 4. Custom MDX Components
- [ ] CodeBlock - syntax highlighted code
- [ ] Callout - info, warning, tip boxes
- [ ] ApiTable - for API reference
- [ ] Steps - numbered step instructions (optional)

### 5. Content Migration
- [ ] Convert getting-started page to use MDX patterns
- [ ] Convert concepts page to use MDX patterns
- [ ] Convert api page to use MDX patterns
- [ ] Convert examples page (keep React components for demos)

### 6. Quality Checks
- [ ] App builds without errors: \`pnpm build\`
- [ ] App runs correctly: \`pnpm dev\`
- [ ] Visual verification via Playwright screenshots
- [ ] All pages render correctly
- [ ] Code blocks have proper highlighting
- [ ] Responsive design works

## Implementation Order

### Phase 1: Setup MDX
1. Read current docs structure at ${DOCS_DIR}
2. Install MDX dependencies:
   \`\`\`bash
   cd ${DOCS_DIR}
   pnpm add @next/mdx @mdx-js/react
   pnpm add shiki rehype-pretty-code
   pnpm add -D @types/mdx
   \`\`\`
3. Update next.config.mjs for MDX
4. Create mdx-components.tsx
5. Update .progress.md

### Phase 2: Syntax Highlighting
1. Configure rehype-pretty-code with Shiki
2. Create CodeBlock component with:
   - Syntax highlighting
   - Line numbers (optional)
   - Copy button
   - Language label
   - Dark theme matching Vercel
3. Test with TypeScript and WGSL code
4. Update .progress.md

### Phase 3: Design System
1. Update globals.css with Vercel-inspired styles:
   - Black background (#000)
   - White text (#fafafa)
   - Gray accents (#888)
   - Blue accent (#0070f3)
2. Update Tailwind config with custom colors
3. Install and configure Geist font (or use Inter)
4. Update layout.tsx with new design
5. Update sidebar with clean navigation
6. Update .progress.md

### Phase 4: Custom Components
1. Create components/mdx/ folder
2. Build Callout component:
   \`\`\`tsx
   <Callout type="info|warning|tip">
     Content here
   </Callout>
   \`\`\`
3. Build ApiTable component for API docs
4. Export all components from mdx-components.tsx
5. Update .progress.md

### Phase 5: Content Enhancement
1. Update each page to use new components
2. Add Callout boxes where helpful
3. Ensure code blocks use new CodeBlock component
4. Keep the interactive examples working
5. Update .progress.md

### Phase 6: Verification
1. Run \`pnpm build\` and fix any errors
2. Start dev server: \`pnpm dev\`
3. Open browser to http://localhost:3001
4. Take screenshots of each page
5. Verify:
   - Syntax highlighting works
   - Design looks clean and Vercel-like
   - All pages render correctly
   - Code copy button works
6. Update .progress.md with final status

## Design Reference

### Vercel Docs Color Palette
\`\`\`css
/* Backgrounds */
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-tertiary: #111111;

/* Text */
--text-primary: #fafafa;
--text-secondary: #a1a1a1;
--text-muted: #666666;

/* Borders */
--border-default: #333333;
--border-hover: #444444;

/* Accent */
--accent-blue: #0070f3;
--accent-green: #50e3c2;
--accent-red: #ee0000;
\`\`\`

### Typography Scale
- h1: 2.5rem (40px), font-weight: 700
- h2: 1.875rem (30px), font-weight: 600
- h3: 1.5rem (24px), font-weight: 600
- h4: 1.25rem (20px), font-weight: 600
- body: 1rem (16px), line-height: 1.75
- code: 0.875rem (14px), font-family: mono

### Spacing
- Section padding: 4rem (64px)
- Card padding: 1.5rem (24px)
- Gap between elements: 1rem (16px)

## IMPORTANT REMINDERS
- Update .progress.md after EVERY significant action
- Read the existing code before making changes
- Test frequently with \`pnpm build\`
- Use Playwright to visually verify the design
- Keep the existing interactive examples working
- Don't break what already works - enhance it
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
        return "You're hitting the same error repeatedly. Read the error message carefully. Try a simpler approach - maybe skip the problematic feature and move on.";
      }
      if (ctx.reason === "no_progress") {
        return "You haven't made visible progress. Check .progress.md for what's done. Start making changes - even small improvements count.";
      }
      if (ctx.reason === "repetitive") {
        return "You're repeating actions. Move to the next phase. Check .progress.md for the next step.";
      }
      return "Try a different approach. Focus on one thing at a time. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");
  console.log("Enhancing documentation with:");
  console.log("  📝 MDX support for content");
  console.log("  🎨 Vercel-like design system");
  console.log("  ✨ Syntax highlighting with Shiki");
  console.log("  🧩 Custom MDX components");
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
