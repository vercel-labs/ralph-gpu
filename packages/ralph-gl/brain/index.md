# ralph-gl Brain

This is the persistent knowledge base for the ralph-gl (WebGL) project.

## Project Overview

ralph-gl is a WebGL version of the ralph-gpu library, providing the same ergonomic API and developer experience but targeting WebGL 2.0 for broader browser compatibility.

## Key Goals

1. **API Compatibility**: Match ralph-gpu's API surface as closely as possible
2. **WebGL 2.0 Target**: Use WebGL 2.0 for maximum browser compatibility
3. **Small Bundle Size**: Target ~8-10kB gzipped (slightly larger than WebGPU due to compatibility layer)
4. **Same DX**: Developers should be able to switch between ralph-gpu and ralph-gl with minimal changes
5. **Progressive Enhancement**: Easy to use both libraries and feature-detect at runtime

## Architecture Overview

```
packages/ralph-gl/
├── brain/                    # Persistent knowledge (this folder)
│   ├── index.md             # Main brain file
│   ├── architecture.md      # Architecture decisions
│   ├── conventions.md       # Coding conventions
│   ├── progress.md          # Overall progress tracking
│   └── decisions/           # Architectural decision records
├── src/                     # Source code
│   ├── index.ts            # Main entry point
│   ├── context.ts          # WebGL context wrapper
│   ├── pass.ts             # Fullscreen pass implementation
│   ├── material.ts         # Custom geometry rendering
│   ├── compute.ts          # Compute shader emulation (transform feedback)
│   ├── target.ts           # Render target (framebuffer)
│   ├── ping-pong.ts        # Ping-pong buffers
│   ├── storage.ts          # Storage buffer emulation
│   ├── uniforms.ts         # Uniform handling
│   ├── errors.ts           # Error types
│   └── types.ts            # TypeScript types
├── tests/                   # Unit tests
├── scripts/                 # Build scripts
│   └── bundle-size.js      # Bundle size reporting
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md

apps/documentation/
├── app/                     # Next.js app directory
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── getting-started/    # Getting started guide
│   ├── api/                # API reference pages
│   ├── examples/           # Example pages (one per example)
│   │   ├── basic/
│   │   ├── uniforms/
│   │   ├── render-target/
│   │   ├── ping-pong/
│   │   ├── particles/
│   │   └── ...
│   └── concepts/           # Core concepts documentation
├── components/             # Shared components
│   ├── Navigation.tsx      # Sidebar navigation
│   ├── CodeBlock.tsx       # Code syntax highlighting
│   └── ExampleCanvas.tsx   # Canvas wrapper for examples
├── package.json
└── next.config.js
```

## WebGL vs WebGPU Mapping

| WebGPU Concept | WebGL Equivalent | Notes |
|----------------|------------------|-------|
| GPUDevice | WebGL2RenderingContext | Direct mapping |
| GPUBuffer | WebGLBuffer | Use with bufferData/bufferSubData |
| GPUTexture | WebGLTexture | Framebuffer attachments |
| GPUSampler | Texture parameters | Set on texture, not separate object |
| Bind Groups | Uniform locations | Manual location tracking |
| Storage Buffers | Transform feedback / Textures | Complex mapping for compute-like ops |
| Compute Shaders | Transform feedback | Limited, for particle updates |
| WGSL | GLSL ES 3.0 | Need WGSL→GLSL transpiler |

## Key Technical Challenges

### 1. WGSL to GLSL Translation
- Need to parse WGSL and generate GLSL ES 3.0
- Handle struct definitions, bind groups, entry points
- Map builtin variables (`@builtin(position)` → `gl_Position`)

### 2. Bind Group Emulation
- WebGPU uses bind groups, WebGL uses uniform locations
- Need to extract uniform declarations and track locations
- Handle texture/sampler binding

### 3. Storage Buffer Emulation
- WebGPU has storage buffers (read/write), WebGL 2.0 doesn't
- Options: Transform feedback for compute-like operations, texture buffers for large data
- May need to document limitations

### 4. Compute Shader Emulation
- WebGPU has native compute shaders, WebGL doesn't
- Use transform feedback for particle updates
- Render to texture for general GPU computation
- Document when compute operations aren't feasible

## Development Phases

### Phase 1: Core Infrastructure (Ralph 1-3)
- [ ] Package scaffolding (package.json, build setup, webpack config)
- [ ] Basic WebGL context initialization
- [ ] Error types and handling
- [ ] WGSL to GLSL transpiler (basic version)

### Phase 2: Core Rendering (Ralph 4-7)
- [ ] Pass implementation (fullscreen quad rendering)
- [ ] Uniform handling and auto-injected globals
- [ ] RenderTarget (framebuffer wrappers)
- [ ] Ping-pong buffers

### Phase 3: Advanced Features (Ralph 8-11)
- [ ] Material implementation (custom geometry)
- [ ] Storage buffer emulation (texture-based)
- [ ] Compute shader emulation (transform feedback)
- [ ] Blend modes

### Phase 4: Documentation & Examples (Ralph 12-15)
- [ ] Documentation app setup (Next.js)
- [ ] API documentation pages
- [ ] Basic examples (gradient, uniforms, render target)
- [ ] Advanced examples (particles, ping-pong, compute)

### Phase 5: Polish & Release (Ralph 16-18)
- [ ] Bundle size optimization
- [ ] Browser compatibility testing
- [ ] Performance benchmarking
- [ ] README and publishing prep

## Success Criteria

- [ ] API matches ralph-gpu where feasible
- [ ] Bundle size < 10kB gzipped
- [ ] Works in Chrome, Firefox, Safari (WebGL 2.0 support)
- [ ] All examples working and documented
- [ ] Published to npm as `ralph-gl`
- [ ] Documentation site live

## Related Files

- ralph-gpu core: `/packages/core/`
- ralph-gpu examples: `/apps/examples/`
- ralph-gpu docs: `/apps/docs/`

## Notes

- Keep API surface identical to ralph-gpu where possible
- Document differences (e.g., compute shader limitations)
- Provide migration guide for switching between libraries
- Consider a unified package that exports both APIs with runtime detection

Last Updated: 2026-01-12
