'use client';

import { useEffect, useRef } from 'react';
import { gpu } from 'ralph-gpu';

export default function BasicPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        // Check WebGPU support
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        // Initialize context
        const ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        // Create a simple gradient pass
        const gradient = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
          }
        `);

        function frame() {
          gradient.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Basic Gradient</h1>
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
