# Particle System Examples

This file contains code examples for particles in ralph-gpu.

## ctx.setTarget(null);

// Display
  ctx.setTarget(null);
  displayPass.draw();
}

```plaintext

### 6. Storage Buffers & Materials (Particles)

**NOTE:** While ralph-gpu supports `point-list` topology, WebGPU renders points as **1 pixel only** (no size control). For variable-sized particles, use **instanced rendering** where each particle is a quad (2 triangles).

#### WGSL Alignment Requirements

**CRITICAL:** When using `array<vec3f>` in storage buffers, each element is **16-byte aligned** (not 12 bytes). You must pad your data accordingly.

| WGSL Type | Size | Alignment | Stride in Array |
| --------- | ---- | --------- | --------------- |
| `f32`     | 4    | 4         | 4               |
| `vec2f`   | 8    | 8         | 8               |
| `vec3f`   | 12   | 16        | **16** (padded) |
| `vec4f`   | 16   | 16        | 16              |
| `mat4x4f` | 64   | 16        | 64              |

**Wrong (data will be misaligned):**

```

## struct Vertex {

struct Vertex {
  position: vec3f,
  _pad: f32,  // explicit padding
}
@group(1) @binding(0) var<storage, read> vertices: array<Vertex>;

```plaintext

#### Basic Particle System

```

## // Bind storage buffer

// Bind storage buffer
particles.storage("particles", particleBuffer);
// Draw
particles.draw();

```plaintext

#### Key Particle Rendering Patterns

**1. Always use instanced quads:**

```

## vertexCount: 6,           // NOT 1! Each particle is a quad

{
  vertexCount: 6,           // NOT 1! Each particle is a quad
  instances: particleCount, // Number of particles
}

```plaintext

**2. Vertex shader uses both indices:**

- `@builtin(vertex_index)` - Which vertex of the quad (0-5)
- `@builtin(instance_index)` - Which particle instance

**3. Create circular particles in fragment shader:**

```

## let d = length(in.uv - 0.5);

let d = length(in.uv - 0.5);
  if (d > 0.5) { discard; }  // Discard pixels outside circle
  let alpha = smoothstep(0.5, 0.3, d); // Smooth edges
  return vec4f(color.rgb, alpha);
}

```plaintext

**4. Proper canvas sizing for sharp rendering:**

```

## canvasRef.current.height = window.innerHeight * dpr;

canvasRef.current.height = window.innerHeight * dpr;
    ctx.resize(window.innerWidth * dpr, window.innerHeight * dpr);
  }
  window.addEventListener("resize", handleResize);
}

```plaintext

**5. Use flat array storage for particle data:**

```

## uniforms: {

uniforms: {
      dataTexture: { value: target.texture }, // Just texture, no sampler
    },
  }
);

```plaintext

### 8. Complete Particle System with Compute Physics

Full example combining compute shaders for physics with instanced particle rendering:

```

## particleMaterial.draw();

particleMaterial.draw();
  requestAnimationFrame(frame);
}
frame();

```plaintext

### 9. Particles Helper

The `ctx.particles()` helper provides a minimal API for instanced quad rendering with full shader control:

```

## particles.write(data);

}
particles.write(data);
// Draw
particles.draw();

```plaintext

#### What the Helper Provides

1. **Quad vertex generation** - 6 vertices (2 triangles) per instance
2. **Built-in WGSL helpers** injected into shader:
   - `fn quadOffset(vid: u32) -> vec2f` - Returns quad corner position (-0.5 to 0.5)
   - `fn quadUV(vid: u32) -> vec2f` - Returns UV coordinates (0 to 1)
3. **Storage buffer** - Automatically bound at `@group(1) @binding(0)`
4. **Instancing** - `instanceCount = count`, `vertexCount = 6`

#### What User Controls

- **Particle struct layout** - Any data layout you need
- **Vertex shader** - Position, size, rotation, billboarding, etc.
- **Fragment shader** - Shape via SDF, color, effects, etc.

#### Particles API

```

## // ✅ This works - render to a RenderTarget first

// ✅ This works - render to a RenderTarget first
const target = ctx.target(256, 256);
ctx.setTarget(target);
myPass.draw();
const pixels = await target.readPixels(); // Actual pixel data!

```plaintext

### Particles Helper Functions

The `ctx.particles()` helper **auto-injects** these WGSL functions into your shader:

```

## The `ctx.particles()` helper **auto-injects** these WGSL functions into your shader:

The `ctx.particles()` helper **auto-injects** these WGSL functions into your shader:
fn quadOffset(vid: u32) -> vec2f  // Returns -0.5 to 0.5 (quad corner position)
fn quadUV(vid: u32) -> vec2f      // Returns 0 to 1 (UV coordinates)

```plaintext

**Do NOT redefine these functions** in your shader - it will cause duplicate function errors:

```

