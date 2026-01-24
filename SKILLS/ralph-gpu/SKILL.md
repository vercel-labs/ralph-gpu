---
name: ralph-gpu
description: Minimal WebGPU shader library for creative coding and real-time graphics. Provides fullscreen passes, particles, compute shaders, render targets, and ping-pong buffers with automatic uniform bindings and global time/resolution tracking.
---

# ralph-gpu

A minimal WebGPU shader library for creative coding and real-time graphics.

## When to Use

Use this skill when:
- Building WebGPU shader effects, creative coding projects, or real-time graphics
- Working with fullscreen shader passes, particle systems, or compute shaders
- Need guidance on ralph-gpu API, render targets, or WGSL shader patterns
- Implementing GPU-accelerated simulations or visual effects

## Installation

```bash
npm install ralph-gpu
# For TypeScript support:
npm install -D @webgpu/types
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| `gpu` | Module entry point for initialization |
| `ctx` | GPU context — manages state and rendering |
| `pass` | Fullscreen shader (fragment only, uses internal quad) |
| `material` | Shader with custom vertex code (particles, geometry) |
| `target` | Render target (offscreen texture) |
| `pingPong` | Pair of render targets for iterative effects |
| `compute` | Compute shader for GPU-parallel computation |
| `storage` | Storage buffer for large data (particles, simulations) |

## Auto-Injected Globals

Every shader automatically has access to these uniforms:

```wgsl
struct Globals {
  resolution: vec2f,  // Current render target size in pixels
  time: f32,          // Seconds since init
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;
```

## Quick Start

```tsx
import { gpu } from "ralph-gpu";

// Check support
if (!gpu.isSupported()) {
  console.error("WebGPU not supported");
  return;
}

// Initialize
const ctx = await gpu.init(canvas, { autoResize: true });

// Create fullscreen shader pass
const pass = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
`);

// Render loop
function frame() {
  pass.draw();
  requestAnimationFrame(frame);
}
frame();
```

## API Overview

### Context Creation

```tsx
const ctx = await gpu.init(canvas, {
  autoResize?: boolean,  // Auto-handle canvas sizing (default: false)
  dpr?: number,          // Device pixel ratio
  debug?: boolean,       // Enable debug mode
  events?: {             // Event tracking
    enabled: boolean,
    types?: string[],
    historySize?: number
  }
});
```

### Fullscreen Passes

```tsx
// Simple mode (auto-generated bindings)
const pass = ctx.pass(wgslCode, {
  uTexture: someTarget,
  color: [1, 0, 0],
  intensity: 0.5
});
pass.set("intensity", 0.8);  // Update uniforms

// Manual mode (explicit bindings)
const pass = ctx.pass(wgslCode, {
  uniforms: {
    myValue: { value: 1.0 }
  }
});
pass.uniforms.myValue.value = 2.0;
```

### Render Targets

```tsx
const target = ctx.target(512, 512, {
  format?: "rgba8unorm" | "rgba16float" | "r16float" | "rg16float",
  filter?: "linear" | "nearest",
  wrap?: "clamp" | "repeat" | "mirror",
  usage?: "render" | "storage" | "both"
});

ctx.setTarget(target);  // Render to target
ctx.setTarget(null);    // Render to screen
```

### Ping-Pong Buffers

```tsx
const simulation = ctx.pingPong(128, 128, {
  format: "rgba16float"
});

// In render loop:
uniforms.inputTex.value = simulation.read;
ctx.setTarget(simulation.write);
processPass.draw();
simulation.swap();
```

### Particles (Instanced Quads)

```tsx
const particles = ctx.particles(1000, {
  shader: wgslCode,      // Full vertex + fragment shader
  bufferSize: 1000 * 16, // Buffer size in bytes
  blend: "additive"
});

particles.write(particleData);  // Float32Array
particles.draw();
```

### Compute Shaders

```tsx
const compute = ctx.compute(`
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // GPU computation
  }
`);

compute.storage("buffer", storageBuffer);
compute.dispatch(Math.ceil(count / 64));
```

### Storage Buffers

```tsx
const buffer = ctx.storage(byteSize);
buffer.write(new Float32Array([...]));

// Bind to shader
pass.storage("dataBuffer", buffer);
```

## Important Notes

**WGSL Alignment**: `array<vec3f>` has 16-byte stride, not 12. Always pad to 16 bytes:
```tsx
// Correct: [x, y, z, 0.0] per element
const buffer = ctx.storage(count * 16);
```

**Particle Rendering**: Use instanced quads, not point-list (WebGPU points are always 1px)

**Texture References**: Target references stay valid after resize - no need to update uniforms

**Screen Readback**: Cannot read pixels from screen, only from render targets

## Examples

For detailed code examples, see:
- [examples-initialization.md](./examples-initialization.md) - Setup and React integration
- [examples-passes.md](./examples-passes.md) - Fullscreen shader passes
- [examples-rendering.md](./examples-rendering.md) - Render targets and ping-pong
- [examples-particles.md](./examples-particles.md) - Particle systems
- [examples-compute.md](./examples-compute.md) - Compute shaders
- [examples-shaders.md](./examples-shaders.md) - WGSL patterns and SDFs
- [examples-debugging.md](./examples-debugging.md) - Profiler and events

## Resources

- [GitHub Repository](https://github.com/your-org/ralph-gpu)
- [API Documentation](https://ralph-gpu.dev/docs)
- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)
