import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAllExamples, getExampleBySlug } from "@/lib/examples";
import { getQuickstartGuide, getDocContent, searchDocs } from "@/lib/mcp/docs-content";

const handler = createMcpHandler(
  (server) => {
    // Tool 1: get_started - comprehensive quickstart guide
    server.registerTool(
      "get_started",
      {
        title: "Get Started Guide",
        description: "Get the comprehensive ralph-gpu quickstart guide. This is the RECOMMENDED first tool to call - it contains all patterns, code examples, API usage, and best practices in a single document. Perfect for LLMs to understand the library quickly.",
        inputSchema: {},
      },
      async () => {
        const content = getQuickstartGuide();
        return {
          content: [{ type: "text", text: content }],
        };
      }
    );

    // Tool 2: get_documentation
    server.registerTool(
      "get_documentation",
      {
        title: "Get Documentation",
        description: "Get ralph-gpu documentation for a specific topic. Returns comprehensive markdown documentation.",
        inputSchema: {
          topic: z.enum(["getting-started", "concepts", "api"]).describe(
            "The documentation topic: 'getting-started' for installation and setup, 'concepts' for core abstractions, 'api' for complete API reference"
          ),
        },
      },
      async ({ topic }) => {
        const content = getDocContent(topic);
        return {
          content: [{ type: "text", text: content }],
        };
      }
    );

    // Tool 3: list_examples
    server.registerTool(
      "list_examples",
      {
        title: "List Examples",
        description: "List all available ralph-gpu examples with their metadata. Use this to discover what examples are available before fetching specific ones.",
        inputSchema: {},
      },
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
    server.registerTool(
      "get_example",
      {
        title: "Get Example",
        description: "Get the full code and details for a specific ralph-gpu example. Returns the complete shader code and JavaScript/TypeScript implementation.",
        inputSchema: {
          slug: z.string().describe(
            "The example slug (e.g., 'gradient', 'fluid', 'raymarching', 'triangle-particles')"
          ),
        },
      },
      async ({ slug }) => {
        const example = getExampleBySlug(slug);
        if (!example) {
          return {
            content: [{ type: "text", text: `Example '${slug}' not found. Use list_examples to see available examples.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(example, null, 2) }],
        };
      }
    );

    // Tool 5: search_docs
    server.registerTool(
      "search_docs",
      {
        title: "Search Documentation",
        description: "Search ralph-gpu documentation for relevant sections by keyword. Useful for finding specific API methods, concepts, or usage patterns.",
        inputSchema: {
          query: z.string().describe(
            "Search query (e.g., 'compute shader', 'ping pong', 'uniforms', 'blend modes')"
          ),
        },
      },
      async ({ query }) => {
        const results = searchDocs(query);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
    );
  },
  {},
  {
    basePath: "/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

export { handler as GET, handler as POST };
