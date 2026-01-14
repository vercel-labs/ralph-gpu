'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext, Profiler, RalphGPUEvent, FrameStats, ProfilerRegion } from 'ralph-gpu';

interface StatsDisplay {
  fps: number;
  frameTime: FrameStats | null;
  regions: ProfilerRegion[];
  eventCount: number;
  drawCalls: number;
  computeDispatches: number;
}

export default function DebugProfilerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<StatsDisplay>({
    fps: 0,
    frameTime: null,
    regions: [],
    eventCount: 0,
    drawCalls: 0,
    computeDispatches: 0,
  });
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let profiler: Profiler | null = null;
    let disposed = false;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        // Check WebGPU support
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        // Initialize context with events enabled
        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
          events: {
            enabled: true,
            types: ['draw', 'compute', 'frame', 'shader_compile', 'pipeline'],
            historySize: 1000,
          },
        });

        // Check if we were disposed during async init
        if (disposed) {
          ctx.dispose();
          return;
        }

        // Subscribe to events and log them
        let eventCounter = 0;
        ctx.onAll((event: RalphGPUEvent) => {
          eventCounter++;
          const logEntry = `[${event.type}] ${formatEvent(event)}`;
          
          // Update event log (keep last 10)
          setEventLog(prev => [...prev.slice(-9), logEntry]);
        });

        // Create profiler instance
        profiler = new Profiler(ctx, {
          maxFrameHistory: 120,
          autoTrackFrames: true,
        });

        // Create passes for demonstration
        const gradientPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let color1 = vec3f(0.1, 0.2, 0.4);
            let color2 = vec3f(0.8, 0.4, 0.2);
            let t = sin(globals.time * 0.5) * 0.5 + 0.5;
            let color = mix(color1, color2, uv.x * t + uv.y * (1.0 - t));
            return vec4f(color, 1.0);
          }
        `);

        const overlayPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let center = vec2f(0.5, 0.5);
            let d = distance(uv, center);
            let pulse = sin(globals.time * 3.0) * 0.1 + 0.3;
            if (d < pulse) {
              return vec4f(1.0, 1.0, 1.0, 0.3);
            }
            return vec4f(0.0, 0.0, 0.0, 0.0);
          }
        `, { blend: 'alpha' });

        let lastStatsUpdate = 0;

        function frame() {
          if (disposed || !profiler || !ctx) return;

          // Track frame timing - call once per animation frame
          profiler.tick();

          // Profile the gradient pass (using normal pass.draw() API!)
          profiler.begin('gradient');
          gradientPass.draw();
          profiler.end('gradient');

          // Profile the overlay pass  
          profiler.begin('overlay');
          overlayPass.draw();
          profiler.end('overlay');

          // Update stats display periodically (every 100ms)
          const now = performance.now();
          if (now - lastStatsUpdate > 100) {
            lastStatsUpdate = now;
            
            const frameStats = profiler.getFrameStats();
            const fps = profiler.getFPS();
            
            const regions = Array.from(profiler.getResults().values());
            const lastFrames = profiler.getLastFrames(1);
            const lastFrame = lastFrames[0];

            setStats({
              fps,
              frameTime: frameStats,
              regions,
              eventCount: ctx?.getEventHistory().length ?? 0,
              drawCalls: profiler.getDrawCallsPerTick(),
              computeDispatches: profiler.getComputeDispatchesPerTick(),
            });
          }

          animationId = requestAnimationFrame(frame);
        }
        
        frame();
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (profiler) {
        profiler.dispose();
      }
      if (ctx) {
        ctx.dispose();
      }
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh', backgroundColor: '#1a1a1a', color: '#fff' }}>
      <h1 style={{ marginBottom: '1rem' }}>Debug & Profiler Example</h1>
      
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
        {/* Canvas */}
        <div style={{ flex: 1 }}>
          <canvas 
            ref={canvasRef}
            style={{ 
              width: '100%', 
              height: '300px',
              border: '1px solid #444',
              display: 'block'
            }}
            width={800}
            height={300}
          />
        </div>

        {/* Stats Panel */}
        <div style={{ 
          width: '300px', 
          backgroundColor: '#2a2a2a', 
          padding: '1rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <h3 style={{ marginTop: 0, color: '#4a9eff' }}>Performance Stats</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#88ff88', fontSize: '24px', fontWeight: 'bold' }}>
              {stats.fps.toFixed(1)} FPS
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Frame Time:</strong>
            {stats.frameTime && (
              <div style={{ marginLeft: '1rem', color: '#ccc' }}>
                <div>Avg: {stats.frameTime.averageTime.toFixed(2)}ms</div>
                <div>Min: {stats.frameTime.minTime === Infinity ? '-' : stats.frameTime.minTime.toFixed(2)}ms</div>
                <div>Max: {stats.frameTime.maxTime.toFixed(2)}ms</div>
                <div>Last: {stats.frameTime.lastTime.toFixed(2)}ms</div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Per-Frame:</strong>
            <div style={{ marginLeft: '1rem', color: '#ccc' }}>
              <div>Draw Calls: {stats.drawCalls}</div>
              <div>Compute: {stats.computeDispatches}</div>
              <div>Events: {stats.eventCount}</div>
            </div>
          </div>

          <div>
            <strong>Custom Regions:</strong>
            {stats.regions.map(region => (
              <div key={region.name} style={{ marginLeft: '1rem', color: '#ccc' }}>
                <div style={{ color: '#ffaa44' }}>{region.name}:</div>
                <div style={{ marginLeft: '1rem' }}>
                  Calls: {region.calls} | Avg: {region.averageTime.toFixed(3)}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        padding: '1rem',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0, color: '#4a9eff' }}>Event Log (last 10)</h3>
        {eventLog.length === 0 ? (
          <div style={{ color: '#666' }}>Waiting for events...</div>
        ) : (
          eventLog.map((log, i) => (
            <div key={i} style={{ color: '#aaa', marginBottom: '2px' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Format an event for display
 */
function formatEvent(event: RalphGPUEvent): string {
  switch (event.type) {
    case 'draw':
      return `phase=${event.phase} source=${event.source} target=${event.target} verts=${event.vertexCount ?? '?'}`;
    case 'compute':
      return `phase=${event.phase} workgroups=${event.workgroups?.join('x') ?? '?'}`;
    case 'frame':
      return `#${event.frameNumber} phase=${event.phase} dt=${event.deltaTime.toFixed(2)}ms`;
    case 'shader_compile':
      return `type=${event.shaderType} label=${event.label ?? 'unnamed'}`;
    case 'pipeline':
      return `type=${event.pipelineType} cached=${event.cacheHit}`;
    default:
      return JSON.stringify(event).slice(0, 50);
  }
}
