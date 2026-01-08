import { RalphLoopAgent, iterationCountIs } from 'ralph-loop-agent';
import "dotenv/config";
import { tool } from 'ai';
import { z } from 'zod';

const agent = new RalphLoopAgent({
  model: 'anthropic/claude-3-haiku',
  instructions: `
    You are an agent that test tools
  `,
  stopWhen: iterationCountIs(10),
  onIterationEnd: ({ iteration, result }) => {
    console.log(`Iteration ${iteration}:`);
    console.log(result.text);
  },
  verifyCompletion: ({ result }) => ({
    complete: result.text.includes('<promise>All files updated</promise>'),
  }),
  tools: {
    readFile: {
      description: 'Read a file from disk',
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }: {path: string}) => {
        return path
      }
    },
    someTool: {
      description: 'A helpful tool',
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }: {query: string}) => {
        // your tool logic
        return query;
      },
    }
  },

});

const { text, iterations, completionReason } = await agent.loop({
  prompt: `
    test the tools you have, respond with the tool repsonse content

    once done, write:
    <promise>All files updated</promise>
  `,

});

console.log(text);
console.log(`Completed in ${iterations} iterations`);
console.log(`Reason: ${completionReason}`);