# Conventions for ralph-gpu Examples

## File Structure
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function ExamplePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported');
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

        const pass = ctx.pass(/* wgsl */ `...shader code...`);

        function frame() {
          if (disposed) return;
          pass.draw();
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

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1>Title</h1>
      <p>Description</p>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 150px)',
          border: '1px solid #333',
          display: 'block',
          background: '#000'
        }}
        width={1280}
        height={720}
      />
    </div>
  );
}
```

## WGSL Shader Template
```wgsl
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
  uv.y = -uv.y; // Flip Y for WebGPU
  
  // ... implementation ...
  
  return vec4f(col, 1.0);
}
```

## Globals Available
- `globals.resolution`: vec2f
- `globals.time`: f32
- `globals.deltaTime`: f32
- `globals.frame`: f32
- `globals.aspect`: f32
