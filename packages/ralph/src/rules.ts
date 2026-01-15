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

### CRITICAL: Respect completed items
- If a task is marked \`[x]\` complete, DO NOT redo it
- If ALL tasks are \`[x]\` complete, call \`done()\` after one final verification
- Do NOT keep re-reading and re-verifying completed work

### When to call done():
If \`.progress.md\` shows ALL items complete → verify once → call done()
`;

/**
 * Instructs the agent to visually verify UI changes before completing.
 */
export const visualCheckRule = `
## Visual Verification

For any UI changes, verify visually before marking done:

1. Start the dev server: \`startProcess({ name: 'dev', command: 'pnpm dev', readyPattern: 'Ready' })\`
2. Open browser in HEADLESS mode: \`openBrowser({ url: 'http://localhost:3000' })\`
   - NEVER set headless: false unless the task explicitly requires it
3. Check the screenshot for correctness
4. Look for console errors in the response

### What counts as "verified":
- Screenshot shows the expected UI elements rendered correctly
- No console errors related to the component
- The main visual output is correct

### What does NOT need to be verified in headless mode:
- Keyboard shortcuts (unreliable in headless Playwright with complex editors)
- Hover states and animations
- Complex user interactions

If the screenshot shows the UI working and there are no errors, that is SUFFICIENT verification.
Do NOT keep re-verifying or writing custom Playwright scripts to test interactions.

### After ONE successful visual verification:
- Call \`done()\` immediately
- Do NOT take more screenshots of the same thing
- Do NOT re-read files you just verified
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

/**
 * Prevents spawning multiple dev servers and manages processes efficiently.
 */
export const processManagementRule = `
## Process Management

### Before starting a dev server:
1. Check if one is already running: \`listProcesses()\`
2. If a process named 'dev' exists, REUSE it - do NOT start another
3. Only start a new process if none exists

### Avoid common mistakes:
- ❌ Starting \`pnpm dev\` every iteration (spawns multiple servers on different ports)
- ❌ Not checking existing processes before starting new ones
- ❌ Creating orphan processes that keep running

### Correct pattern:
\`\`\`
// First, check what's running
listProcesses()

// Only start if not already running
if (no 'dev' process exists) {
  startProcess({ name: 'dev', command: 'pnpm dev' })
}

// Reuse the existing process's output
getProcessOutput({ name: 'dev' })
\`\`\`

### Port conflicts indicate multiple servers:
If you see "Port 3000 in use, trying 3001", you've spawned multiple servers.
Use \`listProcesses()\` and reuse existing processes instead.
`;

/**
 * CRITICAL: Ensures the agent knows when and how to stop.
 * This rule prevents infinite iteration loops.
 */
export const completionRule = `
## CRITICAL: Task Completion

**You MUST call the \`done\` tool when the task is complete. Do NOT keep iterating.**

### STOP SIGNAL: Check .progress.md
If \`.progress.md\` shows ALL tasks marked as \`[x]\` complete:
1. Do ONE final verification (if not already done this iteration)
2. Call \`done()\` IMMEDIATELY
3. Do NOT start another iteration

### When to call done():
1. All acceptance criteria in the task are met
2. The build/tests pass (if applicable)  
3. Visual verification passed (screenshot looks correct, no console errors)
4. \`.progress.md\` shows all items complete

### How to call done():
\`\`\`
done({ summary: "Brief description of what was accomplished" })
\`\`\`

### CRITICAL: Avoid Re-Verification Loops
Once something is verified, it stays verified. Do NOT:
- ❌ Re-read files you just wrote or verified
- ❌ Take multiple screenshots of the same page
- ❌ Re-run the same verification scripts
- ❌ Start a new dev server when one is already running
- ❌ Write custom Playwright scripts to test interactions in headless mode
- ❌ Keep iterating after visual verification shows the UI working

### Signs you should call done() NOW:
- \`.progress.md\` shows all \`[x]\` checkboxes complete
- Screenshot shows the expected UI
- No console errors
- You've already verified this same thing in a previous iteration

### Common anti-patterns (STOP if you're doing these):
- Starting iteration by reading the same files as last iteration
- Running \`pnpm dev\` when it's already running (check with listProcesses first)
- Taking screenshot → seeing it works → NOT calling done → repeating

### If you've verified something once, trust that verification:
1. First verification passes → Call done()
2. Do NOT verify again "just to be sure"
3. Do NOT write verification scripts after visual verification passed

**The goal is to complete the task efficiently. Once criteria are met, STOP.**
`;
