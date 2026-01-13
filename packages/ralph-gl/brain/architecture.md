# ralph-gl Architecture (Updated)

## Design Philosophy

ralph-gl provides a similar developer experience to ralph-gpu but uses **GLSL ES 3.0 directly** (no WGSL transpilation). The API adapts to WebGL's capabilities while maintaining the same ergonomic patterns.

## Key Differences from ralph-gpu

### 1. Shader Language: GLSL ES 3.0 (Not WGSL)

Users write GLSL directly:
```typescript
// ralph-gl - GLSL ES 3.0
const pass = ctx.pass(/* glsl */ `
  #version 300 es
  precision highp float;
  
  out vec4 fragColor;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(uv, 0.5, 1.0);
  }
`)

// vs ralph-gpu - WGSL
const pass = ctx.pass(/* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
`)
```

### 2. Auto-Injected Uniforms (Same DX, Different Names)

GLSL uniforms injected automatically:
```glsl
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_deltaTime;
uniform float u_frame;
uniform float u_aspect;
```

### 3. API Similarities

**Same patterns:**
- `ctx.pass(shader)` - Fullscreen quad
- `ctx.material(vertexShader, fragmentShader)` - Custom geometry
- `ctx.target()` - Render targets
- `ctx.pingPong()` - Iterative effects
- `uniforms: { value: X }` - Three.js style

**Adaptations for WebGL:**
- Storage buffers → Vertex attributes or texture buffers
- Compute shaders → Transform feedback (limited)
- Bind groups → Uniform locations (handled internally)

## Core Components

### 1. GLContext (context.ts)

Main WebGL context manager:
```typescript
class GLContext {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement
  width: number
  height: number
  time: number
  deltaTime: number
  frame: number
  
  pass(fragmentShader: string, options?): Pass
  material(vertexShader: string, fragmentShader: string, options?): Material
  target(width?, height?, options?): RenderTarget
  pingPong(width?, height?, options?): PingPongTarget
  storage(byteSize: number): StorageBuffer
  
  setTarget(target: RenderTarget | null): void
  clear(color?: [number, number, number, number]): void
  resize(width: number, height: number): void
}
```

### 2. Pass (pass.ts)

Fullscreen fragment shader rendering:
```typescript
class Pass {
  uniforms: Record<string, { value: any }>
  
  draw(): void
  set(name: string, value: any): void
  dispose(): void
}
```

Built-in vertex shader for fullscreen quad:
```glsl
#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

### 3. Material (material.ts)

Custom vertex + fragment shaders:
```typescript
class Material {
  uniforms: Record<string, { value: any }>
  vertexCount: number
  instances: number
  topology: 'triangles' | 'lines' | 'points'
  
  storage(name: string, buffer: StorageBuffer): void
  draw(): void
  dispose(): void
}
```

### 4. RenderTarget (target.ts)

Framebuffer wrapper:
```typescript
class RenderTarget {
  framebuffer: WebGLFramebuffer
  texture: WebGLTexture
  width: number
  height: number
  format: TextureFormat
  
  resize(width: number, height: number): void
  readPixels(): Promise<Uint8Array | Float32Array>
  dispose(): void
}
```

### 5. StorageBuffer (storage.ts)

Flexible buffer emulation:
- For vertex data: WebGLBuffer
- For large data: Texture buffer
- For read-write: Transform feedback

```typescript
class StorageBuffer {
  buffer: WebGLBuffer | WebGLTexture
  byteSize: number
  
  write(data: TypedArray): void
  dispose(): void
}
```

## Uniform Handling

Auto-inject globals + user uniforms:
```typescript
// User writes:
const uniforms = {
  color: { value: [1, 0, 0] },
  amplitude: { value: 0.5 }
}

// GLSL shader receives:
uniform vec2 u_resolution;  // auto-injected
uniform float u_time;       // auto-injected
uniform vec3 u_color;       // user uniform
uniform float u_amplitude;  // user uniform
```

Type detection:
- `number` → `uniform float`
- `[x, y]` → `uniform vec2`
- `[x, y, z]` → `uniform vec3`
- `[x, y, z, w]` → `uniform vec4`
- `Float32Array(16)` → `uniform mat4`
- `RenderTarget` → `uniform sampler2D`

## Shader Injection Pattern

Automatically prepend to user shaders:
```glsl
#version 300 es
precision highp float;

// Auto-injected globals
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_deltaTime;
uniform float u_frame;
uniform float u_aspect;

// User uniforms extracted from shader
uniform vec3 u_color;
uniform float u_amplitude;

// User shader code follows...
```

## No Compute Shaders (Initially)

WebGL 2.0 doesn't have compute shaders. Options:
1. **Skip compute entirely** for v0.1.0
2. **Add later** with transform feedback for simple cases
3. **Document limitation** clearly

For particles: Use vertex shader + transform feedback.

## Bundle Size Target

**Goal: < 8kB gzipped** (no transpiler = smaller)

Optimizations:
- No WGSL parser/transpiler
- Minimal uniform handling code
- Tree-shakeable exports
- Aggressive minification

## Migration from ralph-gpu

```typescript
// ralph-gpu (WGSL)
const pass = ctx.pass(/* wgsl */ `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
`)

// ralph-gl (GLSL)
const pass = ctx.pass(/* glsl */ `
  out vec4 fragColor;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(uv, 0.5, 1.0);
  }
`)
```

Same patterns, different shader language. Both ergonomic!

Last Updated: 2026-01-12 20:05 UTC
