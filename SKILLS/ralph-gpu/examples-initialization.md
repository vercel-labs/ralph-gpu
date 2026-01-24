# Initialization Examples

This file contains code examples for initialization in ralph-gpu.

## Auto-Injected Globals

Every shader automatically has access to these uniforms via `globals`:

```wgsl
struct Globals {
  resolution: vec2f,  // Current render target size in pixels
  time: f32,          // Seconds since init (affected by timeScale)
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;
```

## Basic Patterns

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gpu, GPUContext, Pass, Sampler, RenderTarget } from "ralph-gpu";

export default function ShaderComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let pass: Pass;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      // Always check WebGPU support first
      if (!gpu.isSupported()) {
        console.error("WebGPU is not supported");
        return;
      }

      ctx = await gpu.init(canvasRef.current, {
        autoResize: true, // Automatically handles canvas sizing and DPR
        debug: true,
      });

      // Handle disposal during async init
      if (disposed) {
        ctx.dispose();
        return;
      }

      pass = ctx.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
        }
      `);

      function frame() {
        if (disposed) return;
        pass.draw();
        animationId = requestAnimationFrame(frame);
      }
      frame();
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      ctx?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%" }}
      width={800}
      height={600}
    />
  );
}
```

## fn quadOffset(index: u32) -> vec2f { ... }

fn quadOffset(index: u32) -> vec2f { ... }
// ✅ DO use them directly
let pos = quadOffset(vid) * particleSize;
let uv = quadUV(vid);

```plaintext

### Texture Format Differences

Be aware of default texture formats:

| Target          | Default Format    |
| --------------- | ----------------- |
| Canvas (screen) | `bgra8unorm`      |
| RenderTarget    | `rgba8unorm`      |
| MRT targets     | Per-target format |

When creating render pipelines that target different outputs, format mismatches will cause WebGPU validation errors. The library handles this internally, but if you're doing advanced rendering, be aware of these differences.

## Best Practices

1. **Always check WebGPU support** before initializing
2. **Handle async disposal** in React useEffect cleanup
3. **Use `autoResize: true`** for automatic canvas sizing and resize handling:
   ```tsx
   ctx = await gpu.init(canvas, { autoResize: true });
   ```
   This uses ResizeObserver to automatically track canvas size changes and applies DPR to the resolution.
4. **Or manually handle resize** if you need more control:

   ```tsx
   // Set pixel dimensions directly on canvas
   canvas.width = 1280;
   canvas.height = 720;

   // Init without autoResize uses canvas.width/height directly
   // No extra DPR multiplication is applied in this mode.
   ctx = await gpu.init(canvas, { autoResize: false });
   ```

5. **Use `ctx.particles()` for sized particles** - provides instanced quads with built-in helpers:
   ```tsx
   ctx.particles(count, { shader: `...`, bufferSize: count * 16 });
   ```
6. **Use `ctx.autoClear = false`** when doing ping-pong operations
7. **Update uniform references** before each ping-pong iteration
8. **Use appropriate texture formats** - `rgba8unorm` for display, `*16float` for computation
9. **Structure uniforms as { value: T }** for the reactive uniform pattern
10. **Use flat Float32Array for particle data** instead of structured arrays
11. **Create circular particles** with fragment shader `discard` for pixels outside radius
12. **Use `/* wgsl */`** template tag for syntax highlighting
13. **Dispose resources** on cleanup: `ctx.dispose()`, `target.dispose()`, `pass.dispose()`
14. **Respect WGSL alignment** for storage buffers - `array<vec3f>` has 16-byte stride, not 12:
    ```tsx
    // Pad vec3f data to 16 bytes: [x, y, z, 0.0]
    const buffer = ctx.storage(vertexCount * 16); // NOT vertexCount * 12
    ```
15. **Create custom samplers** for explicit texture filtering control:
    ```tsx
    const sampler = ctx.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
    ```
16. **Use storage textures** for compute shader write operations:
    ```tsx
    const target = ctx.target(512, 512, { usage: "storage" });
    ```
17. **Reuse samplers** across multiple textures and shaders for better performance

## Profiler & Debug System

ralph-gpu includes a built-in profiler and event system for performance monitoring and debugging.

### Enabling Events

```

