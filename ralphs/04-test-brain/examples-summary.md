# ralph-gpu Examples App Summary

A Next.js application showcasing the capabilities of the `ralph-gpu` WebGPU shader library. The examples progressively build from simple to complex, demonstrating various GPU programming techniques.

## Examples Overview

### 1. Basic Gradient (`/basic`)
**Simple fullscreen shader with time-based animation**

The most basic example demonstrating the core workflow:
- Initialize WebGPU context with `gpu.init()`
- Create a fragment shader pass with `ctx.pass()`
- Access built-in `globals.resolution` and `globals.time` uniforms
- Run an animation loop with `requestAnimationFrame`

**Key API:** `gpu.init()`, `ctx.pass()`, `pass.draw()`

---

### 2. Custom Uniforms (`/uniforms`)
**Animated wave with controllable parameters**

Demonstrates the Three.js-style uniform pattern:
- Define uniforms as objects with `{ value: X }` syntax
- Pass uniforms to shader via options: `ctx.pass(shader, { uniforms })`
- Animate uniform values each frame
- Uniforms support scalars, arrays (vec3), and can be dynamically updated

**Key API:** Uniforms with `{ value: X }` pattern

---

### 3. Render Target (`/render-target`)
**Render to texture and post-processing**

Shows offscreen rendering workflow:
- Create render targets with `ctx.target(width, height, options)`
- Switch render targets with `ctx.setTarget(target)` or `ctx.setTarget(null)` for screen
- Pass textures as uniforms: `{ inputTex: { value: renderTarget } }`
- Apply post-processing effects (vignette in this example)

**Key API:** `ctx.target()`, `ctx.setTarget()`

---

### 4. Ping-Pong Buffers (`/ping-pong`)
**Iterative diffusion simulation**

Demonstrates double-buffered textures for iterative effects:
- Create ping-pong buffers with `ctx.pingPong(width, height, options)`
- Access read/write buffers via `simulation.read` and `simulation.write`
- Swap buffers after each iteration with `simulation.swap()`
- Control auto-clear with `ctx.autoClear = false`

**Key API:** `ctx.pingPong()`, `.read`, `.write`, `.swap()`

---

### 5. Particles (`/particles`)
**Instanced rendering with storage buffers**

Shows GPU storage buffers and instanced rendering:
- Create storage buffers with `ctx.storage(sizeInBytes)`
- Write initial data with `buffer.write(Float32Array)`
- Use `ctx.material()` for custom vertex + fragment shaders
- Configure instances with `{ vertexCount, instances, blend }` options
- Bind storage buffers to materials with `material.storage("name", buffer)`

**Key API:** `ctx.storage()`, `ctx.material()`, `.storage()` binding

---

### 6. Compute Shader (`/compute`)
**GPU particle physics simulation**

Demonstrates compute shaders for GPU computation:
- Create compute shaders with `ctx.compute(wgslCode)`
- Bind storage buffers with `compute.storage("name", buffer)`
- Dispatch workgroups with `compute.dispatch(count)`
- Combine compute updates with instanced rendering
- Physics simulation: velocity, gravity, bouncing, friction

**Key API:** `ctx.compute()`, `compute.dispatch()`, `compute.storage()`

---

### 7. Fluid Simulation (`/fluid`)
**Full Navier-Stokes with curl, vorticity & pressure**

Complex multi-pass simulation demonstrating:
- Multiple ping-pong buffers (velocity, dye, pressure)
- Single render targets (divergence, curl)
- Complete Navier-Stokes fluid solver:
  - Splat pass (add velocity/dye)
  - Curl calculation (vorticity)
  - Vorticity confinement
  - Divergence calculation
  - Pressure solve (Jacobi iteration)
  - Gradient subtraction
  - Advection
- Different texture formats: `rg16float`, `rgba16float`, `r16float`
- Tone mapping and gamma correction in display

**Key API:** Multi-pass rendering orchestration, various texture formats

---

### 8. 3D Raymarching (`/raymarching`)
**Raymarched scene with SDFs, soft shadows & ambient occlusion**

Advanced fragment shader demonstrating:
- Signed Distance Functions (SDF) primitives: sphere, box, torus, capsule, octahedron
- SDF operations: union, subtraction, intersection (sharp and smooth variants)
- 3D rotation helpers
- Raymarching algorithm with material IDs
- Soft shadows
- Ambient occlusion
- Blinn-Phong specular lighting
- Multiple light sources
- Fresnel rim lighting
- Fog and vignette effects
- Tone mapping and gamma correction

**Key API:** Pure fragment shader, demonstrating WGSL capabilities

---

## Patterns Observed

### 1. **React Integration Pattern**
All examples follow a consistent React pattern:
```javascript
useEffect(() => {
  let disposed = false;
  let ctx = null;
  
  async function init() {
    ctx = await gpu.init(canvas);
    if (disposed) { ctx.dispose(); return; }
    // ... setup
    function frame() {
      if (disposed) return;
      // ... render
      requestAnimationFrame(frame);
    }
    frame();
  }
  
  init();
  return () => { disposed = true; ctx?.dispose(); };
}, []);
```

### 2. **WebGPU Support Check**
Every example checks for WebGPU support:
```javascript
if (!gpu.isSupported()) {
  console.error('WebGPU is not supported');
  return;
}
```

### 3. **Three.js-Style Uniforms**
Uniforms use familiar Three.js syntax:
```javascript
const uniforms = {
  amplitude: { value: 0.5 },
  color: { value: [1.0, 0.5, 0.2] },
  texture: { value: renderTarget },
};
```

### 4. **Progressive Complexity**
Examples build on each other:
- Basic → Uniforms → Render Targets → Ping-Pong → Storage/Compute → Complex Simulations

### 5. **Consistent Init Options**
```javascript
ctx = await gpu.init(canvas, {
  dpr: Math.min(window.devicePixelRatio, 2),
  debug: true,
});
```

### 6. **Built-in Globals**
All shaders have access to:
- `globals.resolution` - Canvas size in pixels
- `globals.time` - Time in seconds
- `globals.aspect` - Aspect ratio

---

## Library API Summary

| Method | Purpose |
|--------|---------|
| `gpu.isSupported()` | Check WebGPU availability |
| `gpu.init(canvas, options)` | Initialize context |
| `ctx.pass(fragmentShader, options)` | Create fragment-only pass |
| `ctx.material(shader, options)` | Create vertex+fragment material |
| `ctx.compute(computeShader)` | Create compute shader |
| `ctx.target(w, h, options)` | Create render target |
| `ctx.pingPong(w, h, options)` | Create double-buffered targets |
| `ctx.storage(bytes)` | Create storage buffer |
| `ctx.setTarget(target)` | Switch render target |
| `ctx.dispose()` | Clean up resources |
| `pass.draw()` | Execute render pass |
| `compute.dispatch(count)` | Execute compute workgroups |
| `material.storage(name, buffer)` | Bind storage buffer |
| `buffer.write(data)` | Upload data to GPU |
