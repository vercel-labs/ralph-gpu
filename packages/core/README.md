# ralph-gpu

<p align="center">
  <strong>~7kB gzipped</strong> · WebGPU shader library for creative coding
</p>

<p align="center">
  <img src="https://img.shields.io/badge/gzip-6.8kB-blue" alt="Bundle size: ~6kB gzipped" />
  <img src="https://img.shields.io/badge/brotli-6.1kB-purple" alt="Brotli: ~5.4kB" />
  <img src="https://img.shields.io/badge/WebGPU-ready-green" alt="WebGPU Ready" />
</p>

A minimal, ergonomic WebGPU shader library for creative coding and real-time graphics.

```typescript
import { gpu } from "ralph-gpu";

const ctx = await gpu.init(canvas);

const gradient = ctx.pass(/* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
`);

function frame() {
  gradient.draw();
  requestAnimationFrame(frame);
}
frame();
```

## Features

- **Simple API** — Write shaders, draw them. That's it.
- **Auto-injected uniforms** — `resolution`, `time`, `deltaTime`, `frame`, `aspect` available in all shaders
- **Ping-pong buffers** — First-class support for iterative effects (fluid sim, blur, etc.)
- **Three.js-style uniforms** — `{ value: X }` pattern for reactive updates
- **Compute shaders** — GPU-accelerated parallel computation
- **Storage buffers** — For particles, simulations, and custom data
- **Blend modes** — Presets (`additive`, `alpha`, `multiply`) + custom configs
- **Render targets** — Offscreen rendering with configurable format, filter, wrap

## Installation

```bash
npm install ralph-gpu
# or
pnpm add ralph-gpu
```

WebGPU types are optional but recommended for TypeScript:

```bash
npm install -D @webgpu/types
```

## Quick Start

### 1. Initialize

```typescript
import { gpu, WebGPUNotSupportedError } from "ralph-gpu";

// Check support
if (!gpu.isSupported()) {
  showFallback();
  return;
}

// Initialize with options
const ctx = await gpu.init(canvas, {
  dpr: Math.min(window.devicePixelRatio, 2),
  debug: true,
});
```

### 2. Create a Fullscreen Pass

```typescript
const myShader = ctx.pass(/* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let color = vec3f(uv, 0.5 + 0.5 * sin(globals.time));
    return vec4f(color, 1.0);
  }
`);

// Draw
myShader.draw();
```

### 3. Add Uniforms

```typescript
const uniforms = {
  amplitude: { value: 0.5 },
  color: { value: [1.0, 0.2, 0.5] },
};

const wave = ctx.pass(
  /* wgsl */ `
  struct Params { amplitude: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let y = sin(uv.x * 10.0 + globals.time) * u.amplitude;
    let c = smoothstep(0.0, 0.02, abs(uv.y - 0.5 - y));
    return vec4f(u.color * (1.0 - c), 1.0);
  }
`,
  { uniforms }
);

// Update uniforms anywhere
uniforms.amplitude.value = 0.8;
uniforms.color.value = [0.2, 1.0, 0.5];
```

## Usage with React

```tsx
import { useEffect, useRef } from "react";
import { gpu, GPUContext, Pass } from "ralph-gpu";

function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let pass: Pass;
    let animationId: number;
    let disposed = false;

    const onResize = () => {
      if (!ctx || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      ctx.resize(rect.width, rect.height);
    };

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;

      ctx = await gpu.init(canvasRef.current, {
        dpr: Math.min(window.devicePixelRatio, 2),
      });

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

      window.addEventListener("resize", onResize);
      onResize();

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
      window.removeEventListener("resize", onResize);
      ctx?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
```

## Core Concepts

| Concept    | Description                                            |
| ---------- | ------------------------------------------------------ |
| `ctx`      | GPU context — manages state and rendering              |
| `pass`     | Fullscreen shader (fragment only, uses internal quad)  |
| `material` | Shader with custom vertex code (particles, geometry)   |
| `target`   | Render target (offscreen texture)                      |
| `pingPong` | Pair of render targets for iterative effects           |
| `compute`  | Compute shader for GPU-parallel computation            |
| `storage`  | Storage buffer for large data (particles, simulations) |

## Auto-Injected Globals

Every shader has access to these uniforms automatically:

```wgsl
struct Globals {
  resolution: vec2f,  // Current render target size
  time: f32,          // Seconds since init (affected by timeScale)
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;
```

## Render Targets

```typescript
// Create offscreen target
const buffer = ctx.target(512, 512, {
  format: "rgba16float", // "rgba8unorm" | "rgba16float" | "r16float" | "rg16float"
  filter: "linear", // "linear" | "nearest"
  wrap: "clamp", // "clamp" | "repeat" | "mirror"
});

// Render to target
ctx.setTarget(buffer);
scenePass.draw();

// Use as texture
const displayUniforms = {
  inputTex: { value: buffer.texture },
};
ctx.setTarget(null); // Back to screen
displayPass.draw();
```

## Ping-Pong Buffers

For iterative effects like fluid simulation, diffusion, and multi-pass blur:

```typescript
const velocity = ctx.pingPong(128, 128, { format: "rg16float" });

// Read from .read, write to .write
advectionUniforms.source.value = velocity.read.texture;
ctx.setTarget(velocity.write);
advection.draw();

// Swap for next iteration
velocity.swap();
```

## Compute Shaders

```typescript
const particleCompute = ctx.compute(/* wgsl */ `
  struct Particle { pos: vec2f, vel: vec2f }
  @group(1) @binding(0) var<storage, read_write> particles: array<Particle>;

  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    particles[i].pos += particles[i].vel * globals.deltaTime;
  }
`);

// Dispatch compute work
particleCompute.storage("particles", particleBuffer);
particleCompute.dispatch(numParticles / 64);
```

## Materials (Custom Geometry)

For particles, instanced rendering, or custom vertex shaders:

```typescript
const particles = ctx.material(
  /* wgsl */ `
  struct Particle { pos: vec2f, color: vec3f }
  @group(1) @binding(0) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) color: vec3f,
  }

  @vertex
  fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32
  ) -> VertexOutput {
    // Quad vertices
    var quad = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
    );
    
    let p = particles[iid];
    var out: VertexOutput;
    out.pos = vec4f(p.pos + quad[vid] * 0.01, 0.0, 1.0);
    out.color = p.color;
    return out;
  }

  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    return vec4f(in.color, 1.0);
  }
`,
  {
    vertexCount: 6,
    instances: 10000,
    blend: "additive",
  }
);

particles.storage("particles", particleBuffer);
particles.draw();
```

## Blend Modes

```typescript
// Presets
ctx.pass(shader, { blend: "alpha" }); // Standard transparency
ctx.pass(shader, { blend: "additive" }); // Glow, fire
ctx.pass(shader, { blend: "multiply" }); // Darken
ctx.pass(shader, { blend: "screen" }); // Lighten

// Custom blend
ctx.pass(shader, {
  blend: {
    color: { src: "src-alpha", dst: "one", operation: "add" },
    alpha: { src: "one", dst: "one-minus-src-alpha", operation: "add" },
  },
});
```

## Time Control

```typescript
ctx.paused = true; // Pause time
ctx.paused = false; // Resume
ctx.timeScale = 0.5; // Slow motion
ctx.timeScale = 2.0; // Fast forward
ctx.time = 0; // Reset time
```

## Utility Methods

```typescript
// Manual clear
ctx.autoClear = false;
ctx.clear(target, [0, 0, 0, 1]);

// Resize handling
ctx.resize(window.innerWidth, window.innerHeight);
buffer.resize(ctx.width, ctx.height);

// Read pixels (GPU → CPU)
const pixels = await buffer.readPixels();

// Cleanup
buffer.dispose();
pass.dispose();
ctx.dispose();
```

## API Reference

### Module

```typescript
gpu.isSupported()                          // → boolean
gpu.init(canvas, options?)                 // → Promise<GPUContext>
```

### Context

```typescript
ctx.pass(fragmentWGSL, options?)           // → Pass
ctx.material(wgsl, options?)               // → Material
ctx.compute(wgsl, options?)                // → ComputeShader
ctx.target(width, height, options?)        // → RenderTarget
ctx.pingPong(width, height, options?)      // → PingPongTarget
ctx.mrt(outputs, width, height)            // → MultiRenderTarget
ctx.storage(byteSize)                      // → StorageBuffer

ctx.setTarget(target | null)               // Set render target
ctx.setViewport(x?, y?, w?, h?)            // Set viewport
ctx.setScissor(x?, y?, w?, h?)             // Set scissor rect
ctx.clear(target?, color?)                 // Clear target
ctx.resize(width, height)                  // Resize context
ctx.readPixels(x?, y?, w?, h?)             // → Promise<Uint8Array | Float32Array>
ctx.dispose()                              // Cleanup all resources

// Properties
ctx.width: number
ctx.height: number
ctx.time: number
ctx.timeScale: number
ctx.paused: boolean
ctx.autoClear: boolean
```

### Pass / Material

```typescript
pass.draw(); // Draw to current target
pass.uniforms; // Access uniforms
pass.set(name, value); // Set uniform value
pass.storage(name, buffer); // Bind storage buffer
pass.dispose(); // Cleanup
```

### Compute

```typescript
compute.dispatch(x, y?, z?)                // Run compute shader
compute.uniforms                           // Access uniforms
compute.storage(name, buffer)              // Bind storage buffer
compute.dispose()                          // Cleanup
```

### Render Target

```typescript
target.texture                             // GPUTexture
target.sampler                             // GPUSampler
target.view                                // GPUTextureView
target.width / target.height               // Dimensions
target.format                              // Texture format
target.resize(width, height)               // Resize
target.readPixels(x?, y?, w?, h?)          // → Promise<Uint8Array | Float32Array>
target.dispose()                           // Cleanup
```

### Ping-Pong

```typescript
pingPong.read; // Current state (RenderTarget)
pingPong.write; // Next state (RenderTarget)
pingPong.swap(); // Swap read/write
pingPong.resize(width, height); // Resize both
pingPong.dispose(); // Cleanup
```

### Storage Buffer

```typescript
storage.gpuBuffer; // GPUBuffer
storage.write(data); // Write TypedArray
storage.dispose(); // Cleanup
```

## Errors

```typescript
import {
  WebGPUNotSupportedError,
  DeviceCreationError,
  ShaderCompileError,
} from "ralph-gpu";

try {
  const ctx = await gpu.init(canvas);
} catch (e) {
  if (e instanceof WebGPUNotSupportedError) {
    // Browser doesn't support WebGPU
  } else if (e instanceof DeviceCreationError) {
    // GPU device couldn't be created
  } else if (e instanceof ShaderCompileError) {
    console.error(`Line ${e.line}, Col ${e.column}: ${e.message}`);
  }
}
```

## Bundle Size

| Format | Raw | Gzip | Brotli |
|--------|-----|------|--------|
| index.js | 26.33 kB | 7.03 kB | 6.29 kB |
| index.mjs | 25.83 kB | 6.84 kB | 6.11 kB |

> 📦 **~6.8 kB** gzipped (ESM)

## Browser Support

WebGPU is supported in:

- Chrome 113+ (desktop)
- Chrome 121+ (Android)
- Edge 113+
- Firefox Nightly (behind flag)
- Safari 17+ (macOS Sonoma, iOS 17)

Always check `gpu.isSupported()` before initializing.

## License

MIT
