# ralph-gpu

<p align="center">
  <strong>~10.9kB gzipped</strong> · WebGPU shader library for creative coding
</p>

<p align="center">
  <img src="https://img.shields.io/badge/gzip-10.9kB-blue" alt="Bundle size: ~10.9kB gzipped" />
  <img src="https://img.shields.io/badge/brotli-9.7kB-purple" alt="Brotli: ~9.7kB" />
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
- **Reactive uniforms** — `{ value: X }` pattern for automatic GPU updates
- **Compute shaders** — GPU-accelerated parallel computation with full texture support
- **Storage textures** — Write to textures in compute shaders for advanced effects
- **Custom samplers** — Explicit control over texture filtering and wrapping modes
- **Storage buffers** — For particles, simulations, and custom data
- **Blend modes** — Presets (`additive`, `alpha`, `multiply`) + custom configs
- **Render targets** — Offscreen rendering with configurable format, filter, wrap, and storage usage

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
  dpr: Math.min(window.devicePixelRatio, 2), // Fixed DPR
  debug: true,
});

// Auto-resize with DPR clamping (recommended for high-DPI displays)
const ctx = await gpu.init(canvas, {
  autoResize: true,
  dpr: [1, 2], // Clamp device DPR between 1 and 2
});

// Or with fixed DPR override when autoResize is enabled
const ctx = await gpu.init(canvas, {
  autoResize: true,
  dpr: 1.5, // Always use 1.5, regardless of device DPR
});
```

#### DPR Configuration

The `dpr` option controls device pixel ratio handling:

- **`number`**: Fixed DPR value
  - When `autoResize: true`: Overrides device DPR
  - When `autoResize: false`: Ignored (no DPR multiplication)
- **`[min, max]`**: Clamp device DPR to range (only with `autoResize: true`)
  - Example: `[1, 2]` clamps to 1-2x on any display
  - Prevents texture size limits on high-DPI displays (4K+)
- **Default**: `Math.min(devicePixelRatio, 2)` when `autoResize: true`, otherwise `1`

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

#### Texture Uniforms

Textures can be passed as full `RenderTarget` objects (includes texture + sampler) or separately:

```typescript
const uniforms = {
  // Option 1: Pass full RenderTarget (auto extracts texture + sampler)
  inputTex: { value: renderTarget },

  // Option 2: Pass texture and sampler separately
  inputTex: { value: renderTarget.texture }, // GPUTexture
  inputSampler: { value: mySampler }, // GPUSampler (optional, matched by name)
};

// In WGSL, samplers are automatically matched by naming convention:
// inputTex → inputSampler or inputTexSampler
```

#### Creating Custom Samplers

Use `ctx.createSampler()` for explicit control over texture filtering and wrapping:

```typescript
// Linear filtering with clamp-to-edge
const linearClamp = ctx.createSampler({
  magFilter: "linear",
  minFilter: "linear",
  addressModeU: "clamp-to-edge",
  addressModeV: "clamp-to-edge",
});

// Nearest filtering with repeat
const nearestRepeat = ctx.createSampler({
  magFilter: "nearest",
  minFilter: "nearest",
  addressModeU: "repeat",
  addressModeV: "repeat",
});

// Reuse across multiple textures
const uniforms = {
  texture1: { value: tex1.texture },
  sampler1: { value: linearClamp },
  texture2: { value: tex2.texture },
  sampler2: { value: nearestRepeat },
};
```

Samplers can be reused across multiple shaders for consistency and performance.

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
// Create offscreen target with explicit size
const buffer = ctx.target(512, 512, {
  format: "rgba16float", // "rgba8unorm" | "rgba16float" | "r16float" | "rg16float"
  filter: "linear", // "linear" | "nearest"
  wrap: "clamp", // "clamp" | "repeat" | "mirror"
});

// Or auto-size to canvas dimensions (no arguments needed)
const canvasSizedBuffer = ctx.target();

// Render to target
ctx.setTarget(buffer);
scenePass.draw();

// Use as texture in uniforms (pass full RenderTarget or just .texture)
const displayUniforms = {
  inputTex: { value: buffer }, // Full RenderTarget (includes texture + sampler)
  // OR
  inputTex: { value: buffer.texture }, // Stable texture reference
  inputSampler: { value: mySampler }, // Explicit sampler (optional)
};
ctx.setTarget(null); // Back to screen
displayPass.draw();

// Resize stability - texture references remain valid!
buffer.resize(1024, 1024); // ✅ No need to update displayUniforms.inputTex
```

## Ping-Pong Buffers

For iterative effects like fluid simulation, diffusion, and multi-pass blur:

```typescript
// Explicit size
const velocity = ctx.pingPong(128, 128, { format: "rg16float" });

// Or auto-size to canvas
const canvasSized = ctx.pingPong();

// Read from .read, write to .write
advectionUniforms.source.value = velocity.read; // Full RenderTarget
// OR
advectionUniforms.source.value = velocity.read.texture; // Just GPUTexture
ctx.setTarget(velocity.write);
advection.draw();

// Swap for next iteration
velocity.swap();
```

## Compute Shaders

### Basic Compute with Storage Buffers

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

### Compute with Texture Sampling

Compute shaders can sample from textures (e.g., reading from an SDF texture):

```typescript
const compute = ctx.compute(
  /* wgsl */ `
  @group(1) @binding(0) var<uniform> u: MyUniforms;
  @group(1) @binding(1) var<storage, read_write> data: array<f32>;
  @group(1) @binding(2) var myTexture: texture_2d<f32>;
  @group(1) @binding(3) var mySampler: sampler;
  
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let uv = vec2f(f32(id.x) / 512.0, f32(id.y) / 512.0);
    let texValue = textureSampleLevel(myTexture, mySampler, uv, 0.0);
    data[id.x] = texValue.r;
  }
`,
  {
    uniforms: {
      myTexture: { value: renderTarget }, // RenderTarget auto-extracts texture + sampler
    },
  }
);

compute.storage("data", dataBuffer);
compute.dispatch(512);
```

### Compute with Storage Textures (Write Operations)

For writing to textures in compute shaders, use storage textures:

```typescript
// Create a render target with storage usage
const outputTarget = ctx.target(512, 512, {
  format: "rgba16float",
  usage: "storage", // Enable write operations
});

const compute = ctx.compute(
  /* wgsl */ `
  @group(1) @binding(0) var input: texture_2d<f32>;
  @group(1) @binding(1) var inputSampler: sampler;
  @group(1) @binding(2) var output: texture_storage_2d<rgba16float, write>;
  
  @compute @workgroup_size(8, 8)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let uv = vec2f(id.xy) / 512.0;
    let color = textureSampleLevel(input, inputSampler, uv, 0.0);
    textureStore(output, id.xy, color * 2.0); // Write to storage texture
  }
`,
  {
    uniforms: {
      input: { value: inputTarget },
      output: { value: outputTarget },
    },
  }
);

compute.dispatch(512 / 8, 512 / 8);
```

### Texture Loading Without Sampler

Use `textureLoad()` for direct pixel access without sampling:

```typescript
const compute = ctx.compute(
  /* wgsl */ `
  @group(1) @binding(0) var dataTexture: texture_2d<f32>;
  
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let value = textureLoad(dataTexture, vec2i(id.xy), 0).r;
    // No sampler needed for textureLoad
  }
`,
  {
    uniforms: {
      dataTexture: { value: target.texture },
    },
  }
);
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
ctx.target(width?, height?, options?)      // → RenderTarget (auto-sizes to canvas if omitted)
ctx.pingPong(width?, height?, options?)    // → PingPongTarget (auto-sizes to canvas if omitted)
ctx.mrt(outputs, width?, height?)          // → MultiRenderTarget (auto-sizes to canvas if omitted)
ctx.storage(byteSize)                      // → StorageBuffer
ctx.createSampler(descriptor?)             // → Sampler (texture sampler with custom filtering/wrapping)

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
target.texture                             // TextureReference (stable across resizes - use for uniforms)
target.gpuTexture                          // GPUTexture (direct access - becomes invalid after resize)
target.sampler                             // GPUSampler
target.view                                // GPUTextureView (auto-updated on resize)
target.width / target.height               // Dimensions
target.format                              // Texture format
target.usage                               // Usage mode ("render" | "storage" | "both")
target.resize(width, height)               // Resize (texture references remain valid!)
target.readPixels(x?, y?, w?, h?)          // → Promise<Uint8Array | Float32Array>
target.dispose()                           // Cleanup
```

**Resize Stability**: Texture references stay valid after resize. Use `.texture` for uniforms (recommended) and `.gpuTexture` only when you need direct GPU texture access.

**Render Target Options:**

```typescript
{
  format?: "rgba8unorm" | "rgba16float" | "r16float" | "rg16float" | "r32float", // Default: "rgba8unorm"
  filter?: "linear" | "nearest",         // Default: "linear"
  wrap?: "clamp" | "repeat" | "mirror",  // Default: "clamp"
  usage?: "render" | "storage" | "both", // Default: "render"
  // "render": For rendering and sampling
  // "storage": For compute shader write operations (texture_storage_2d)
  // "both": For both rendering and storage operations
}
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

### Sampler

```typescript
sampler.gpuSampler; // GPUSampler
sampler.descriptor; // SamplerDescriptor (readonly)
sampler.dispose(); // Cleanup (currently no-op, kept for API consistency)
```

**Sampler Options:**

```typescript
{
  magFilter?: "linear" | "nearest",      // Default: "linear"
  minFilter?: "linear" | "nearest",      // Default: "linear"
  mipmapFilter?: "linear" | "nearest",   // Default: "linear"
  addressModeU?: "clamp-to-edge" | "repeat" | "mirror-repeat", // Default: "clamp-to-edge"
  addressModeV?: "clamp-to-edge" | "repeat" | "mirror-repeat", // Default: "clamp-to-edge"
  addressModeW?: "clamp-to-edge" | "repeat" | "mirror-repeat", // Default: "clamp-to-edge"
  lodMinClamp?: number,                  // Default: 0
  lodMaxClamp?: number,                  // Default: 32
  compare?: "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always",
  maxAnisotropy?: number,                // Default: 1
}
```

## Exports

### Classes

```typescript
import {
  gpu, // Main entry point
  GPUContext, // GPU context class
  Pass, // Fullscreen pass
  Material, // Custom vertex shader
  ComputeShader, // Compute shader
  RenderTarget, // Render target
  TextureReference, // Stable texture reference (used internally by RenderTarget)
  PingPongTarget, // Ping-pong buffer
  MultiRenderTarget, // Multiple render targets
  StorageBuffer, // Storage buffer
  Particles, // Particle system helper
  Sampler, // Texture sampler
} from "ralph-gpu";
```

### Errors

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

## Important Notes

### Reading Pixels

**You cannot read pixels from the screen** (swap chain texture). For pixel readback, render to a RenderTarget first:

```typescript
// ❌ Won't work - screen can't be read
ctx.setTarget(null);
myPass.draw();
const pixels = await ctx.readPixels(); // Returns zeros!

// ✅ Works - render to a RenderTarget
const target = ctx.target(256, 256);
ctx.setTarget(target);
myPass.draw();
const pixels = await target.readPixels(); // Actual pixel data!
```

### Globals Binding

The globals struct is auto-injected at `@group(0)`. If your shader doesn't use `globals.time`, `globals.resolution`, etc., the WGSL optimizer may remove the binding internally. The library handles this automatically.

### Particles Helper Functions

When using `ctx.particles()`, these WGSL functions are **auto-injected**:

```wgsl
fn quadOffset(vid: u32) -> vec2f  // Returns -0.5 to 0.5
fn quadUV(vid: u32) -> vec2f      // Returns 0 to 1
```

**Do NOT redefine these** in your shader - use them directly.

### Texture Formats

Default formats differ between targets:

| Target          | Default Format |
| --------------- | -------------- |
| Canvas (screen) | `bgra8unorm`   |
| RenderTarget    | `rgba8unorm`   |

## Testing

The library has two test suites:

### Unit Tests (Vitest)

Tests for pure logic, types, and API surface:

```bash
# Run unit tests
pnpm test

# Run in watch mode
pnpm run test:watch
```

### Browser Tests (Playwright)

WebGPU rendering tests that run in a real browser:

```bash
# Build the test bundle first
pnpm run build:test

# Run browser tests (headless)
pnpm run test:browser

# Run browser tests with visible browser (useful for debugging)
pnpm run test:browser:headed
```

### Run All Tests

```bash
pnpm run test:all
```

## Bundle Size

| Format | Raw | Gzip | Brotli |
|--------|-----|------|--------|
| index.js | 44.07 kB | 11.05 kB | 9.86 kB |
| index.mjs | 43.56 kB | 10.86 kB | 9.68 kB |

> 📦 **~10.9 kB** gzipped (ESM)

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
