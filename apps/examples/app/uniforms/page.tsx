'use client';

import { useEffect, useRef } from 'react';
import { gpu } from 'ralph-gpu';

export default function UniformsPage() {
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

        // Define uniforms object (Three.js style)
        const waveUniforms = {
          amplitude: { value: 0.2 },
          frequency: { value: 10.0 },
          color: { value: [1.0, 0.5, 0.2] },
        };

        const wave = ctx.pass(/* wgsl */ `
          struct MyUniforms {
            amplitude: f32,
            frequency: f32,
            color: vec3f,
          }
          @group(1) @binding(0) var<uniform> u: MyUniforms;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let y = sin(uv.x * u.frequency + globals.time) * u.amplitude;
            let c = smoothstep(0.0, 0.02, abs(uv.y - 0.5 - y));
            return vec4f(u.color * (1.0 - c), 1.0);
          }
        `, { uniforms: waveUniforms });

        function frame() {
          // Animate uniforms
          waveUniforms.amplitude.value = Math.sin(performance.now() * 0.001) * 0.3 + 0.3;
          waveUniforms.frequency.value = Math.cos(performance.now() * 0.0005) * 5.0 + 15.0;
          
          wave.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Uniforms Example</h1>
      <p style={{ marginBottom: '1rem' }}>
        Animated wave using custom uniforms with Three.js-style {`{ value: X }`} pattern.
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