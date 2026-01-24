# Render Target Examples

This file contains code examples for rendering in ralph-gpu.

## // Update uniforms anywhere - changes apply automatically

);
// Update uniforms anywhere - changes apply automatically
uniforms.amplitude.value = 0.8;
uniforms.color.value = [0.2, 1.0, 0.5];

````

### 4. Render Targets (Offscreen Rendering)

```

## // GPU device couldn't be created

// GPU device couldn't be created
  } else if (e instanceof ShaderCompileError) {
    console.error(`Line ${e.line}, Col ${e.column}: ${e.message}`);
  }
}

```plaintext

## Texture Formats and Usage

### Texture Formats

| Format        | Description                 | Use Case                      |
| ------------- | --------------------------- | ----------------------------- |
| `rgba8unorm`  | 8-bit RGBA, 0-1 range       | General purpose, final output |
| `rgba16float` | 16-bit float RGBA           | HDR, accumulation buffers     |
| `r16float`    | Single channel 16-bit float | Pressure, divergence          |
| `rg16float`   | Two channel 16-bit float    | Velocity fields               |
| `r32float`    | Single channel 32-bit float | High precision                |

### RenderTarget Usage Modes

Control how render targets can be used:

```

## // For both rendering and compute writes

// For both rendering and compute writes
const dualTarget = ctx.target(512, 512, {
  format: "rgba16float",
  usage: "both", // Maximum flexibility
});

```plaintext

**Usage Modes:**

- `"render"` (default): RENDER_ATTACHMENT + TEXTURE_BINDING + COPY_SRC
- `"storage"`: STORAGE_BINDING + TEXTURE_BINDING + COPY_SRC
- `"both"`: All usage flags combined

### RenderTarget Resize Stability

**Important**: Texture references remain valid after resize! Similar to modern GPU APIs, you don't need to manually update uniform references when resizing.

```

## fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

```plaintext

## Important Internals & Gotchas

### Globals Binding Behavior

The globals struct (`@group(0) @binding(0)`) is **always declared** in your shader, but the WGSL optimizer may remove unused bindings. If your shader doesn't reference `globals.time`, `globals.resolution`, etc., the binding may be optimized away internally. The library handles this automatically, but be aware that:

- Globals are auto-prepended to all shaders at `@group(0)`
- User uniforms are always at `@group(1)`
- The library detects if your shader uses globals and only binds them when needed

### Reading Pixels from Screen vs RenderTarget

**You cannot `readPixels()` from the screen** (swap chain texture). The WebGPU swap chain texture doesn't have `CopySrc` usage. For pixel verification or CPU readback:

```

## // Get event history

// Get event history
const history = ctx.getEventHistory(["draw", "compute"]);
// Unsubscribe
unsubscribe();

```plaintext

### Event Types

| Event Type       | Description                             |
| ---------------- | --------------------------------------- |
| `draw`           | Draw call (pass, material, particles)   |
| `compute`        | Compute shader dispatch                 |
| `frame`          | Frame start/end with timing             |
| `shader_compile` | Shader compilation                      |
| `memory`         | Buffer/texture allocate/free/resize     |
| `target`         | Render target set/clear                 |
| `pipeline`       | Pipeline creation (with cache hit info) |

## API Quick Reference

```

