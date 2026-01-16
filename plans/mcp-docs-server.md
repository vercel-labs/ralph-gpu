---
name: MCP Server for Docs
overview: Add an MCP (Model Context Protocol) server to the docs app at /api/mcp route using Vercel's mcp-handler adapter, plus a /mcp-server documentation page with "Add to Cursor" button.
todos:
  - id: install-deps
    content: Install mcp-handler and zod in docs app
    status: completed
  - id: create-route
    content: Create /api/mcp/[transport]/route.ts with Vercel MCP handler
    status: completed
  - id: implement-tools
    content: Implement 5 MCP tools (get_started, get_documentation, list_examples, get_example, search_docs)
    status: completed
  - id: create-docs-content
    content: Create markdown content files for documentation
    status: pending
  - id: create-mcp-page
    content: Create /mcp-server page with setup instructions and "Add to Cursor" button
    status: completed
  - id: add-nav-link
    content: Add MCP Server link to the docs navigation
    status: completed
  - id: test-integration
    content: Test MCP server and deeplink with Cursor client
    status: completed
---

## Progress Log

### 2026-01-16: Starting Implementation

- Reviewed docs app structure at `apps/docs/`
- Examples registry already exists at `lib/examples/index.ts` with `getAllExamples()` and `getExampleBySlug()`
- Navigation component at `components/Navigation.tsx` - will add MCP Server link
- Cursor rule for get_started tool at `.cursor/rules/ralph-gpu.mdc` (~1600 lines)
- Starting ralph 67 for Phase 1 (deps + route + docs-content)

### Ralph 67 Completed - Phase 1 Done

- Installed `mcp-handler` v1.0.7 and `zod` v3.25.76
- Created MCP route at `app/api/mcp/[transport]/route.ts`
- Created docs-content module at `lib/mcp/docs-content.ts`
- All 5 MCP tools implemented:
  - `get_started` - Returns cursor rule content
  - `get_documentation` - Returns topic-specific docs
  - `list_examples` - Returns example metadata
  - `get_example` - Returns full example code
  - `search_docs` - Searches documentation
- Build passes successfully
- Starting ralph 68 for MCP documentation page

### Ralph 68 Completed - Phase 2 Done

- Created `/mcp-server` page at `app/mcp-server/page.tsx`
- Page includes:
  - Hero section with "Add to Cursor" deeplink button
  - What is MCP explanation
  - All 5 tools documented with descriptions
  - Manual setup instructions with code blocks
  - How it works section
  - Next steps links
- Added "MCP Server" link to Navigation in Reference section
- Page visually verified - renders correctly
- All tasks complete, testing MCP integration next

### MCP Server Integration Tested - Complete

- Fixed route to use correct `registerTool` API (not `tool`)
- Added proper options: `basePath: "/api/mcp"`, `maxDuration`, `verboseLogs`
- Verified endpoint responds at `/api/mcp/mcp`
- Tested `initialize` method - server info returned
- Tested `tools/list` - all 5 tools registered
- Tested `list_examples` - returns all 10 examples with metadata
- MCP server ready for production deployment

# MCP Server for ralph-gpu Documentation

## Goal

Create an MCP server at `/api/mcp` in the docs app using **Vercel's mcp-handler** that allows LLMs to:

1. **Get started guide** - Get a comprehensive quickstart guide (same as cursor rule) with all patterns and examples
2. **Get documentation** - Access getting started guide, core concepts, and API reference
3. **List examples** - Get a list of all available examples with metadata
4. **Get example code** - Retrieve the full code for any specific example
5. **Search documentation** - Find relevant documentation sections by keyword

This enables LLMs to understand ralph-gpu's API and generate accurate code.

## Target App

**`apps/docs/`** - The ralph-gpu documentation site

## Technology Choice: Vercel MCP Adapter

Using `mcp-handler` (Vercel's MCP adapter) instead of raw MCP SDK because:

- **Simplified setup** - Single handler function, no manual transport management
- **Next.js native** - Built specifically for Next.js App Router
- **Auto transport** - Handles both SSE and Streamable HTTP automatically
- **Zod validation** - Built-in schema validation with Zod
- **Production ready** - Battle-tested on Vercel infrastructure

## Current Resources

### Documentation Pages

| Page            | Path               | Content                                                          |
| --------------- | ------------------ | ---------------------------------------------------------------- |
| Getting Started | `/getting-started` | Installation, browser support, basic setup, React integration    |
| Core Concepts   | `/concepts`        | ctx, pass, material, target, pingPong, compute, storage, sampler |
| API Reference   | `/api`             | Complete method documentation for all classes                    |
| Profiler        | `/profiler`        | Debug profiler documentation                                     |

### Examples Registry (`lib/examples/`)

| Example            | Slug                 | Description                    |
| ------------------ | -------------------- | ------------------------------ |
| Gradient           | `gradient`           | Basic UV-to-color mapping      |
| Wave               | `wave`               | Animated sine wave pattern     |
| Color Cycle        | `color-cycle`        | HSL color cycling              |
| Raymarching        | `raymarching`        | 3D raymarched scene            |
| Noise              | `noise`              | Perlin noise visualization     |
| Metaballs          | `metaballs`          | Organic blob shapes            |
| Fractal            | `fractal`            | Mandelbrot set                 |
| Alien Planet       | `alien-planet`       | Complex terrain rendering      |
| Fluid              | `fluid`              | Fluid simulation               |
| Triangle Particles | `triangle-particles` | Particle system with triangles |

## Implementation Plan

### Phase 1: Install Dependencies

```bash
cd apps/docs
pnpm add mcp-handler zod
```

### Phase 2: Create MCP Route Handler

Create `app/api/mcp/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAllExamples, getExampleBySlug } from "@/lib/examples";
import {
  getQuickstartGuide,
  getDocContent,
  searchDocs,
} from "@/lib/mcp/docs-content";

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Get started - comprehensive quickstart guide
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

    // Tool 2: Get documentation
    server.tool(
      "get_documentation",
      "Get ralph-gpu documentation for a specific topic. Returns comprehensive markdown documentation.",
      {
        topic: z
          .enum(["getting-started", "concepts", "api"])
          .describe(
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

    // Tool 3: List all examples
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
          executable: e.executable ?? false,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
        };
      }
    );

    // Tool 4: Get specific example
    server.tool(
      "get_example",
      "Get the full code and details for a specific ralph-gpu example. Returns the complete shader code and JavaScript/TypeScript implementation.",
      {
        slug: z
          .string()
          .describe(
            "The example slug (e.g., 'gradient', 'fluid', 'raymarching', 'triangle-particles')"
          ),
      },
      async ({ slug }) => {
        const example = getExampleBySlug(slug);
        if (!example) {
          return {
            content: [
              {
                type: "text",
                text: `Example '${slug}' not found. Use list_examples to see available examples.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(example, null, 2) }],
        };
      }
    );

    // Tool 5: Search documentation
    server.tool(
      "search_docs",
      "Search ralph-gpu documentation for relevant sections by keyword. Useful for finding specific API methods, concepts, or usage patterns.",
      {
        query: z
          .string()
          .describe(
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
```

### Phase 3: Create Documentation Content

Create `lib/mcp/docs-content.ts`:

```typescript
import { readFileSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(process.cwd(), "lib/mcp/content");
const CURSOR_RULE_PATH = join(
  process.cwd(),
  "../../.cursor/rules/ralph-gpu.mdc"
);

// Returns the comprehensive quickstart guide (same as cursor rule)
// This is the best starting point for LLMs to understand the library
export function getQuickstartGuide(): string {
  try {
    const content = readFileSync(CURSOR_RULE_PATH, "utf-8");
    // Remove the frontmatter (---...---)
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, "");
    return withoutFrontmatter;
  } catch {
    return "Quickstart guide not found.";
  }
}

export function getDocContent(topic: string): string {
  const filePath = join(DOCS_DIR, `${topic}.md`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return `Documentation for '${topic}' not found.`;
  }
}

export interface SearchResult {
  topic: string;
  section: string;
  content: string;
  relevance: number;
}

export function searchDocs(query: string): SearchResult[] {
  const topics = ["getting-started", "concepts", "api"];
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  for (const topic of topics) {
    const content = getDocContent(topic);
    const sections = content.split(/^## /m);

    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.split("\n");
      const sectionTitle = lines[0]?.trim() || "Introduction";
      const sectionContent = lines.slice(1).join("\n").trim();
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
          topic,
          section: sectionTitle,
          content:
            sectionContent.slice(0, 500) +
            (sectionContent.length > 500 ? "..." : ""),
          relevance,
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}
```

### Phase 4: Create Markdown Content Files

Create documentation markdown files in `lib/mcp/content/`:

#### `lib/mcp/content/getting-started.md`

Extract content from the Getting Started page into clean markdown.

#### `lib/mcp/content/concepts.md`

Extract content from the Core Concepts page into clean markdown.

#### `lib/mcp/content/api.md`

Extract content from the API Reference page into clean markdown.

### Phase 5: Create MCP Server Documentation Page

Create `app/mcp-server/page.tsx` - a documentation page explaining the MCP server with an "Add to Cursor" button.

**Design Requirements:**

- Follow the existing Vercel/Geist-style design system used throughout the docs
- Use the same color palette: `gray-1` to `gray-12`, `blue-9` for accents
- Use existing components: `CodeBlock`, `Callout`
- Section-based layout with `h2` headings (same as `/getting-started`, `/concepts`)
- Cards with `bg-gray-1 border border-gray-4 rounded-lg`
- Text colors: `text-gray-12` for headings, `text-gray-11` for body, `text-gray-9` for secondary

**Page Structure:**

```tsx
// app/mcp-server/page.tsx
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/mdx/Callout";

// Generate the Cursor deeplink URL
const MCP_CONFIG = {
  url: "https://ralph-gpu.vercel.app/api/mcp/mcp",
};
const CONFIG_BASE64 = Buffer.from(JSON.stringify(MCP_CONFIG)).toString(
  "base64"
);
const CURSOR_DEEPLINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=ralph-gpu-docs&config=${CONFIG_BASE64}`;

const manualConfigCode = `{
  "mcpServers": {
    "ralph-gpu-docs": {
      "url": "https://ralph-gpu.vercel.app/api/mcp/mcp"
    }
  }
}`;

const localConfigCode = `{
  "mcpServers": {
    "ralph-gpu-docs": {
      "url": "http://localhost:3001/api/mcp/mcp"
    }
  }
}`;

export default function McpServerPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-12 mb-4">
        MCP Server
      </h1>
      <p className="text-xl text-gray-10 mb-8">
        Connect your AI assistant to ralph-gpu documentation using the Model
        Context Protocol.
      </p>

      {/* Hero: Add to Cursor Button */}
      <section className="mb-12">
        <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <h2 className="text-xl font-semibold text-gray-12 mb-3">
            One-Click Setup for Cursor
          </h2>
          <p className="text-gray-11 mb-4">
            Add the ralph-gpu MCP server to Cursor instantly. Your AI assistant
            will gain access to all documentation, examples, and API references.
          </p>
          <a
            href={CURSOR_DEEPLINK}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Add to Cursor
          </a>
        </div>
      </section>

      {/* What is MCP */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-12 mb-4">
          What is MCP?
        </h2>
        <p className="text-gray-11 mb-4">
          The Model Context Protocol (MCP) is an open standard that allows AI
          assistants to access external tools and data sources. With the
          ralph-gpu MCP server, your AI can:
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <h3 className="font-semibold text-gray-12 mb-2">
              📚 Access Documentation
            </h3>
            <p className="text-gray-9 text-sm">
              Get complete API reference, concepts, and getting started guides.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <h3 className="font-semibold text-gray-12 mb-2">
              💡 Browse Examples
            </h3>
            <p className="text-gray-9 text-sm">
              List and retrieve full code for all shader examples.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <h3 className="font-semibold text-gray-12 mb-2">
              🔍 Search Content
            </h3>
            <p className="text-gray-9 text-sm">
              Find specific topics across all documentation.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <h3 className="font-semibold text-gray-12 mb-2">
              🚀 Quick Start Guide
            </h3>
            <p className="text-gray-9 text-sm">
              Get a comprehensive guide with all patterns and best practices.
            </p>
          </div>
        </div>
      </section>

      {/* Available Tools */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-12 mb-4">
          Available Tools
        </h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <code className="text-blue-9 font-mono text-sm">get_started</code>
            <p className="text-gray-9 text-sm mt-1">
              Returns the comprehensive quickstart guide (~1600 lines) with all
              patterns, code examples, and best practices.{" "}
              <strong className="text-gray-11">Recommended first call.</strong>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <code className="text-blue-9 font-mono text-sm">
              get_documentation
            </code>
            <span className="text-gray-10 text-sm ml-2">
              topic: "getting-started" | "concepts" | "api"
            </span>
            <p className="text-gray-9 text-sm mt-1">
              Get full documentation for a specific topic.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <code className="text-blue-9 font-mono text-sm">list_examples</code>
            <p className="text-gray-9 text-sm mt-1">
              List all available examples with slug, title, and description.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <code className="text-blue-9 font-mono text-sm">get_example</code>
            <span className="text-gray-10 text-sm ml-2">slug: string</span>
            <p className="text-gray-9 text-sm mt-1">
              Get full code and shader for a specific example.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-1 border border-gray-4">
            <code className="text-blue-9 font-mono text-sm">search_docs</code>
            <span className="text-gray-10 text-sm ml-2">query: string</span>
            <p className="text-gray-9 text-sm mt-1">
              Search documentation for relevant sections by keyword.
            </p>
          </div>
        </div>
      </section>

      {/* Manual Setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-12 mb-4">
          Manual Setup
        </h2>
        <p className="text-gray-11 mb-4">
          If you prefer manual configuration, add the following to your{" "}
          <code className="bg-gray-2 px-1.5 py-0.5 rounded text-sm">
            .cursor/mcp.json
          </code>{" "}
          file:
        </p>
        <CodeBlock
          code={manualConfigCode}
          language="json"
          filename=".cursor/mcp.json"
        />

        <Callout type="tip">
          For local development, use the local URL instead:
        </Callout>
        <CodeBlock code={localConfigCode} language="json" />
      </section>

      {/* How it Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-12 mb-4">
          How It Works
        </h2>
        <p className="text-gray-11 mb-4">
          When you ask your AI assistant about ralph-gpu, it can now call the
          MCP server to fetch relevant information:
        </p>
        <div className="p-4 rounded-lg bg-gray-1 border border-gray-4 font-mono text-sm">
          <div className="text-gray-10">
            You: "Create a particle system with ralph-gpu"
          </div>
          <div className="text-gray-9 mt-2">
            AI: <span className="text-blue-9">[calls get_started]</span>
          </div>
          <div className="text-gray-9">
            AI:{" "}
            <span className="text-blue-9">[receives comprehensive guide]</span>
          </div>
          <div className="text-gray-10 mt-2">
            AI: "Here's how to create a particle system with ralph-gpu..."
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-12 mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/getting-started"
            className="p-4 rounded-lg bg-gray-1 border border-gray-4 hover:border-gray-5 transition-colors"
          >
            <h3 className="font-semibold text-gray-12 mb-2">
              Getting Started →
            </h3>
            <p className="text-gray-9 text-sm">
              Learn the basics of ralph-gpu.
            </p>
          </a>
          <a
            href="/examples"
            className="p-4 rounded-lg bg-gray-1 border border-gray-4 hover:border-gray-5 transition-colors"
          >
            <h3 className="font-semibold text-gray-12 mb-2">Examples →</h3>
            <p className="text-gray-9 text-sm">See ralph-gpu in action.</p>
          </a>
        </div>
      </section>
    </div>
  );
}
```

### Phase 6: Add Navigation Link

Update `components/Navigation.tsx` to include the MCP Server link in the navigation menu:

```tsx
// Add to the navigation items array
{ href: '/mcp-server', label: 'MCP Server' }
```

## File Structure

```
apps/docs/
├── app/
│   ├── api/
│   │   └── mcp/
│   │       └── [transport]/
│   │           └── route.ts       # Vercel MCP handler
│   └── mcp-server/
│       └── page.tsx               # MCP Server docs page with "Add to Cursor" button
├── components/
│   └── Navigation.tsx             # Add MCP Server nav link
├── lib/
│   ├── examples/                   # (existing)
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── *.ts (examples)
│   └── mcp/
│       ├── docs-content.ts        # Content loading & search
│       └── content/
│           ├── getting-started.md
│           ├── concepts.md
│           └── api.md
└── package.json                   # Add mcp-handler, zod
```

## Tools Summary

| Tool                | Description                                                                   | Input                                             | Output                                   |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| `get_started`       | **RECOMMENDED FIRST CALL** - Comprehensive quickstart guide with all patterns | None                                              | Full markdown guide (~1600 lines)        |
| `get_documentation` | Get full docs for a topic                                                     | `topic: "getting-started" \| "concepts" \| "api"` | Markdown content                         |
| `list_examples`     | List all examples                                                             | None                                              | JSON array of {slug, title, description} |
| `get_example`       | Get example details                                                           | `slug: string`                                    | Full example object with code            |
| `search_docs`       | Search documentation                                                          | `query: string`                                   | Array of matching sections               |

## Usage Example

Once implemented, an LLM could use the MCP server like this:

### Quick Start (Recommended)

```
Human: Write a particle system using ralph-gpu

LLM: [calls get_started]
     → Returns: Complete quickstart guide with all patterns, code examples,
                particle systems, compute shaders, uniforms, etc.

"Based on the ralph-gpu guide, here's a particle system implementation..."
```

### Detailed Research

```
Human: Write a fluid simulation shader using ralph-gpu

LLM: [calls get_started to understand the library]
     → Returns: Full quickstart guide

LLM: [calls list_examples to see available examples]
     → Returns: [{slug: "fluid", title: "Fluid Simulation", ...}, ...]

LLM: [calls get_example with slug="fluid"]
     → Returns: Full fluid example with ping-pong buffers, advection shader, etc.

"Based on the fluid example in ralph-gpu, here's how you can create a fluid simulation..."
```

The `get_started` tool is the recommended first call - it contains the same comprehensive guide used by Cursor's AI, covering:

- All core concepts (pass, material, target, compute, storage, etc.)
- Complete code patterns with React integration
- Particle systems with instanced quads
- Compute shaders with texture sampling
- Ping-pong buffers for simulations
- WGSL alignment requirements and gotchas
- Best practices and common patterns

## Dependencies

- `mcp-handler` - Vercel's MCP adapter for Next.js
- `zod` - Schema validation (likely already in project, but ensure v3+)

## Cursor Deeplink Format

The "Add to Cursor" button uses Cursor's deeplink protocol:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_ENCODED_CONFIG
```

For ralph-gpu-docs:

- **Name:** `ralph-gpu-docs`
- **Config:** `{ "url": "https://ralph-gpu.vercel.app/api/mcp/mcp" }`
- **Base64 Config:** `eyJ1cmwiOiJodHRwczovL3JhbHBoLWdwdS52ZXJjZWwuYXBwL2FwaS9tY3AvbWNwIn0=`

Full deeplink:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=ralph-gpu-docs&config=eyJ1cmwiOiJodHRwczovL3JhbHBoLWdwdS52ZXJjZWwuYXBwL2FwaS9tY3AvbWNwIn0=
```

Reference: [Cursor MCP Install Links](https://cursor.com/docs/context/mcp/install-links)

## Success Criteria

1. MCP endpoint responds at `/api/mcp/mcp` (Streamable HTTP) and `/api/mcp/sse` (SSE)
2. All 5 tools return accurate, useful information
3. `get_started` returns the full cursor rule content (~1600 lines)
4. Works with Cursor as MCP client
5. `/mcp-server` page renders with Vercel-style design
6. "Add to Cursor" deeplink button works correctly
7. Documentation content is complete and well-formatted
8. Examples include full code with proper syntax

## Open Questions

1. **Authentication**: Should the MCP endpoint require authentication?

   - Recommendation: Start without auth for public docs, add later if needed

2. **Rate limiting**: Should we rate limit MCP requests?

   - Recommendation: Basic rate limiting via Vercel's built-in features

3. **Redis**: Do we need Redis for SSE resumability?
   - Recommendation: No, start simple with Streamable HTTP only

## References

- [Vercel MCP Adapter (mcp-handler)](https://github.com/vercel/mcp-handler)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Building Efficient MCP Servers](https://vercel.com/blog/building-efficient-mcp-servers)
- [Cursor MCP Install Links](https://cursor.com/docs/context/mcp/install-links)
