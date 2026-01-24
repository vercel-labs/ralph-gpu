# Fullscreen Pass Examples

This file contains code examples for passes in ralph-gpu.

## Simple Mode (Recommended)

Pass an object with plain values. WGSL bindings are auto-generated and uniforms are available via the `uniforms` struct.

```tsx
const wave = ctx.pass(
  /* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    // Bindings for uTexture, uSampler, and uniforms struct are auto-generated!
    let tex = textureSample(uTexture, uSampler, uv);
    return tex * vec4f(uniforms.color, 1.0) * uniforms.intensity;
  }
`,
  {
    uTexture: someTarget,
    color: [1, 0, 0],
    intensity: 0.5,
  }
);

// Update values directly
wave.set("intensity", 0.8);
```

## Manual Mode (Explicit Bindings)

Define uniforms with `{ value: X }` wrapper for reactive updates. Requires manual `@group(1)` declarations in WGSL.

```tsx
const gradient = ctx.pass(
  /* wgsl */ `
  struct MyUniforms { color: vec3f }
  @group(1) @binding(0) var<uniform> u: MyUniforms;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(u.color, 1.0);
  }
`,
  {
    uniforms: {
      color: { value: [1, 0, 0] },
    },
  }
);

// Update value
gradient.uniforms.color.value = [0, 1, 0];
```

