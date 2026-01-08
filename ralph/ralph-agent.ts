import { RalphLoopAgent, iterationCountIs } from 'ralph-loop-agent';
import "dotenv/config";

const agent = new RalphLoopAgent({
  model: 'anthropic/claude-opus-4.5',
  instructions: 'You are a helpful coding assistant.',
  stopWhen: iterationCountIs(10),
  onIterationEnd: ({ iteration, result }) => {
    console.log(`Iteration ${iteration}:`);
    console.log(result.text);
  },
  verifyCompletion: async ({ result }) => ({
    complete: result.text.includes('DONE'),
    reason: 'Task completed successfully',
  }),
});

const { text, iterations, completionReason } = await agent.loop({
  prompt: 'Create a function that calculates fibonacci numbers',

});

console.log(text);
console.log(`Completed in ${iterations} iterations`);
console.log(`Reason: ${completionReason}`);