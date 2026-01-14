import { CodeBlock } from '@/components/CodeBlock';

const enableEventsCode = `import { gpu } from "ralph-gpu";

const ctx = await gpu.init(canvas, {
  events: {
    enabled: true,
    types: ['draw', 'compute', 'frame', 'memory'], // Optional filter
    historySize: 1000,  // Event history buffer size
  },
});`;

const basicProfilerCode = `import { Profiler } from "ralph-gpu";

// Create profiler attached to context
const profiler = new Profiler(ctx, {
  maxFrameHistory: 120,
  autoTrackFrames: true,
});

// In your render loop
function animate() {
  profiler.tick();  // Track frame timing for FPS
  
  // Profile specific regions
  profiler.begin('physics');
  updatePhysics();
  profiler.end('physics');
  
  profiler.begin('render');
  myPass.draw();
  profiler.end('render');
  
  // Get stats
  const fps = profiler.getFPS();
  console.log(\`FPS: \${fps.toFixed(1)}\`);
  
  requestAnimationFrame(animate);
}

// Cleanup when done
profiler.dispose();`;

const profilerApiCode = `// FPS tracking (use with pass.draw() API)
profiler.tick()                        // Call once per animation frame
profiler.getFPS(sampleCount?)          // Get averaged FPS (default: 60 samples)

// Region profiling - measure specific code sections
profiler.begin(name)                   // Start timing a region
profiler.end(name)                     // End timing a region
profiler.getRegion(name)               // Get stats for a specific region
profiler.getResults()                  // Get all region stats as Map

// Frame statistics
profiler.getFrameStats()               // Get overall frame time statistics
profiler.getLastFrames(count)          // Get last N frame profiles
profiler.getAverageFrameTime(frames?)  // Average frame interval (for FPS)
profiler.getAverageRenderTime(frames?) // Average GPU work duration

// Control
profiler.setEnabled(enabled)           // Enable/disable profiling
profiler.isEnabled()                   // Check if profiling is enabled
profiler.reset()                       // Clear all collected data
profiler.dispose()                     // Cleanup and unsubscribe from events`;

const regionStatsCode = `interface ProfilerRegion {
  name: string;        // Region name
  calls: number;       // Total number of calls
  totalTime: number;   // Total time in ms
  minTime: number;     // Minimum time in ms
  maxTime: number;     // Maximum time in ms
  averageTime: number; // Average time in ms
  lastTime: number;    // Most recent time in ms
}

// Example usage
profiler.begin('particles');
particleSystem.update();
particleSystem.draw();
profiler.end('particles');

const stats = profiler.getRegion('particles');
console.log(\`Particles: \${stats?.averageTime.toFixed(2)}ms avg\`);`;

const frameStatsCode = `interface FrameStats {
  frameCount: number;   // Total frames tracked
  totalTime: number;    // Total time in ms
  minTime: number;      // Fastest frame in ms
  maxTime: number;      // Slowest frame in ms
  averageTime: number;  // Average frame time in ms
  lastTime: number;     // Most recent frame time in ms
}

const stats = profiler.getFrameStats();
console.log(\`
  Frames: \${stats.frameCount}
  Avg: \${stats.averageTime.toFixed(2)}ms
  Min: \${stats.minTime.toFixed(2)}ms
  Max: \${stats.maxTime.toFixed(2)}ms
\`);`;

const eventListenersCode = `// Subscribe to specific event type
const unsubscribe = ctx.on('draw', (event) => {
  console.log(\`Draw: \${event.source}, vertices: \${event.vertexCount}\`);
});

// Subscribe to all events
const unsubAll = ctx.onAll((event) => {
  console.log(\`[\${event.type}]\`, event);
});

// One-time listener
ctx.once('shader_compile', (event) => {
  console.log('Shader compiled:', event.label);
});

// Get event history
const drawEvents = ctx.getEventHistory(['draw']);
const allEvents = ctx.getEventHistory();

// Unsubscribe when done
unsubscribe();
unsubAll();`;

const eventTypesCode = `// Draw event - emitted at start and end of each draw call
interface DrawEvent {
  type: "draw";
  phase: "start" | "end";  // Distinguish start vs end
  source: "pass" | "material" | "particles";
  label?: string;
  vertexCount?: number;
  instanceCount?: number;
  topology?: GPUPrimitiveTopology;
  target: "screen" | "texture";
  targetSize: [number, number];
}

// Compute event - emitted at start and end of each dispatch
interface ComputeEvent {
  type: "compute";
  phase: "start" | "end";  // Distinguish start vs end
  label?: string;
  workgroups?: [number, number, number];
  workgroupSize?: [number, number, number];
  totalInvocations?: number;
}

// Frame event - emitted at frame boundaries
interface FrameEvent {
  type: "frame";
  phase: "start" | "end";
  frameNumber: number;
  deltaTime: number;  // Time since last frame in ms
  time: number;       // Total elapsed time in ms
}

// Memory event - buffer/texture allocation
interface MemoryEvent {
  type: "memory";
  resourceType: "buffer" | "texture" | "sampler";
  action: "allocate" | "free" | "resize";
  label?: string;
  size?: number;  // in bytes
}

// Other events: shader_compile, target, pipeline, gpu_timing`;

const fullExampleCode = `"use client";

import { useEffect, useRef, useState } from "react";
import { gpu, GPUContext, Profiler } from "ralph-gpu";

export default function ProfilerDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);
  const [regions, setRegions] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let profiler: Profiler | null = null;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;

      ctx = await gpu.init(canvasRef.current, {
        events: { enabled: true, historySize: 100 },
      });

      if (disposed) {
        ctx.dispose();
        return;
      }

      profiler = new Profiler(ctx, { maxFrameHistory: 120 });

      // Create some passes to profile
      const background = ctx.pass(\`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return vec4f(uv * 0.3, 0.1, 1.0);
        }
      \`);

      const effect = ctx.pass(\`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          let d = length(uv - 0.5);
          let pulse = sin(globals.time * 3.0) * 0.1 + 0.2;
          if (d < pulse) {
            return vec4f(1.0, 1.0, 1.0, 0.5);
          }
          discard;
        }
      \`, { blend: 'alpha' });

      let lastUpdate = 0;

      function frame() {
        if (disposed || !profiler) return;

        profiler.tick();

        profiler.begin('background');
        background.draw();
        profiler.end('background');

        profiler.begin('effect');
        effect.draw();
        profiler.end('effect');

        // Update UI every 100ms
        const now = performance.now();
        if (now - lastUpdate > 100) {
          lastUpdate = now;
          setFps(profiler.getFPS());
          setRegions(new Map(profiler.getResults()));
        }

        animationId = requestAnimationFrame(frame);
      }

      frame();
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      profiler?.dispose();
      ctx?.dispose();
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width={800} height={400} />
      <div>
        <p>FPS: {fps.toFixed(1)}</p>
        {Array.from(regions.entries()).map(([name, stats]) => (
          <p key={name}>
            {name}: {stats.averageTime.toFixed(2)}ms
          </p>
        ))}
      </div>
    </div>
  );
}`;

export default function ProfilerPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
        Profiler & Debug System
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        Built-in performance monitoring and event system for debugging GPU operations.
      </p>

      {/* Table of Contents */}
      <nav className="mb-12 p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Contents</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          <li><a href="#enabling" className="text-primary-400 hover:text-primary-300">Enabling Events</a></li>
          <li><a href="#profiler" className="text-primary-400 hover:text-primary-300">Using the Profiler</a></li>
          <li><a href="#regions" className="text-primary-400 hover:text-primary-300">Region Profiling</a></li>
          <li><a href="#frame-stats" className="text-primary-400 hover:text-primary-300">Frame Statistics</a></li>
          <li><a href="#events" className="text-primary-400 hover:text-primary-300">Event Listeners</a></li>
          <li><a href="#event-types" className="text-primary-400 hover:text-primary-300">Event Types</a></li>
          <li><a href="#example" className="text-primary-400 hover:text-primary-300">Full Example</a></li>
        </ul>
      </nav>

      {/* Enabling Events */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="enabling">
          Enabling Events
        </h2>
        <p className="text-gray-300 mb-4">
          Enable the event system when initializing the GPU context. You can optionally filter which event types to track.
        </p>
        <CodeBlock code={enableEventsCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="font-semibold text-gray-100 mb-2">Event Options</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• <code>enabled</code> — Enable/disable event emission</li>
            <li>• <code>types</code> — Array of event types to track (omit for all)</li>
            <li>• <code>historySize</code> — Max events to keep in history (default: 1000)</li>
          </ul>
        </div>
      </section>

      {/* Using the Profiler */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="profiler">
          Using the Profiler
        </h2>
        <p className="text-gray-300 mb-4">
          The Profiler class provides a high-level API for tracking performance. It automatically subscribes to context events.
        </p>
        <CodeBlock code={basicProfilerCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Profiler API</h3>
        <CodeBlock code={profilerApiCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-200">
          <strong>Important:</strong> Call <code>profiler.tick()</code> once per animation frame for accurate FPS tracking. 
          This works with the regular <code>pass.draw()</code> API — no need to change your rendering code.
        </div>
      </section>

      {/* Region Profiling */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="regions">
          Region Profiling
        </h2>
        <p className="text-gray-300 mb-4">
          Use <code>begin()</code> and <code>end()</code> to measure specific code sections.
        </p>
        <CodeBlock code={regionStatsCode} language="typescript" />

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-gray-100 mb-2">Best Practices</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Use descriptive region names</li>
              <li>• Always pair begin/end calls</li>
              <li>• Nest regions for hierarchical timing</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-gray-100 mb-2">Common Regions</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <code>physics</code> — Simulation updates</li>
              <li>• <code>render</code> — Drawing passes</li>
              <li>• <code>postprocess</code> — Effects</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Frame Statistics */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="frame-stats">
          Frame Statistics
        </h2>
        <p className="text-gray-300 mb-4">
          Get aggregated statistics about frame timing.
        </p>
        <CodeBlock code={frameStatsCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="font-semibold text-gray-100 mb-2">Frame Time vs Render Time</h4>
          <p className="text-gray-400 text-sm">
            <strong>Frame time</strong> is the interval between frames (includes vsync wait). 
            <strong>Render time</strong> is just the GPU work duration.
            Use <code>getAverageFrameTime()</code> for FPS calculations and <code>getAverageRenderTime()</code> to measure GPU load.
          </p>
        </div>
      </section>

      {/* Event Listeners */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="events">
          Event Listeners
        </h2>
        <p className="text-gray-300 mb-4">
          Subscribe to GPU events directly on the context for custom debugging or visualization.
        </p>
        <CodeBlock code={eventListenersCode} language="typescript" />
      </section>

      {/* Event Types */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="event-types">
          Event Types
        </h2>
        <p className="text-gray-300 mb-4">
          Available event types and their data structures.
        </p>
        <CodeBlock code={eventTypesCode} language="typescript" />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-4 text-gray-100">Event Type</th>
                <th className="text-left py-2 px-4 text-gray-100">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>draw</code></td>
                <td className="py-2 px-4">Draw call (pass, material, particles)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>compute</code></td>
                <td className="py-2 px-4">Compute shader dispatch</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>frame</code></td>
                <td className="py-2 px-4">Frame start/end with timing</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>shader_compile</code></td>
                <td className="py-2 px-4">Shader compilation</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>memory</code></td>
                <td className="py-2 px-4">Buffer/texture allocate/free/resize</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>target</code></td>
                <td className="py-2 px-4">Render target set/clear</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4"><code>pipeline</code></td>
                <td className="py-2 px-4">Pipeline creation (with cache hit info)</td>
              </tr>
              <tr>
                <td className="py-2 px-4"><code>gpu_timing</code></td>
                <td className="py-2 px-4">GPU timing queries (when available)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Full Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="example">
          Full Example
        </h2>
        <p className="text-gray-300 mb-4">
          A complete React component demonstrating the profiler with live FPS and region stats.
        </p>
        <CodeBlock code={fullExampleCode} language="typescript" />
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/examples"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">Examples →</h3>
            <p className="text-gray-400 text-sm">
              See live demos including the debug profiler example.
            </p>
          </a>
          <a
            href="/api"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">API Reference →</h3>
            <p className="text-gray-400 text-sm">
              Complete documentation of all ralph-gpu methods.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
