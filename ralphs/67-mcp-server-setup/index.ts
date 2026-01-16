/**
 * 67-mcp-server-setup: Install MCP dependencies and create MCP server route
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";

// Configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-2.5-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Create MCP Server for ralph-gpu Docs

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── .cursor/
│   └── rules/
│       └── ralph-gpu.mdc     (cursor rule - use for get_started tool ~1600 lines)
├── apps/
│   └── docs/                 (← TARGET: Next.js docs app)
│       ├── app/
│       │   ├── api/          (create MCP route here)
│       │   └── ...pages
│       ├── lib/
│       │   ├── examples/     (existing - has getAllExamples, getExampleBySlug)
│       │   └── mcp/          (← CREATE: docs-content.ts here)
│       └── package.json      (add dependencies here)
└── ralphs/
    └── 67-mcp-server-setup/  (← YOU ARE HERE - this script's folder)
\`\`\`

### Navigation Instructions
- To access docs app: \`cd ${PROJECT_ROOT}/apps/docs\`
- To access cursor rule: \`cat ${PROJECT_ROOT}/.cursor/rules/ralph-gpu.mdc\`
- To update progress: use paths relative to ${process.cwd()}

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Check if the MCP route already exists: \`ls ${PROJECT_ROOT}/apps/docs/app/api/mcp 2>/dev/null || echo "No MCP route"\`
3. Check if lib/mcp already exists: \`ls ${PROJECT_ROOT}/apps/docs/lib/mcp 2>/dev/null || echo "No lib/mcp"\`

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**

## Context
We're adding an MCP (Model Context Protocol) server to the ralph-gpu documentation app. This allows LLMs like Cursor to query the documentation programmatically.

We'll use Vercel's \`mcp-handler\` package which simplifies creating MCP servers in Next.js.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Dependencies Installed
- [ ] Run \`pnpm add mcp-handler zod\` in apps/docs folder
- [ ] Verify package.json has both dependencies

### 2. MCP Route Handler Created
- [ ] Create folder: \`apps/docs/app/api/mcp/[transport]/\`
- [ ] Create file: \`apps/docs/app/api/mcp/[transport]/route.ts\`
- [ ] Handler exports GET and POST
- [ ] Uses createMcpHandler from mcp-handler
- [ ] Server name: "ralph-gpu-docs", version: "1.0.0"
- [ ] basePath: "/api/mcp"

### 3. Five MCP Tools Implemented
- [ ] \`get_started\` - Returns full cursor rule content (from .cursor/rules/ralph-gpu.mdc, strip frontmatter)
- [ ] \`get_documentation\` - Takes topic param ("getting-started" | "concepts" | "api"), returns markdown
- [ ] \`list_examples\` - Returns JSON array of all examples with slug, title, description, animated
- [ ] \`get_example\` - Takes slug param, returns full example object as JSON
- [ ] \`search_docs\` - Takes query param, returns matching sections with relevance score

### 4. Docs Content Module Created
- [ ] Create folder: \`apps/docs/lib/mcp/\`
- [ ] Create file: \`apps/docs/lib/mcp/docs-content.ts\`
- [ ] Implements \`getQuickstartGuide()\` - reads cursor rule, strips frontmatter
- [ ] Implements \`getDocContent(topic)\` - reads from lib/mcp/content/ folder
- [ ] Implements \`searchDocs(query)\` - searches docs, returns relevant sections

### 5. Build Passes
- [ ] Run \`pnpm build\` in apps/docs (or project root) - must pass

## Implementation Guide

### Step 1: Install Dependencies
\`\`\`bash
cd ${PROJECT_ROOT}/apps/docs
pnpm add mcp-handler zod
\`\`\`

### Step 2: Create MCP Route Handler

Create \`apps/docs/app/api/mcp/[transport]/route.ts\`:

\`\`\`typescript
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAllExamples, getExampleBySlug } from "@/lib/examples";
import { getQuickstartGuide, getDocContent, searchDocs } from "@/lib/mcp/docs-content";

const handler = createMcpHandler(
  (server) => {
    // Tool 1: get_started - comprehensive quickstart guide
    server.tool(
      "get_started",
      "Get the comprehensive ralph-gpu quickstart guide. This is the RECOMMENDED first tool to call - it contains all patterns, code examples, API usage, and best practices in a single document. Perfect for LLMs to understand the library quickly.",
      {},
      async () => {
        const content = getQuickstartGuide();
        return {
          content: [{ type: "text", text: content }],
        };
      }
    );

    // Tool 2: get_documentation
    server.tool(
      "get_documentation",
      "Get ralph-gpu documentation for a specific topic. Returns comprehensive markdown documentation.",
      {
        topic: z.enum(["getting-started", "concepts", "api"]).describe(
          "The documentation topic: 'getting-started' for installation and setup, 'concepts' for core abstractions, 'api' for complete API reference"
        ),
      },
      async ({ topic }) => {
        const content = getDocContent(topic);
        return {
          content: [{ type: "text", text: content }],
        };
      }
    );

    // Tool 3: list_examples
    server.tool(
      "list_examples",
      "List all available ralph-gpu examples with their metadata. Use this to discover what examples are available before fetching specific ones.",
      {},
      async () => {
        const examples = getAllExamples();
        const list = examples.map((e) => ({
          slug: e.slug,
          title: e.title,
          description: e.description,
          animated: e.animated ?? false,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
        };
      }
    );

    // Tool 4: get_example
    server.tool(
      "get_example",
      "Get the full code and details for a specific ralph-gpu example. Returns the complete shader code and JavaScript/TypeScript implementation.",
      {
        slug: z.string().describe(
          "The example slug (e.g., 'gradient', 'fluid', 'raymarching', 'triangle-particles')"
        ),
      },
      async ({ slug }) => {
        const example = getExampleBySlug(slug);
        if (!example) {
          return {
            content: [{ type: "text", text: \`Example '\${slug}' not found. Use list_examples to see available examples.\` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(example, null, 2) }],
        };
      }
    );

    // Tool 5: search_docs
    server.tool(
      "search_docs",
      "Search ralph-gpu documentation for relevant sections by keyword. Useful for finding specific API methods, concepts, or usage patterns.",
      {
        query: z.string().describe(
          "Search query (e.g., 'compute shader', 'ping pong', 'uniforms', 'blend modes')"
        ),
      },
      async ({ query }) => {
        const results = searchDocs(query);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
    );
  },
  {
    name: "ralph-gpu-docs",
    version: "1.0.0",
  },
  {
    basePath: "/api/mcp",
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

export { handler as GET, handler as POST };
\`\`\`

### Step 3: Create Docs Content Module

Create \`apps/docs/lib/mcp/docs-content.ts\`:

\`\`\`typescript
import { readFileSync } from "fs";
import { join } from "path";

const CURSOR_RULE_PATH = join(process.cwd(), "../../.cursor/rules/ralph-gpu.mdc");
const DOCS_CONTENT_DIR = join(process.cwd(), "lib/mcp/content");

// Returns the comprehensive quickstart guide (same as cursor rule)
export function getQuickstartGuide(): string {
  try {
    const content = readFileSync(CURSOR_RULE_PATH, "utf-8");
    // Remove the frontmatter (---...---)
    const withoutFrontmatter = content.replace(/^---[\\s\\S]*?---\\n/, "");
    return withoutFrontmatter;
  } catch (error) {
    return "Quickstart guide not found. Error: " + String(error);
  }
}

export function getDocContent(topic: string): string {
  const filePath = join(DOCS_CONTENT_DIR, \`\${topic}.md\`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    // Fallback: return a placeholder message
    return \`Documentation for '\${topic}' is being prepared. Please use get_started for comprehensive documentation.\`;
  }
}

export interface SearchResult {
  topic: string;
  section: string;
  content: string;
  relevance: number;
}

export function searchDocs(query: string): SearchResult[] {
  // First, try to get the quickstart guide for searching
  const quickstart = getQuickstartGuide();
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\\s+/);

  // Search within the quickstart guide
  const sections = quickstart.split(/^## /m);
  
  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split("\\n");
    const sectionTitle = lines[0]?.trim() || "Introduction";
    const sectionContent = lines.slice(1).join("\\n").trim();
    const sectionLower = sectionContent.toLowerCase();

    // Calculate relevance score
    let relevance = 0;
    for (const word of queryWords) {
      if (sectionLower.includes(word)) {
        relevance += (sectionLower.match(new RegExp(word, "g")) || []).length;
      }
      if (sectionTitle.toLowerCase().includes(word)) {
        relevance += 5; // Boost for title matches
      }
    }

    if (relevance > 0) {
      results.push({
        topic: "quickstart",
        section: sectionTitle,
        content: sectionContent.slice(0, 500) + (sectionContent.length > 500 ? "..." : ""),
        relevance,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
}
\`\`\`

### Step 4: Create Content Directory
Create the folder \`apps/docs/lib/mcp/content/\` (can be empty for now, the code has fallbacks).

### Step 5: Verify Build
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error message and fix the actual issue
- If stuck on a build error after 2 attempts, call done() with failure summary

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY
3. Do NOT re-read files or take more screenshots after this

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress and what already exists.
Based on what already exists, SKIP completed tasks and proceed to the next incomplete one.
`;

// Verification function
async function checkMcpSetup(): Promise<boolean> {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  const docsPath = path.join(process.cwd(), PROJECT_ROOT, "apps/docs");
  
  try {
    // Check package.json has dependencies
    const pkgJson = JSON.parse(await fs.readFile(path.join(docsPath, "package.json"), "utf-8"));
    if (!pkgJson.dependencies?.["mcp-handler"] || !pkgJson.dependencies?.["zod"]) {
      console.log("❌ Missing mcp-handler or zod in package.json");
      return false;
    }
    
    // Check route exists
    const routePath = path.join(docsPath, "app/api/mcp/[transport]/route.ts");
    await fs.access(routePath);
    
    // Check docs-content exists
    const docsContentPath = path.join(docsPath, "lib/mcp/docs-content.ts");
    await fs.access(docsContentPath);
    
    console.log("✅ All MCP setup files exist");
    return true;
  } catch (error) {
    console.log("❌ Some files missing:", error);
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 20,
      maxCost: 5.0,
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

  console.log("🚀 Starting MCP Server Setup agent...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  // Run verification
  const passed = await checkMcpSetup();
  console.log(`\n${passed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

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
