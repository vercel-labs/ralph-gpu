'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function ParticlesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
          autoResize: true, // Automatically handles canvas sizing and resize
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        // Grid parameters
        const gridX = 40;
        const gridY = 20;
        const particleCount = gridX * gridY;

        // Create particle system using the new ctx.particles() helper
        // Each particle: pos (vec2f), size (f32), hue (f32) = 16 bytes
        const particles = ctx.particles(particleCount, {
          shader: /* wgsl */ `
            struct Particle {
              pos: vec2f,
              size: f32,
              hue: f32,
            }

            @group(1) @binding(0) var<storage, read> particles: array<Particle>;

            struct VertexOutput {
              @builtin(position) position: vec4f,
              @location(0) uv: vec2f,
              @location(1) hue: f32,
            }

            @vertex
            fn vs_main(
              @builtin(instance_index) iid: u32,
              @builtin(vertex_index) vid: u32
            ) -> VertexOutput {
              let p = particles[iid];
              
              // Get quad position (-0.5 to 0.5) and scale by particle size
              let quadPos = quadOffset(vid) * p.size;
              
              // Add subtle wave animation
              let wave = sin(globals.time * 2.0 + p.hue * 6.28) * 0.02;
              
              // Correct for aspect ratio
              let aspectCorrectedPos = vec2f(quadPos.x / globals.aspect, quadPos.y);
              
              var out: VertexOutput;
              out.position = vec4f(p.pos.x + aspectCorrectedPos.x, p.pos.y + aspectCorrectedPos.y + wave, 0.0, 1.0);
              out.uv = quadUV(vid);
              out.hue = p.hue;
              return out;
            }

            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
              // Circle SDF - centered UV (0 to 1 -> -0.5 to 0.5)
              let d = length(in.uv - 0.5);
              
              // Discard pixels outside the circle
              if (d > 0.5) {
                discard;
              }
              
              // Smooth edge
              let alpha = 1.0 - smoothstep(0.4, 0.5, d);
              
              // Rainbow color based on hue
              let hue = in.hue;
              let color = vec3f(
                0.5 + 0.5 * sin(hue * 6.28 + 0.0),
                0.5 + 0.5 * sin(hue * 6.28 + 2.09),
                0.5 + 0.5 * sin(hue * 6.28 + 4.19)
              );
              
              return vec4f(color, alpha);
            }
          `,
          bufferSize: particleCount * 16,
          blend: "alpha",
        });

        // Initialize particle data
        const initialData = new Float32Array(particleCount * 4);
        for (let y = 0; y < gridY; y++) {
          for (let x = 0; x < gridX; x++) {
            const i = (y * gridX + x) * 4;
            // Position: -0.8 to 0.8 range
            initialData[i + 0] = ((x + 0.5) / gridX) * 1.6 - 0.8; // x position
            initialData[i + 1] = ((y + 0.5) / gridY) * 1.6 - 0.8; // y position
            // Size: varies based on position
            initialData[i + 2] = 0.03 + 0.02 * Math.sin(x * 0.5) * Math.cos(y * 0.5);
            // Hue: gradient based on position
            initialData[i + 3] = (x + y) / (gridX + gridY);
          }
        }
        particles.write(initialData);

        function frame() {
          if (disposed) return;
          
          particles.draw();
          
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
      if (ctx) {
        ctx.dispose(); // ResizeObserver cleanup handled internally
      }
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>Instanced Particles</h1>
      <p style={{ marginBottom: '1rem' }}>
        A grid of colorful circles using the <code>ctx.particles()</code> helper.
        Each particle is an instanced quad with variable size, rendered as circles using SDF.
      </p>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '400px',
          border: '1px solid #333',
          display: 'block',
          backgroundColor: '#000'
        }}
      />
    </div>
  );
}
