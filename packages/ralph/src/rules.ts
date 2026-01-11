/**
 * Default rules for shaping agent behavior.
 * These are injected into the system prompt after the task.
 */

/**
 * Teaches the agent to use a .brain/ directory structure for persistent knowledge.
 */
export const brainRule = `
## Brain Structure

Use a \`.brain/\` directory for persistent knowledge about the project.

### First Time Setup
If \`.brain/\` doesn't exist, create it:
\`\`\`bash
mkdir -p .brain
\`\`\`

Then create \`.brain/index.md\` with an overview of what you've learned.

### Reading
- Check if \`.brain/index.md\` exists first
- If it exists, read it to understand what's documented
- Each folder has an \`index.md\` describing its contents

### Writing  
- Create or update \`.brain/\` when you learn something important
- Keep entries concise (1-2 paragraphs max)
- Create subfolders if a topic grows large

### Structure
\`\`\`
.brain/
  index.md           # Overview of what's documented
  conventions.md     # Code style, patterns
  architecture.md    # High-level design
  decisions/         # Why things are the way they are
    index.md
    001-decision.md
\`\`\`

### When to Update
- After exploring a new codebase
- After making significant changes
- When discovering important patterns or gotchas
`;

/**
 * Instructs the agent to track its progress in a .progress.md file.
 */
export const trackProgressRule = `
## Progress Tracking

Maintain a \`.progress.md\` file to track your work:

1. Create \`.progress.md\` at the start if it doesn't exist
2. Update it after each significant step
3. Include: what you've done, what's next, blockers

### Format
\`\`\`markdown
# Progress

## Completed
- [x] Step 1 description
- [x] Step 2 description

## In Progress
- [ ] Current step

## Next
- [ ] Upcoming step

## Blockers
- Any issues encountered
\`\`\`

This helps with:
- Resuming interrupted work
- Understanding agent behavior
- Debugging stuck states
`;

/**
 * Instructs the agent to visually verify UI changes before completing.
 */
export const visualCheckRule = `
## Visual Verification

For any UI changes, verify visually before marking done:

1. Start the dev server: \`startProcess({ name: 'dev', command: 'pnpm dev', readyPattern: 'Ready' })\`
2. Open browser: \`openBrowser({ url: 'http://localhost:3000' })\`
3. Check the screenshot for correctness
4. Look for console errors in the response
5. Test interactions if relevant

Never mark UI tasks complete without visual verification.
`;

/**
 * Instructs the agent to run tests before and after changes.
 */
export const testFirstRule = `
## Test-Driven Workflow

1. Run tests first to understand current state: \`bash({ command: 'pnpm test' })\`
2. Make changes
3. Run tests again to verify nothing broke
4. Only mark done when tests pass
`;

/**
 * Encourages surgical, focused changes.
 */
export const minimalChangesRule = `
## Minimal Changes

- Change only what's necessary for the task
- Don't refactor unrelated code
- Don't "improve" things that aren't part of the task
- Prefer editing over rewriting entire files
- Small, focused commits
`;

/**
 * For tasks requiring codebase exploration first.
 */
export const explorationRule = `
## Explore First

Before making changes:
1. List files to understand structure: \`bash({ command: 'find . -type f -name "*.ts" | head -20' })\`
2. Read key files to understand patterns
3. Search for related code: \`bash({ command: 'grep -r "keyword" src/' })\`
4. Form a plan before editing
`;

/**
 * Encourages git commits as checkpoints.
 */
export const gitCheckpointRule = `
## Git Checkpoints

Commit after each logical change:
\`bash({ command: 'git add -A && git commit -m "description"' })\`

This creates recovery points if something goes wrong.
Before marking done, ensure all changes are committed.
`;

/**
 * For debugging tasks.
 */
export const debugRule = `
## Debugging Approach

1. Reproduce the issue first
2. Add logging to understand state
3. Form a hypothesis
4. Make a minimal fix
5. Verify the fix
6. Remove debug logging
7. Test that nothing else broke
`;
