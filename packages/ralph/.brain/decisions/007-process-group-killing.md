# 007: Process Group Killing for Cleanup

## Status

Accepted

## Context

When the agent completes an iteration (e.g., calls `done()`), it should clean up all spawned processes. However, processes started via `startProcess` tool (like dev servers on localhost:3000) were not being killed properly.

The issue: when spawning processes with `shell: true`, the actual command runs as a **child of a shell process**. For example, `npm run dev` spawns:

```
shell (bash/zsh)
  └── npm
      └── node (actual server listening on port)
```

Sending `SIGTERM` to just the shell process doesn't kill the grandchild process that's actually bound to the port.

## Decision

Use **process groups** to ensure all descendant processes are killed:

1. Spawn processes with `detached: true` - this creates a new process group with the spawned process as the leader
2. Store the process group ID (PGID), which equals the PID when using `detached: true`
3. Kill the entire process group using `process.kill(-pgid, "SIGTERM")` - the negative PID targets all processes in the group

## Implementation

In `managers/process.ts`:

```typescript
// When starting:
child = spawn(command, [], {
  shell: true,
  detached: true, // Creates new process group
  // ...
});

// Store PGID (same as PID when detached)
pgid: child.pid!;

// When stopping:
process.kill(-pgid, "SIGTERM"); // Kill entire process group
```

## Consequences

### Positive

- Dev servers, watch processes, and other long-running commands are properly terminated
- Ports are freed when the agent completes
- No zombie processes left behind

### Negative

- Slightly more complex cleanup logic
- Need to handle cases where process group is already dead

## Testing

Created `ralphs/05-test-cleanup/` which:

1. Starts an HTTP server on port 3333
2. Completes the task
3. Verifies port is freed after agent cleanup

Test passes - port is properly cleaned up.
