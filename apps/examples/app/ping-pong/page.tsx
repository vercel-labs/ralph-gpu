'use client';

import { useEffect, useRef } from 'react';
import { gpu } from 'ralph-gpu';

export default function PingPongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        const ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        // Create ping-pong buffers for simulation
        const simulation = ctx.pingPong(128, 128, { 
          format: "rgba16float",
          filter: "linear",
          wrap: "clamp"
        });

        // Initialize the first buffer with some data
        const initPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let d = length(uv - 0.5);
            let initial = exp(-d * 8.0);
            return vec4f(initial, 0.0, 0.0, 1.0);
          }
        `);

        // Diffusion step
        const diffusionUniforms = {
          inputTex: { value: simulation.read.texture },
          diffusion: { value: 0.98 },
        };

        const diffusionPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var inputTex: texture_2d<f32>;
          @group(1) @binding(1) var inputSampler: sampler;
          
          struct Params { 
            diffusion: f32 
          }
          @group(1) @binding(2) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let texelSize = 1.0 / globals.resolution;
            
            // Sample neighbors
            let center = textureSample(inputTex, inputSampler, uv).r;
            let left   = textureSample(inputTex, inputSampler, uv + vec2f(-texelSize.x, 0.0)).r;
            let right  = textureSample(inputTex, inputSampler, uv + vec2f(texelSize.x, 0.0)).r;
            let up     = textureSample(inputTex, inputSampler, uv + vec2f(0.0, -texelSize.y)).r;
            let down   = textureSample(inputTex, inputSampler, uv + vec2f(0.0, texelSize.y)).r;
            
            // Diffusion
            let diffused = (center + left + right + up + down) * 0.2;
            let result = mix(center, diffused, 0.1) * params.diffusion;
            
            return vec4f(result, 0.0, 0.0, 1.0);
          }
        `, { uniforms: diffusionUniforms });

        // Display pass
        const displayUniforms = {
          inputTex: { value: simulation.read.texture },
        };

        const displayPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var inputTex: texture_2d<f32>;
          @group(1) @binding(1) var inputSampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let value = textureSample(inputTex, inputSampler, uv).r;
            
            // Color mapping
            let color = vec3f(value * 2.0, value * value * 4.0, value * 0.5);
            return vec4f(color, 1.0);
          }
        `, { uniforms: displayUniforms });

        // Initialize
        ctx.setTarget(simulation.write);
        initPass.draw();
        simulation.swap();

        let initialized = true;

        function frame() {
          // Update uniform references
          diffusionUniforms.inputTex.value = simulation.read.texture;
          displayUniforms.inputTex.value = simulation.read.texture;

          // Diffusion step
          ctx.setTarget(simulation.write);
          ctx.autoClear = false;
          diffusionPass.draw();
          simulation.swap();

          // Display
          ctx.setTarget(null);
          ctx.autoClear = true;
          displayPass.draw();

          animationId = requestAnimationFrame(frame);
        }
        
        frame();
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
      }
    }

    init();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>Ping-Pong Buffers</h1>
      <p style={{ marginBottom: '1rem' }}>
        Iterative diffusion simulation using ping-pong render targets.
      </p>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '400px',
          border: '1px solid #ccc',
          display: 'block'
        }}
        width={800}
        height={400}
      />
    </div>
  );
}