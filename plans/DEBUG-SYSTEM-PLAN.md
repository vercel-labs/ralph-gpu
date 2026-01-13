# ralph-gpu Debug System Implementation Plan

## Overview

This document outlines the implementation plan for adding a comprehensive debugging and profiling system to ralph-gpu. The system consists of two main components:

1. **Event System** - Low-level instrumentation that emits events for GPU operations
2. **Profiler API** - High-level API that consumes events and provides aggregated metrics

## Design Principles

- **Zero overhead by default** - Events are opt-in per type to avoid performance impact
- **Flexible** - Users can build custom tools on top of the event system
- **Non-invasive** - Existing code continues to work without changes
- **Optional GPU timing** - WebGPU timestamp queries require explicit opt-in
- **Export-friendly** - Support multiple export formats (Chrome Trace, Perfetto, JSON)

## Architecture

```
┌─────────────────────────────────────┐
│   User Code (Pass, Compute, etc)   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│   Event Emitter (built into core)   │  ← Emits: draw, compute, shader:compile, etc.
└────────┬───────────────┬────────────┘
         │               │
         ↓               ↓
    ┌─────────┐    ┌──────────────┐
    │ Profiler│    │ Custom Tools │
    └─────────┘    └──────────────┘
```

---

## Event System Design

### Event Types

All events extend a base `GPUEvent` interface:

```typescript
interface GPUEvent {
  type: string;
  timestamp: number; // performance.now()
  id: string; // Unique event ID
}
```

### Supported Event Categories

#### 1. Draw Events

- `draw:start` - Before draw call execution
- `draw:end` - After draw call execution
- `draw` - Complete draw event (alternative to start/end pair)

**Data:**

- source: "pass" | "material" | "particles"
- label?: string
- vertexCount: number
- instanceCount: number
- topology: PrimitiveTopology
- target: "screen" | "texture"
- targetSize: [width, height]

#### 2. Compute Events

- `compute:start` - Before dispatch
- `compute:end` - After dispatch
- `compute` - Complete compute event

**Data:**

- label?: string
- workgroups: [x, y, z]
- workgroupSize: [x, y, z]
- totalInvocations: number

#### 3. Shader Events

- `shader:compile` - Shader compilation
- `shader:error` - Compilation error
- `shader:warning` - Compilation warning

**Data:**

- shaderType: "vertex" | "fragment" | "compute"
- label?: string
- sourceLines: number
- warnings: string[]
- errors: string[]
- compilationTime?: number

#### 4. Memory Events

- `memory:allocate` - Resource allocation
- `memory:free` - Resource deallocation
- `memory:resize` - Resource resize

**Data:**

- resourceType: "buffer" | "texture" | "sampler"
- label?: string
- size: number (bytes)
- usage: string

#### 5. Target Events

- `target:set` - Render target change
- `target:clear` - Clear operation
- `target:resize` - Target resize

**Data:**

- target: "screen" | "texture" | "mrt"
- label?: string
- size: [width, height]
- format?: TextureFormat

#### 6. Pipeline Events

- `pipeline:create` - New pipeline creation
- `pipeline:cache-hit` - Pipeline reused from cache

**Data:**

- pipelineType: "render" | "compute"
- label?: string
- format?: GPUTextureFormat

#### 7. Frame Events

- `frame:start` - Frame begins
- `frame:end` - Frame ends

**Data:**

- frameNumber: number
- deltaTime: number
- time: number

#### 8. GPU Timing Events

- `gpu:timing` - GPU execution time (requires timestamp-query)

**Data:**

- label: string
- gpuTime: number (ms)
- cpuTime: number (ms)

---

## Event System Implementation

### GPUContextOptions Extension

```typescript
export interface GPUContextOptions {
  // ... existing options

  events?: {
    enabled?: boolean; // Enable event system (default: false)
    types?: string[]; // Opt-in event types (e.g., ["draw", "compute"])
    historySize?: number; // Max events to keep (default: 1000)
    enableGPUTiming?: boolean; // Use timestamp queries (default: false, requires feature)
  };
}
```

### EventEmitter Class

Core event management:

- `on(type, listener)` - Subscribe to specific event type
- `off(type, listener)` - Unsubscribe
- `once(type, listener)` - Subscribe once
- `onAll(listener)` - Subscribe to all events
- `emit(event)` - Emit event (internal)
- `getHistory(filter)` - Query event history
- `clearHistory()` - Clear history

**Filtering Strategy:**

- Filter at **emit time** if `types` configured (performance optimization)
- Always check if listeners exist before emitting
- Rolling window for history (circular buffer)

### Integration Points

Events should be emitted from:

1. `Pass.drawInternal()` - draw events
2. `Material.drawInternal()` - draw events
3. `ComputeShader.dispatch()` - compute events
4. `Pass/Material/Compute constructors` - shader:compile events
5. `StorageBuffer/RenderTarget constructors` - memory:allocate events
6. `RenderTarget.resize()` - memory:resize events
7. `GPUContext.setTarget()` - target:set events
8. `GPUContext.clear()` - target:clear events
9. `GPUContext.beginFrame()/endFrame()` - frame events
10. Pipeline creation - pipeline events

---

## Profiler API Design

### Core Features

1. **Manual Region Tracking**

   - `begin(name)` / `end(name)` - Mark regions
   - `measure(name, fn)` - Async wrapper

2. **Automatic Tracking**

   - Automatically tracks all draw/compute events
   - Frame-by-frame profiling

3. **Statistics**

   - Per-region: calls, total/min/max/avg time, CPU/GPU time
   - Per-frame: duration, draw calls, compute dispatches, triangles
   - Aggregated summaries

4. **Export**
   - Chrome Trace format (`.json`)
   - Perfetto format (`.json`)
   - Custom JSON format

### Profiler Class API

```typescript
class Profiler {
  constructor(
    ctx: GPUContext,
    options?: {
      maxFrameHistory?: number;
      autoTrackFrames?: boolean;
    }
  );

  // Manual tracking
  begin(name: string): void;
  end(name: string): void;
  measure<T>(name: string, fn: () => T | Promise<T>): Promise<T>;

  // Query results
  getRegion(name: string): ProfilerRegion | undefined;
  getResults(): Map<string, ProfilerRegion>;
  getSummary(): ProfilerSummary;

  // Frame profiling
  getFrameProfile(frameNumber: number): FrameProfile | undefined;
  getLastFrames(count: number): FrameProfile[];
  getAverageFrameTime(frames?: number): number;

  // Export
  exportChromeTrace(): string;
  exportPerfetto(): string;
  exportJSON(): string;

  // Control
  reset(): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}
```

### Data Structures

```typescript
interface ProfilerRegion {
  name: string;
  calls: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  averageTime: number;
  lastTime: number;
  cpuTime: number;
  gpuTime?: number;
  events: RalphGPUEvent[];
}

interface FrameProfile {
  frameNumber: number;
  timestamp: number;
  duration: number;
  regions: Map<string, RegionSummary>;
  drawCalls: number;
  computeDispatches: number;
  triangles: number;
  shaderCompilations: number;
}
```

---

## Implementation Checklist

**Note:** This checklist can be modified as implementation progresses based on new findings, technical constraints, or better approaches discovered during development.

### Phase 1: Core Event System

- [ ] **1.1** Create `events.ts` file with all event type definitions

  - [ ] Define base `GPUEvent` interface
  - [ ] Define all event type interfaces (Draw, Compute, Shader, Memory, Target, Pipeline, Frame, GPUTiming)
  - [ ] Export union type `RalphGPUEvent`

- [ ] **1.2** Create `event-emitter.ts` with EventEmitter class

  - [ ] Implement listener management (Map<string, Set<Listener>>)
  - [ ] Implement `on()`, `off()`, `once()`, `onAll()` methods
  - [ ] Implement `emit()` with type filtering (check `options.events.types`)
  - [ ] Implement rolling window event history (circular buffer or array slice)
  - [ ] Implement `getHistory()` with filtering (type, since, limit)
  - [ ] Implement `clearHistory()`

- [ ] **1.3** Extend `GPUContextOptions` in `types.ts`

  - [ ] Add `events` object with enabled, types, historySize, enableGPUTiming

- [ ] **1.4** Integrate EventEmitter into GPUContext (`context.ts`)

  - [ ] Add private `eventEmitter` field
  - [ ] Initialize in constructor based on `options.events.enabled`
  - [ ] Add public API methods: `on()`, `off()`, `once()`, `onAll()`, `getEventHistory()`
  - [ ] Add private `emitEvent()` helper with type checking
  - [ ] Dispose event emitter in `dispose()`

- [ ] **1.5** Add GPU timestamp query support (optional feature)
  - [ ] Check for `timestamp-query` feature in constructor
  - [ ] Create `GPUQuerySet` and resolve buffer if enabled
  - [ ] Helper methods for timestamp recording
  - [ ] Calculate GPU time from timestamp results

### Phase 2: Emit Events from Core Classes

- [ ] **2.1** Emit frame events from GPUContext

  - [ ] Emit `frame:start` in `beginFrame()`
  - [ ] Emit `frame:end` in `endFrame()`

- [ ] **2.2** Emit draw events from Pass (`pass.ts`)

  - [ ] Emit `draw:start` at beginning of `drawInternal()`
  - [ ] Emit `draw:end` at end of `drawInternal()`
  - [ ] Include vertex count (6 for fullscreen quad), instance count (1), topology, target info

- [ ] **2.3** Emit draw events from Material (`material.ts`)

  - [ ] Emit `draw:start` / `draw:end` in `drawInternal()`
  - [ ] Include vertexCount, instanceCount, topology from options

- [ ] **2.4** Emit draw events from Particles (`particles.ts`)

  - [ ] Emit `draw:start` / `draw:end` in particle draw
  - [ ] Include particle count as instances

- [ ] **2.5** Emit compute events from ComputeShader (`compute.ts`)

  - [ ] Emit `compute:start` / `compute:end` in `dispatch()`
  - [ ] Include workgroup dimensions and total invocations

- [ ] **2.6** Emit shader compilation events

  - [ ] In Pass constructor - emit `shader:compile` for fragment shader
  - [ ] In Material constructor - emit `shader:compile` for vertex + fragment
  - [ ] In ComputeShader constructor - emit `shader:compile`
  - [ ] Capture compilation warnings/errors from `getCompilationInfo()`
  - [ ] Include source line count

- [ ] **2.7** Emit memory events from StorageBuffer (`storage.ts`)

  - [ ] Emit `memory:allocate` in constructor
  - [ ] Emit `memory:free` in `dispose()`

- [ ] **2.8** Emit memory events from RenderTarget (`target.ts`)

  - [ ] Emit `memory:allocate` in constructor
  - [ ] Emit `memory:resize` in `resize()`
  - [ ] Emit `memory:free` in `dispose()`

- [ ] **2.9** Emit target events from GPUContext

  - [ ] Emit `target:set` in `setTarget()`
  - [ ] Emit `target:clear` in `clear()`

- [ ] **2.10** Emit pipeline events
  - [ ] In Pass: emit `pipeline:create` or `pipeline:cache-hit` in `getPipeline()`
  - [ ] In Material: emit `pipeline:create` or `pipeline:cache-hit` in `getPipeline()`
  - [ ] In ComputeShader: emit when pipeline created

### Phase 3: Profiler Implementation

- [ ] **3.1** Create `profiler.ts` with Profiler class

  - [ ] Constructor: subscribe to ctx events
  - [ ] Implement `begin()` / `end()` for manual regions
  - [ ] Implement `measure()` async wrapper
  - [ ] Track active regions (Map<name, startTime>)

- [ ] **3.2** Implement region statistics

  - [ ] Create `ProfilerRegion` data structure
  - [ ] Update stats on `end()`: calls, min/max/avg/total time
  - [ ] Store events that occurred during region

- [ ] **3.3** Implement frame profiling

  - [ ] Listen to `frame:start` / `frame:end` events
  - [ ] Build `FrameProfile` from events between frame boundaries
  - [ ] Calculate draw calls, compute dispatches, triangles
  - [ ] Store frame history (configurable size)

- [ ] **3.4** Implement query methods

  - [ ] `getRegion(name)` - return single region stats
  - [ ] `getResults()` - return all regions
  - [ ] `getSummary()` - aggregated stats sorted by time
  - [ ] `getFrameProfile(frameNumber)`
  - [ ] `getLastFrames(count)`
  - [ ] `getAverageFrameTime(frames)`

- [ ] **3.5** Implement export methods

  - [ ] `exportChromeTrace()` - Chrome Tracing JSON format
  - [ ] `exportPerfetto()` - Perfetto JSON format
  - [ ] `exportJSON()` - Custom format with all data

- [ ] **3.6** Implement control methods
  - [ ] `reset()` - clear all stats and history
  - [ ] `setEnabled(enabled)` - pause/resume profiling
  - [ ] `dispose()` - unsubscribe from events, cleanup

### Phase 4: Testing & Documentation

- [ ] **4.1** Create example usage file

  - [ ] Basic event listening example
  - [ ] Profiler usage example
  - [ ] Custom tool building example
  - [ ] Export formats example

- [ ] **4.2** Add TypeScript tests

  - [ ] Test event emission and filtering
  - [ ] Test profiler region tracking
  - [ ] Test frame profiling
  - [ ] Test export formats

- [ ] **4.3** Update documentation

  - [ ] Add "Debugging & Profiling" section to ralph-gpu.mdc
  - [ ] Document event types and data structures
  - [ ] Document Profiler API
  - [ ] Add usage examples

- [ ] **4.4** Create real-world example
  - [ ] Add example to `/apps/examples`
  - [ ] Show profiler UI with live stats
  - [ ] Demonstrate export to Chrome Tracing

### Phase 5: Export to Core Package

- [ ] **5.1** Update `index.ts` exports

  - [ ] Export event types
  - [ ] Export Profiler class
  - [ ] Update package exports

- [ ] **5.2** Verify bundle size impact
  - [ ] Check that events add minimal overhead when disabled
  - [ ] Ensure tree-shaking works for unused features

---

## Technical Considerations

### Performance

1. **Event filtering** - Only emit events that have listeners (check before creating event object)
2. **History management** - Use circular buffer or periodic cleanup to avoid memory growth
3. **GPU timing overhead** - Timestamp queries have minimal overhead but require feature flag
4. **Object creation** - Pool event objects if emission frequency is very high

### WebGPU Timestamp Queries

- Requires `timestamp-query` feature flag
- Not all devices support it (graceful fallback to CPU timing)
- Two timestamps needed per region (start + end)
- Results are async (need to resolve query set to buffer)
- Resolution: nanoseconds (convert to milliseconds for API)

### Browser DevTools Integration

- Chrome Tracing format allows viewing in `chrome://tracing`
- Perfetto format for advanced analysis at `ui.perfetto.dev`
- Consider adding custom DevTools panel in future

### Memory Management

- Default history size: 1000 events
- Circular buffer prevents unbounded growth
- Users can configure via `options.events.historySize`
- Profiler stores aggregated stats (compact)

---

## Future Enhancements

These are not part of the initial implementation but could be added later:

1. **Real-time debug UI** - Built-in stats panel (Option 5 from initial planning)
2. **Shader hot-reload** - Detect shader changes and recompile
3. **Visual pipeline inspector** - Show bind groups, layouts, resources
4. **Memory leak detection** - Track undisposed resources
5. **Performance recommendations** - Suggest optimizations based on patterns
6. **Network integration** - Send events to remote profiling service
7. **Recording/playback** - Capture and replay frame sequences

---

## API Preview

### Basic Usage

```typescript
import { gpu, Profiler } from "ralph-gpu";

// Enable events with specific types
const ctx = await gpu.init(canvas, {
  events: {
    enabled: true,
    types: ["draw", "compute", "frame:end"], // Opt-in only what you need
    historySize: 2000,
    enableGPUTiming: true, // If device supports it
  },
});

// Listen to events
ctx.on("draw", (event) => {
  console.log(
    `Draw: ${event.vertexCount} verts, ${event.instanceCount} instances`
  );
});

// Use profiler
const profiler = new Profiler(ctx, {
  maxFrameHistory: 120, // Keep last 2 seconds at 60fps
  autoTrackFrames: true,
});

function render() {
  profiler.begin("physics");
  computeShader.dispatch(1024);
  profiler.end("physics");

  profiler.begin("particles");
  particles.draw();
  profiler.end("particles");

  requestAnimationFrame(render);
}

// Check stats
setInterval(() => {
  const avgFrame = profiler.getAverageFrameTime(60);
  console.log(
    `Average frame time: ${avgFrame.toFixed(2)}ms (${(1000 / avgFrame).toFixed(
      1
    )} FPS)`
  );

  const summary = profiler.getSummary();
  summary.regions.forEach((region) => {
    console.log(`${region.name}: ${region.averageTime.toFixed(2)}ms`);
  });
}, 1000);

// Export for analysis
const trace = profiler.exportChromeTrace();
// Save to file or send to server
```

---

## Questions & Decisions Log

As implementation progresses, document decisions and rationale here:

### Q1: Should we emit both start/end events AND complete events?

**Decision:** TBD during implementation. Options:

- Only start/end (more flexible, can measure duration)
- Only complete (simpler, less event spam)
- Both (most flexible but more overhead)

### Q2: How to handle GPU timing results (async)?

**Decision:** TBD. Options:

- Emit separate `gpu:timing` event when results ready
- Attach to original draw/compute event (delayed)
- Store in separate map that profiler can query

### Q3: Should Profiler be part of core or separate package?

**Decision:** Part of core for now. Can split later if bundle size is concern.

### Q4: Event type filtering - string array or enum?

**Decision:** String array for flexibility. Users can use constants if they want type safety.

---

## Success Criteria

✅ **Must Have:**

- Events can be enabled per-type with minimal overhead
- Profiler provides accurate CPU timing
- Can export to Chrome Tracing format
- Zero performance impact when events disabled
- Clear documentation and examples

🎯 **Nice to Have:**

- GPU timestamp support on compatible devices
- Multiple export formats
- Frame-by-frame analysis
- Real-world example in examples app

---

**Last Updated:** 2026-01-13  
**Status:** Planning Complete - Ready for Implementation
