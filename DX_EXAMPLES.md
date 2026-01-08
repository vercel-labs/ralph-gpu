# ralph-gpu — Developer Experience Examples

> This document contains **fake examples** showing how the library should be used.  
> The goal is to iterate on the API design before implementation.

---

## Philosophy

The library follows the **Three.js / OGL mental model**:

1. Create render targets and shaders separately
2. Set the render target with `ctx.setTarget()`
3. Draw with `pass.draw()` or `material.draw()`
4. Uniforms use `{ value: X }` pattern for reactive updates

---

## Core Concepts

| Concept    | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `ctx`      | The GPU context, manages state and rendering               |
| `pass`     | A fullscreen shader (fragment only, uses internal quad)    |
| `material` | A shader with custom vertex code (for particles, geometry) |
| `target`   | A render target (offscreen texture)                        |
| `pingPong` | A pair of render targets for iterative effects             |

---

## Initialization

```typescript
import { gpu } from "ralph-gpu";

// Check support first
if (!gpu.isSupported()) {
  showFallbackMessage();
  return;
}

// Initialize with options
const ctx = await gpu.init(canvas, {
  dpr: Math.min(window.devicePixelRatio, 2), // Device pixel ratio (retina)
  debug: true, // Enable extra validation and warnings
});
```

### Errors

If WebGPU is not supported or initialization fails, `gpu.init()` throws:

```typescript
try {
  const ctx = await gpu.init(canvas);
} catch (e) {
  if (e instanceof WebGPUNotSupportedError) {
    // Browser doesn't support WebGPU
  } else if (e instanceof DeviceCreationError) {
    // GPU device couldn't be created
  }
}
```

---

## Auto-Injected Uniforms

Every shader automatically has access to:

```wgsl
// Always available (group 0, binding 0)
struct Globals {
  resolution: vec2f,  // Current render target size
  time: f32,          // Seconds since init (affected by timeScale)
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;
```

**Note**: `globals.resolution` reflects the **current render target**, not the screen.

---

## Time Control

```typescript
// Pause/resume time
ctx.paused = true;
ctx.paused = false;

// Slow motion / fast forward
ctx.timeScale = 0.5; // Half speed
ctx.timeScale = 2.0; // Double speed

// Reset time to zero
ctx.time = 0;

// Read current time
console.log(ctx.time); // Seconds since init
```

---

## 1. Basic: Fullscreen Shader

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

### Shader Errors

Shader compilation errors are thrown with detailed info:

```typescript
try {
  const badPass = ctx.pass(/* wgsl */ `
    @fragment
    fn main() -> @location(0) vec4f {
      return unknownVariable; // Error!
    }
  `);
} catch (e) {
  if (e instanceof ShaderCompileError) {
    console.error(`Shader error at line ${e.line}, col ${e.column}:`);
    console.error(e.message);
    // e.source contains the full shader with error context
  }
}
```

---

## 2. Uniforms (Three.js Style)

Uniforms use the `{ value: X }` pattern so they can be shared and mutated externally.

```typescript
// Define uniforms object (can live anywhere in your code)
const waveUniforms = {
  amplitude: { value: 0.2 },
  frequency: { value: 10.0 },
  color: { value: [1.0, 0.5, 0.2] },
};

const wave = ctx.pass(
  /* wgsl */ `
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
`,
  { uniforms: waveUniforms }
);

// Later, anywhere in your code:
waveUniforms.amplitude.value = 0.5;
waveUniforms.color.value = [0.2, 0.8, 1.0];

// On next draw, uniforms are automatically updated
function frame() {
  waveUniforms.amplitude.value = Math.sin(performance.now() * 0.001) * 0.3;
  wave.draw();
  requestAnimationFrame(frame);
}
```

---

## 3. Render Targets

Render to an offscreen texture, then use it as input to another shader.

```typescript
// Create a render target with sampler options
const sceneBuffer = ctx.target(1024, 768, {
  format: "rgba8unorm",
  filter: "linear", // "linear" | "nearest"
  wrap: "clamp", // "clamp" | "repeat" | "mirror"
});

const scenePass = ctx.pass(/* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
`);

// Uniforms with texture reference
const blurUniforms = {
  inputTex: { value: sceneBuffer.texture },
};

const blurPass = ctx.pass(
  /* wgsl */ `
  @group(1) @binding(0) var inputTex: texture_2d<f32>;
  @group(1) @binding(1) var inputSampler: sampler;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return textureSample(inputTex, inputSampler, uv);
  }
`,
  { uniforms: blurUniforms }
);

function frame() {
  ctx.setTarget(sceneBuffer);
  scenePass.draw();

  ctx.setTarget(null); // Screen
  blurPass.draw();

  requestAnimationFrame(frame);
}
```

### Sampler Options

```typescript
const target = ctx.target(512, 512, {
  // Texture format
  format: "rgba8unorm", // Default
  // format: "rgba16float",   // HDR
  // format: "r16float",      // Single channel
  // format: "rg16float",     // Two channels

  // Filtering
  filter: "linear", // Smooth interpolation (default)
  // filter: "nearest",       // Pixelated (good for pixel art)

  // Wrapping
  wrap: "clamp", // Clamp to edge (default)
  // wrap: "repeat",          // Tile
  // wrap: "mirror",          // Mirror at edges
});
```

---

## 4. Ping-Pong Buffers (First-Class)

For iterative effects like fluid simulation, diffusion, blur, etc.

```typescript
// Create ping-pong buffer pair
const velocity = ctx.pingPong(128, 128, { format: "rg16float" });
const density = ctx.pingPong(512, 512);

// velocity.read  - current state (read from this)
// velocity.write - next state (write to this)
// velocity.swap() - swap read/write

const advectionUniforms = {
  uVelocity: { value: velocity.read.texture },
  uSource: { value: density.read.texture },
  dissipation: { value: 0.98 },
};

const advection = ctx.pass(
  /* wgsl */ `
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @group(1) @binding(2) var uSource: texture_2d<f32>;
  @group(1) @binding(3) var uSourceSampler: sampler;
  
  struct Params { dissipation: f32 }
  @group(1) @binding(4) var<uniform> params: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let vel = textureSample(uVelocity, uVelocitySampler, uv).xy;
    let coord = uv - vel * 0.01;
    return params.dissipation * textureSample(uSource, uSourceSampler, coord);
  }
`,
  { uniforms: advectionUniforms }
);

function frame() {
  ctx.autoClear = false;

  // Advect velocity
  advectionUniforms.uVelocity.value = velocity.read.texture;
  advectionUniforms.uSource.value = velocity.read.texture;
  ctx.setTarget(velocity.write);
  advection.draw();
  velocity.swap();

  // Advect density
  advectionUniforms.uVelocity.value = velocity.read.texture;
  advectionUniforms.uSource.value = density.read.texture;
  ctx.setTarget(density.write);
  advection.draw();
  density.swap();

  ctx.autoClear = true;

  ctx.setTarget(null);
  displayPass.draw();

  requestAnimationFrame(frame);
}
```

---

## 5. Blend Modes

```typescript
// Using enum presets
const particles = ctx.material(code, {
  blend: "additive",
});

// Available presets:
// "none"      - No blending (default, opaque)
// "alpha"     - Standard transparency (src-alpha, one-minus-src-alpha)
// "additive"  - Add colors (src-alpha, one) - good for glow, fire
// "multiply"  - Darken (dst-color, zero)
// "screen"    - Lighten (one, one-minus-src-color)

// Custom blend (advanced)
const customBlend = ctx.pass(code, {
  blend: {
    color: {
      src: "src-alpha",
      dst: "one-minus-src-alpha",
      operation: "add",
    },
    alpha: {
      src: "one",
      dst: "one-minus-src-alpha",
      operation: "add",
    },
  },
});
```

---

## 6. Resize Handling

```typescript
const ctx = await gpu.init(canvas, {
  dpr: window.devicePixelRatio,
});

// Create render targets
const sceneBuffer = ctx.target(canvas.width, canvas.height);

// Handle resize manually
window.addEventListener("resize", () => {
  // Resize the context (updates canvas size)
  ctx.resize(window.innerWidth, window.innerHeight);

  // Resize render targets that should match screen size
  sceneBuffer.resize(ctx.width, ctx.height);

  // Note: ping-pong buffers often stay fixed size (e.g., simulation resolution)
});
```

---

## 7. Viewport / Scissor

Render to a portion of the target:

```typescript
// Set viewport (x, y, width, height)
ctx.setViewport(0, 0, 400, 300);
pass.draw(); // Only renders to bottom-left 400x300

// Reset to full target
ctx.setViewport(); // No args = full target

// Scissor test (clip rendering)
ctx.setScissor(100, 100, 200, 200);
pass.draw(); // Pixels outside scissor are not affected
ctx.setScissor(); // Disable scissor
```

---

## 8. Manual Clear

```typescript
ctx.autoClear = false;

// Clear specific target to color
ctx.clear(myTarget); // Black
ctx.clear(myTarget, [1, 0, 0, 1]); // Red

// Clear screen
ctx.clear(null, [0, 0, 0, 1]);

// Clear current target
ctx.setTarget(myTarget);
ctx.clear(); // Uses current target
```

---

## 9. Reading Pixels (GPU → CPU)

```typescript
// Read entire render target
const pixels = await target.readPixels();
// Returns Uint8Array for rgba8, Float32Array for float formats

// Read a region
const region = await target.readPixels(x, y, width, height);

// Example: Save screenshot
const pixels = await ctx.readPixels(); // Read screen
const imageData = new ImageData(
  new Uint8ClampedArray(pixels),
  ctx.width,
  ctx.height
);
// ... use with canvas 2D or download
```

---

## 10. Cleanup / Dispose

```typescript
// Dispose individual resources
myTarget.dispose();
myPass.dispose();
myMaterial.dispose();
particleBuffer.dispose();

// Dispose entire context (frees all resources)
ctx.dispose();
```

---

## 11. Debug Mode

```typescript
const ctx = await gpu.init(canvas, {
  debug: true, // Enables validation, warnings, timing
});

// Performance timing
ctx.beginQuery("fluid-sim");
// ... fluid simulation passes ...
const fluidTime = ctx.endQuery("fluid-sim");
console.log(`Fluid sim: ${fluidTime.toFixed(2)}ms`);

// GPU memory usage (approximate)
console.log(`GPU memory: ${ctx.memoryUsage} bytes`);
```

---

## 12. Shared Shader Code (Includes)

Use template strings to share code between shaders:

```typescript
// Common utility functions
const noise = /* wgsl */ `
  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }
  
  fn noise2d(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2f(1, 0)), u.x),
      mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), u.x),
      u.y
    );
  }
  
  fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var pos = p;
    for (var i = 0; i < 5; i++) {
      value += amplitude * noise2d(pos);
      pos *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const colorUtils = /* wgsl */ `
  fn hsvToRgb(hsv: vec3f) -> vec3f {
    let h = hsv.x * 6.0;
    let c = hsv.z * hsv.y;
    let x = c * (1.0 - abs(h % 2.0 - 1.0));
    let m = hsv.z - c;
    var rgb: vec3f;
    if (h < 1.0) { rgb = vec3f(c, x, 0); }
    else if (h < 2.0) { rgb = vec3f(x, c, 0); }
    else if (h < 3.0) { rgb = vec3f(0, c, x); }
    else if (h < 4.0) { rgb = vec3f(0, x, c); }
    else if (h < 5.0) { rgb = vec3f(x, 0, c); }
    else { rgb = vec3f(c, 0, x); }
    return rgb + m;
  }
`;

// Use in shader
const effect = ctx.pass(/* wgsl */ `
  ${noise}
  ${colorUtils}

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let n = fbm(uv * 10.0 + globals.time * 0.5);
    let color = hsvToRgb(vec3f(n, 0.8, 1.0));
    return vec4f(color, 1.0);
  }
`);
```

---

## 13. Materials (Custom Geometry)

For particles, instanced rendering, or future 3D support.

```typescript
const particleMaterial = ctx.material(
  /* wgsl */ `
  struct Particle {
    position: vec2f,
    velocity: vec2f,
    life: f32,
  }

  @group(1) @binding(0) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) life: f32,
    @location(1) uv: vec2f,
  }

  @vertex
  fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32
  ) -> VertexOutput {
    let p = particles[iid];
    
    var quadPos = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
    );
    
    let size = 0.01;
    let worldPos = p.position + quadPos[vid] * size;
    
    var out: VertexOutput;
    out.pos = vec4f(worldPos * 2.0 - 1.0, 0.0, 1.0);
    out.life = p.life;
    out.uv = quadPos[vid] * 0.5 + 0.5;
    return out;
  }

  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let d = length(in.uv - 0.5);
    if (d > 0.5) { discard; }
    
    let alpha = smoothstep(0.5, 0.3, d) * smoothstep(0.0, 0.5, in.life);
    return vec4f(1.0, 0.6, 0.2, alpha);
  }
`,
  {
    vertexCount: 6,
    instances: 10000,
    blend: "additive",
  }
);

const particleBuffer = ctx.storage(10000 * 5 * 4);
particleMaterial.storage("particles", particleBuffer);
```

---

## 14. Multiple Render Targets (MRT)

Write to multiple textures in one pass:

```typescript
const gbuffer = ctx.mrt(
  {
    albedo: { format: "rgba8unorm" },
    normal: { format: "rgba16float" },
    depth: { format: "r32float" },
  },
  1024,
  768
);

const gbufferPass = ctx.pass(/* wgsl */ `
  struct GBufferOutput {
    @location(0) albedo: vec4f,
    @location(1) normal: vec4f,
    @location(2) depth: vec4f,
  }

  @fragment
  fn main(@builtin(position) pos: vec4f) -> GBufferOutput {
    var out: GBufferOutput;
    out.albedo = vec4f(1.0, 0.5, 0.2, 1.0);
    out.normal = vec4f(0.0, 0.0, 1.0, 1.0);
    out.depth = vec4f(0.5, 0.0, 0.0, 1.0);
    return out;
  }
`);

ctx.setTarget(gbuffer);
gbufferPass.draw();

// Access individual textures
compositeUniforms.albedo.value = gbuffer.albedo.texture;
compositeUniforms.normal.value = gbuffer.normal.texture;
compositeUniforms.depth.value = gbuffer.depth.texture;
```

---

## Complete API Summary

```typescript
// === Module ===
gpu.isSupported() → boolean
gpu.init(canvas, options?) → Promise<Context>

// === Init Options ===
{
  dpr?: number,           // Device pixel ratio (default: 1)
  debug?: boolean,        // Enable debug mode (default: false)
}

// === Context ===
ctx.pass(fragmentWGSL, options?) → Pass
ctx.material(wgsl, options?) → Material
ctx.compute(wgsl, options?) → ComputeShader
ctx.target(width, height, options?) → RenderTarget
ctx.pingPong(width, height, options?) → PingPongTarget
ctx.mrt(outputs, width, height) → MultiRenderTarget
ctx.storage(byteSize) → StorageBuffer

ctx.setTarget(target | null) → void
ctx.setViewport(x?, y?, w?, h?) → void
ctx.setScissor(x?, y?, w?, h?) → void
ctx.clear(target?, color?) → void
ctx.resize(width, height) → void
ctx.dispose() → void

ctx.readPixels(x?, y?, w?, h?) → Promise<Uint8Array | Float32Array>

ctx.autoClear: boolean
ctx.width: number
ctx.height: number
ctx.time: number
ctx.timeScale: number
ctx.paused: boolean

// Debug mode only
ctx.beginQuery(name) → void
ctx.endQuery(name) → number
ctx.memoryUsage: number

// === Target Options ===
{
  format?: "rgba8unorm" | "rgba16float" | "r16float" | "rg16float",
  filter?: "linear" | "nearest",
  wrap?: "clamp" | "repeat" | "mirror",
}

// === Pass / Material Options ===
{
  uniforms?: { [name]: { value: T } },
  blend?: BlendMode | BlendConfig,
  vertexCount?: number,      // Material only
  instances?: number,        // Material only
}

// === Blend Modes ===
type BlendMode = "none" | "alpha" | "additive" | "multiply" | "screen"

// === Pass / Material ===
pass.draw() → void
pass.uniforms: { [name]: { value: T } }
pass.storage(name, buffer) → void
pass.dispose() → void

// === Compute ===
compute.dispatch(x, y?, z?) → void
compute.uniforms: { [name]: { value: T } }
compute.storage(name, buffer) → void
compute.dispose() → void

// === Render Target ===
target.texture: GPUTexture
target.width: number
target.height: number
target.resize(width, height) → void
target.readPixels(x?, y?, w?, h?) → Promise<ArrayBuffer>
target.dispose() → void

// === Ping Pong ===
pingPong.read: RenderTarget
pingPong.write: RenderTarget
pingPong.swap() → void
pingPong.resize(width, height) → void
pingPong.dispose() → void

// === MRT ===
mrt[name]: RenderTarget
mrt.resize(width, height) → void
mrt.dispose() → void

// === Storage Buffer ===
storage.dispose() → void

// === Auto Uniforms (always available in shaders) ===
struct Globals {
  resolution: vec2f,    // Current render target size
  time: f32,            // Seconds since init
  deltaTime: f32,       // Seconds since last frame
  frame: u32,           // Frame count
  aspect: f32,          // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;

// === Errors (all thrown) ===
WebGPUNotSupportedError
DeviceCreationError
ShaderCompileError { line, column, message, source }
```

---

## Features Confirmed ✓

| Feature             | Status | Notes                                                |
| ------------------- | ------ | ---------------------------------------------------- |
| Ping-pong buffers   | ✅     | First-class `.read`, `.write`, `.swap()`             |
| Three.js uniforms   | ✅     | `{ value: X }` pattern                               |
| Render call pattern | ✅     | `ctx.setTarget()` + `pass.draw()`                    |
| Pass vs Material    | ✅     | `pass` = fullscreen, `material` = custom             |
| Auto-clear control  | ✅     | `ctx.autoClear` + manual `ctx.clear()`               |
| Sampler config      | ✅     | Per-target `filter` and `wrap`                       |
| Blend modes         | ✅     | Enum presets + custom config                         |
| Resize handling     | ✅     | Manual `ctx.resize()`, `target.resize()`             |
| Dispose/cleanup     | ✅     | Individual + `ctx.dispose()`                         |
| Error handling      | ✅     | Throws exceptions                                    |
| Auto uniforms       | ✅     | `resolution`, `time`, `deltaTime`, `frame`, `aspect` |
| Time control        | ✅     | `paused`, `timeScale`, `time`                        |
| Read pixels         | ✅     | `readPixels()` async                                 |
| DPR support         | ✅     | Init option                                          |
| Shared code         | ✅     | Template strings                                     |
| Viewport/scissor    | ✅     | `setViewport()`, `setScissor()`                      |
| Debug mode          | ✅     | `debug` option, timing, memory                       |

---

_Ready to proceed with the Ralph implementation plan?_
