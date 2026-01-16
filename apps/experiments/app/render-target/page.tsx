'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function RenderTargetPage() {
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
          autoResize: true
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        // Create a render target
        const sceneBuffer = ctx.target(512, 512, {
          format: "rgba8unorm",
          filter: "linear",
          wrap: "clamp",
        });

        // Scene pass - render to the target
        const scenePass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let d = length(uv - 0.5);
            let circle = smoothstep(0.3, 0.25, d);
            let color = mix(
              vec3f(0.1, 0.2, 0.4),
              vec3f(1.0, 0.6, 0.2),
              circle
            );
            return vec4f(color, 1.0);
          }
        `);

        // Uniforms with texture reference
        const displayUniforms = {
          inputTex: { value: sceneBuffer },
        };

        // Display pass - show the rendered texture
        const displayPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var inputTex: texture_2d<f32>;
          @group(1) @binding(1) var inputSampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            
            // Sample the rendered texture
            let color = textureSample(inputTex, inputSampler, uv);
            
            // Add some post-processing effect
            let vignette = 1.0 - smoothstep(0.3, 0.8, length(uv - 0.5));
            return vec4f(color.rgb * vignette, 1.0);
          }
        `, { uniforms: displayUniforms });

        function frame() {
          if (disposed) return;
          // Render to the target
          ctx!.setTarget(sceneBuffer);
          scenePass.draw();

          // Render to screen
          ctx!.setTarget(null);
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
      <h1 style={{ marginBottom: '1rem' }}>Render Target Example</h1>
      <p style={{ marginBottom: '1rem' }}>
        Render to an offscreen texture, then display with post-processing effects.
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