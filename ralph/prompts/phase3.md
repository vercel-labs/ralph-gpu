# Phase 3: Examples App

## Goal

Create a Next.js application with 6 interactive shader examples demonstrating the ralph-gpu library.

## Examples to Implement

### 1. Basic Gradient (`app/basic/page.tsx`)

**Demonstrates:**

- Simple fullscreen pass
- Auto-injected uniforms (resolution, time)
- Basic WGSL fragment shader

**Implementation:**

```typescript
const ctx = await gpu.init(canvasRef.current);

const gradient = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let color = mix(
      vec3f(1.0, 0.2, 0.5),
      vec3f(0.2, 0.5, 1.0),
      uv.y
    );
    return vec4f(color, 1.0);
  }
`);

// Animation loop
function render() {
  gradient.draw();
  requestAnimationFrame(render);
}
```

### 2. Custom Uniforms (`app/uniforms/page.tsx`)

**Demonstrates:**

- Three.js-style uniforms ({ value: X })
- Reactive updates from UI controls
- Animated wave effect

**Implementation:**

```typescript
const uniforms = {
  amplitude: { value: 0.5 },
  frequency: { value: 2.0 },
  speed: { value: 1.0 },
};

const wave = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let wave = sin(uv.x * uniforms.frequency + globals.time * uniforms.speed);
    let offset = wave * uniforms.amplitude;
    let color = vec3f(uv.x, uv.y + offset, 1.0 - uv.y);
    return vec4f(color, 1.0);
  }
`, { uniforms });

// UI controls update uniforms
<input
  type="range"
  value={amplitude}
  onChange={(e) => uniforms.amplitude.value = parseFloat(e.target.value)}
/>
```

### 3. Render Target (`app/render-target/page.tsx`)

**Demonstrates:**

- Offscreen rendering
- Texture sampling
- Multi-pass rendering

**Implementation:**

```typescript
const offscreen = ctx.target(512, 512);

const draw = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv.x, uv.y, sin(globals.time), 1.0);
  }
`);

const display = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return textureSample(uniforms.tex, sampler, uv);
  }
`, {
  uniforms: { tex: { value: offscreen.texture } }
});

// Render
ctx.setTarget(offscreen);
draw.draw();
ctx.setTarget(null);
display.draw();
```

### 4. Ping-Pong (`app/ping-pong/page.tsx`)

**Demonstrates:**

- Iterative effects
- Feedback loops
- Game of Life or diffusion

**Implementation:**

```typescript
const state = ctx.pingPong(512, 512);

// Initialize with random data
const init = ctx.pass(`...`);
ctx.setTarget(state.write);
init.draw();

// Update step
const update = ctx.pass(`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let current = textureSample(uniforms.state, sampler, uv);
    // Apply rules (e.g., diffusion, Game of Life)
    return current * 0.99; // Fade
  }
`, {
  uniforms: { state: { value: state.read.texture } }
});

// Display
const display = ctx.pass(`...`, {
  uniforms: { tex: { value: state.read.texture } }
});

// Animation loop
function render() {
  ctx.setTarget(state.write);
  update.draw();
  state.swap();
  
  ctx.setTarget(null);
  display.draw();
}
```

### 5. Particles (`app/particles/page.tsx`)

**Demonstrates:**

- Compute shaders
- Storage buffers
- Instanced rendering with Material
- GPU particle system

**Implementation:**

```typescript
const PARTICLE_COUNT = 10000;

// Create storage buffer
const particles = ctx.storage(PARTICLE_COUNT * 16); // vec4 per particle

// Compute shader to update particles
const update = ctx.compute(`
  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= ${PARTICLE_COUNT}) { return; }
    
    var particle = particles[i];
    particle.xy += particle.zw * 0.01; // velocity
    particle.zw *= 0.99; // damping
    
    // Wrap around
    if (particle.x < -1.0) { particle.x = 1.0; }
    if (particle.x > 1.0) { particle.x = -1.0; }
    if (particle.y < -1.0) { particle.y = 1.0; }
    if (particle.y > 1.0) { particle.y = -1.0; }
    
    particles[i] = particle;
  }
`).storage(particles);

// Material to render particles
const render = ctx.material(`
  struct Particle {
    pos: vec2f,
    vel: vec2f,
  }
  @group(0) @binding(0) var<storage> particles: array<Particle>;
  
  @vertex
  fn vs(@builtin(instance_index) i: u32) -> @builtin(position) vec4f {
    return vec4f(particles[i].pos, 0.0, 1.0);
  }
  
  @fragment
  fn fs() -> @location(0) vec4f {
    return vec4f(1.0, 0.5, 0.2, 1.0);
  }
`, {
  vertexCount: 1,
  instances: PARTICLE_COUNT,
}).storage(particles);

// Animation
function animate() {
  update.dispatch(Math.ceil(PARTICLE_COUNT / 256));
  render.draw();
  requestAnimationFrame(animate);
}
```

### 6. Fluid Simulation (`app/fluid/page.tsx`)

**Demonstrates:**

- Complex multi-pass rendering
- Mouse interaction
- Multiple ping-pong buffers
- Advanced shader techniques

**Implementation:**

Based on the OGL example from DX_EXAMPLES.md:

- Velocity field (ping-pong)
- Pressure field (ping-pong)
- Dye field (ping-pong)
- Multiple passes: advection, divergence, pressure, gradient subtract, splat
- Mouse interaction to add impulses

This is the most complex example showing the full power of the library.

## UI Components

### Layout (`app/layout.tsx`)

- Root HTML structure
- Global styles
- Metadata

### Home Page (`app/page.tsx`)

- Grid of example cards
- Each card links to an example
- Brief description of each
- Styled with CSS

### Example Page Template

Each example should have:

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { gpu } from 'ralph-gpu';

export default function ExamplePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let animationId: number;
    let ctx: Context;
    
    async function init() {
      if (!canvasRef.current) return;
      
      ctx = await gpu.init(canvasRef.current);
      
      // ... setup shaders ...
      
      function render() {
        // ... render logic ...
        animationId = requestAnimationFrame(render);
      }
      render();
    }
    
    init();
    
    return () => {
      cancelAnimationFrame(animationId);
      ctx?.dispose();
    };
  }, []);
  
  return (
    <div className="example-container">
      <canvas ref={canvasRef} />
      <div className="overlay">
        <h1>Example Name</h1>
        <a href="/">← Back</a>
      </div>
    </div>
  );
}
```

### Global Styles (`app/globals.css`)

- Full viewport canvas
- Dark theme
- Overlay for UI elements
- Responsive design

## File Structure

```
apps/examples/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── basic/
│   │   └── page.tsx
│   ├── uniforms/
│   │   └── page.tsx
│   ├── render-target/
│   │   └── page.tsx
│   ├── ping-pong/
│   │   └── page.tsx
│   ├── particles/
│   │   └── page.tsx
│   └── fluid/
│       └── page.tsx
├── components/
│   ├── ExampleCard.tsx
│   └── Canvas.tsx (optional)
└── public/
    └── (any assets)
```

## Completion Criteria

Before calling `markComplete`, verify:

- [ ] All 6 examples are implemented
- [ ] Home page lists all examples with working links
- [ ] Each example renders correctly (visually verify)
- [ ] No console errors
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Next.js builds successfully (`pnpm build --filter=examples`)
- [ ] Responsive design works on different screen sizes
- [ ] Examples are interactive where applicable (mouse input works)

## Development Workflow

1. Start dev server: `pnpm dev --filter=examples`
2. Implement examples one by one
3. Test each in the browser
4. Fix any WebGPU errors
5. Ensure clean shutdown (dispose resources)

## Common Issues

- Canvas sizing: Set width/height attributes, not just CSS
- WebGPU context loss: Handle gracefully
- RAF cleanup: Always cancel animation frame
- Memory leaks: Dispose contexts on unmount
- Async init: Handle loading states

## Styling Tips

- Full viewport canvas: `width: 100vw; height: 100vh;`
- Overlay UI: `position: absolute; top: 0; left: 0;`
- Dark background: Complements shader visuals
- Readable text: White on semi-transparent dark background

## Reference

- **DX_EXAMPLES.md** — API reference and code examples
- **Phase 2** — Core library implementation
- OGL Fluid Example in DX_EXAMPLES.md for fluid simulation
