'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function ComputePage() {
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
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        // Create storage buffer for particle data
        const particleCount = 1000;
        const particleBuffer = ctx.storage(particleCount * 8 * 4); // 8 floats per particle

        // Initialize particle data
        const initialData = new Float32Array(particleCount * 8);
        for (let i = 0; i < particleCount; i++) {
          const offset = i * 8;
          // Position (x, y)
          initialData[offset] = (Math.random() - 0.5) * 1.8;
          initialData[offset + 1] = (Math.random() - 0.5) * 1.8;
          // Velocity (x, y)
          initialData[offset + 2] = (Math.random() - 0.5) * 0.02;
          initialData[offset + 3] = (Math.random() - 0.5) * 0.02;
          // Life, age, size, unused
          initialData[offset + 4] = 1.0;
          initialData[offset + 5] = 0.0;
          initialData[offset + 6] = 0.025; // Size in clip space (2.5% of screen height)
          initialData[offset + 7] = 0.0;
        }
        particleBuffer.write(initialData);

        // Compute shader for particle simulation
        const computeShader = ctx.compute(/* wgsl */ `
          struct Particle {
            position: vec2f,
            velocity: vec2f,
            life: f32,
            age: f32,
            size: f32,
            padding: f32,
          }

          @group(1) @binding(0) var<storage, read_write> particles: array<Particle>;

          @compute @workgroup_size(64, 1, 1)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&particles)) { return; }
            
            var particle = particles[index];
            
            // Update position
            particle.position += particle.velocity;
            
            // Bounce off edges with slight energy loss
            if (particle.position.x > 0.95) {
              particle.velocity.x *= -0.95;
              particle.position.x = 0.95;
            }
            if (particle.position.x < -0.95) {
              particle.velocity.x *= -0.95;
              particle.position.x = -0.95;
            }
            if (particle.position.y > 0.95) {
              particle.velocity.y *= -0.95;
              particle.position.y = 0.95;
            }
            if (particle.position.y < -0.95) {
              particle.velocity.y *= -0.95;
              particle.position.y = -0.95;
            }
            
            // Apply very gentle gravity
            particle.velocity.y -= 0.0002;
            
            // Very slight friction
            particle.velocity *= 0.9995;
            
            particles[index] = particle;
          }
        `);

        computeShader.storage("particles", particleBuffer);

        // Material for rendering particles
        const particleMaterial = ctx.material(/* wgsl */ `
          struct Particle {
            position: vec2f,
            velocity: vec2f,
            life: f32,
            age: f32,
            size: f32,
            padding: f32,
          }

          @group(1) @binding(0) var<storage, read> particles: array<Particle>;

          struct VertexOutput {
            @builtin(position) pos: vec4f,
            @location(0) life: f32,
            @location(1) uv: vec2f,
          }

          @vertex
          fn vs_main(
            @builtin(vertex_index) vid: u32,
            @builtin(instance_index) iid: u32
          ) -> VertexOutput {
            let particle = particles[iid];
            
            var quadPos = array<vec2f, 6>(
              vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
              vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
            );
            
            // Size in clip space (0.02 = 2% of screen height)
            let aspect = globals.resolution.x / globals.resolution.y;
            let size = particle.size;
            let localPos = quadPos[vid] * vec2f(size / aspect, size);
            let worldPos = particle.position + localPos;
            
            var out: VertexOutput;
            out.pos = vec4f(worldPos, 0.0, 1.0);
            out.life = particle.life;
            out.uv = quadPos[vid] * 0.5 + 0.5;
            return out;
          }

          @fragment
          fn fs_main(in: VertexOutput) -> @location(0) vec4f {
            let d = length(in.uv - 0.5);
            if (d > 0.5) { discard; }
            
            let alpha = smoothstep(0.5, 0.3, d) * in.life;
            return vec4f(1.0, 0.6, 0.2, alpha);
          }
        `, {
          vertexCount: 6,
          instances: particleCount,
          blend: "additive",
        });

        particleMaterial.storage("particles", particleBuffer);

        function frame() {
          if (disposed) return;
          // Update particles with compute shader
          computeShader.dispatch(Math.ceil(particleCount / 64));
          
          // Render particles
          particleMaterial.draw();
          
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
        ctx.dispose();
      }
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>Compute Shader Example</h1>
      <p style={{ marginBottom: '1rem' }}>
        GPU particle simulation using compute shaders and instanced rendering.
      </p>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '400px',
          border: '1px solid #ccc',
          display: 'block',
          backgroundColor: '#000'
        }}
        width={800}
        height={400}
      />
    </div>
  );
}