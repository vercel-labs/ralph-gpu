'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function LinesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storageCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        // SDF Line rendering via fragment shader
        // This is the most reliable way to draw lines in WebGPU
        const lines = ctx.pass(/* wgsl */ `
          // Distance from point p to line segment a-b
          fn sdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
            let pa = p - a;
            let ba = b - a;
            let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h);
          }

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let p = uv * 2.0 - 1.0;
            let aspect = globals.resolution.x / globals.resolution.y;
            let p_aspect = vec2f(p.x * aspect, p.y);
            
            var color = vec3f(0.0);
            let lineWidth = 0.015;
            let t = globals.time;
            
            // Line 1: Animated horizontal line (cyan)
            let y1 = sin(t * 2.0) * 0.3 + 0.4;
            let d1 = sdSegment(p_aspect, vec2f(-0.8, y1), vec2f(0.8, y1 + 0.1));
            let line1 = smoothstep(lineWidth, lineWidth * 0.5, d1);
            color = mix(color, vec3f(0.2, 0.8, 1.0), line1);
            
            // Line 2: Diagonal animated (orange)
            let a2 = vec2f(-0.6, -0.2 + sin(t * 1.5) * 0.1);
            let b2 = vec2f(0.6, 0.3 + sin(t * 1.5 + 1.0) * 0.1);
            let d2 = sdSegment(p_aspect, a2, b2);
            let line2 = smoothstep(lineWidth, lineWidth * 0.5, d2);
            color = mix(color, vec3f(1.0, 0.5, 0.2), line2);
            
            // Line 3: Animated wave (green)
            let waveY = sin(p.x * 6.28 + t * 3.0) * 0.15 - 0.5;
            let d3 = abs(p.y - waveY);
            let line3 = smoothstep(lineWidth, lineWidth * 0.5, d3);
            color = mix(color, vec3f(0.3, 1.0, 0.5), line3);
            
            // Circle (magenta)
            let circleCenter = vec2f(0.5, 0.0);
            let circleRadius = 0.2;
            let dCircle = abs(length(p_aspect - circleCenter) - circleRadius);
            let circle = smoothstep(lineWidth, lineWidth * 0.5, dCircle);
            color = mix(color, vec3f(1.0, 0.3, 0.8), circle);
            
            // Spiral (yellow)
            let spiralCenter = vec2f(-0.5, -0.3);
            let sp = p_aspect - spiralCenter;
            let angle = atan2(sp.y, sp.x);
            let radius = length(sp);
            let spiralLine = abs(radius - (angle + 3.14159) * 0.05 - fract(t * 0.2) * 0.3);
            let spiral = smoothstep(lineWidth * 0.7, lineWidth * 0.3, spiralLine);
            color = mix(color, vec3f(1.0, 0.9, 0.3), spiral * step(radius, 0.35));
            
            return vec4f(color, 1.0);
          }
        `);

        function frame() {
          if (disposed) return;
          lines.draw();
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
      if (animationId) cancelAnimationFrame(animationId);
      if (ctx) ctx.dispose();
    };
  }, []);

  // Second effect for storage buffer lines
  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;

    async function init() {
      if (!storageCanvasRef.current) return;

      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        ctx = await gpu.init(storageCanvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        // Storage buffer line rendering with vertex shader
        // Using line-list topology with positions stored in a storage buffer
        const numLines = 20;
        const numVertices = numLines * 2; // 2 vertices per line
        
        // Store line positions (start and end points)
        // Each vertex is vec2f (x, y)
        const linePositions = ctx.storage(numVertices * 2 * 4); // numVertices * vec2f * sizeof(f32)
        
        // Initialize line positions
        const positions = new Float32Array(numVertices * 2);
        for (let i = 0; i < numLines; i++) {
          const t = i / numLines;
          // Start point
          positions[i * 4 + 0] = -0.8 + t * 1.6; // x
          positions[i * 4 + 1] = Math.sin(t * Math.PI * 2) * 0.3; // y
          // End point
          positions[i * 4 + 2] = -0.8 + t * 1.6; // x
          positions[i * 4 + 3] = Math.sin(t * Math.PI * 2) * 0.3 + 0.3; // y
        }
        linePositions.write(positions);

        // Create line material using line-list topology
        const linesMaterial = ctx.material(/* wgsl */ `
          @group(1) @binding(0) var<storage, read> positions: array<vec2f>;
          
          struct VertexOutput {
            @builtin(position) pos: vec4f,
            @location(0) color: vec3f,
          }
          
          @vertex
          fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
            var out: VertexOutput;
            let t = globals.time;
            let lineIdx = vid / 2u;
            let isEnd = vid % 2u;
            
            // Animate positions
            var p = positions[vid];
            p.y += sin(t * 2.0 + f32(lineIdx) * 0.5) * 0.2;
            
            out.pos = vec4f(p, 0.0, 1.0);
            
            // Color based on line index
            let hue = f32(lineIdx) / 20.0;
            out.color = vec3f(
              sin(hue * 6.28) * 0.5 + 0.5,
              sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
              sin(hue * 6.28 + 4.18) * 0.5 + 0.5
            );
            return out;
          }
          
          @fragment
          fn fs_main(in: VertexOutput) -> @location(0) vec4f {
            return vec4f(in.color, 1.0);
          }
        `, {
          topology: 'line-list',
          vertexCount: numVertices,
        });
        linesMaterial.storage('positions', linePositions);

        function frame() {
          if (disposed) return;
          ctx!.clear();
          linesMaterial.draw();
          animationId = requestAnimationFrame(frame);
        }

        frame();
      } catch (error) {
        console.error('Failed to initialize storage buffer lines:', error);
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationId) cancelAnimationFrame(animationId);
      if (ctx) ctx.dispose();
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: 'auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Line Rendering</h1>
      
      {/* SDF Lines Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>SDF Lines (Fragment Shader)</h2>
        <p style={{ marginBottom: '1rem', color: '#888' }}>
          Lines rendered using Signed Distance Functions in a fragment shader.
          This is the most reliable approach for visible, anti-aliased lines in WebGPU.
        </p>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '400px',
            border: '1px solid #333',
            display: 'block',
            background: '#000',
          }}
          width={1000}
          height={400}
        />
        <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
          <p><strong>Cyan:</strong> Animated horizontal line</p>
          <p><strong>Orange:</strong> Animated diagonal line</p>
          <p><strong>Green:</strong> Sine wave</p>
          <p><strong>Magenta:</strong> Circle outline</p>
          <p><strong>Yellow:</strong> Animated spiral</p>
        </div>
      </section>

      {/* Storage Buffer Lines Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Storage Buffer Lines (Vertex Shader)</h2>
        <p style={{ marginBottom: '1rem', color: '#888' }}>
          Lines using <code style={{ color: '#0af' }}>line-list</code> topology with positions 
          stored in a storage buffer. Note: Native WebGPU lines are 1-pixel wide.
        </p>
        <canvas
          ref={storageCanvasRef}
          style={{
            width: '100%',
            height: '400px',
            border: '1px solid #333',
            display: 'block',
            background: '#000',
          }}
          width={1000}
          height={400}
        />
        <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
          <p><strong>Rainbow lines:</strong> 20 animated vertical lines using storage buffer</p>
          <p><strong>Animation:</strong> Sine wave animation in vertex shader using globals.time</p>
        </div>
      </section>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>Note on Line Rendering in WebGPU</h3>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          WebGPU&apos;s native <code style={{ color: '#0af' }}>line-list</code> and{' '}
          <code style={{ color: '#0af' }}>line-strip</code> topologies only render 1-pixel wide lines,
          which are nearly invisible on high-DPI displays. For creative coding, use either:
        </p>
        <ul style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>SDF lines in fragment shaders (shown above) - best for anti-aliased lines</li>
          <li>Quad-based lines with instanced rendering - best for many dynamic lines</li>
          <li>Storage buffer lines (shown above) - useful for data-driven line positions</li>
        </ul>
      </div>
    </div>
  );
}
