# ralph-gl

<p align="center">
  <strong>~10kB WebGL 2.0 shader library</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/gzip-0.0kB-blue" alt="gzip size">
  <img src="https://img.shields.io/badge/brotli-0.0kB-purple" alt="brotli size">
  <img src="https://img.shields.io/badge/status-🚧%20WIP-yellow" alt="status">
</p>

---

## 🚧 Work in Progress

ralph-gl is under active development. API may change.

---

## Overview

ralph-gl is a minimal WebGL 2.0 shader library designed to provide the same ergonomic API as [ralph-gpu](../core) but targeting WebGL 2.0 for broader browser compatibility.

**Key Features:**
- Same API as ralph-gpu (where feasible)
- Works in all browsers with WebGL 2.0 support
- Small bundle size (target: <10kB gzipped)
- Auto-injected globals (resolution, time, frame)
- Three.js-style uniform syntax

## Installation

```bash
# Not yet published
pnpm add ralph-gl
```

## Quick Start

```typescript
import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create a fullscreen pass
const gradient = ctx.pass(`
  void main() {
    vec2 uv = gl_FragCoord.xy / u_globals_resolution;
    fragColor = vec4(uv, 0.5, 1.0);
  }
`)

// Render loop
function animate() {
  gradient.draw()
  requestAnimationFrame(animate)
}
animate()
```

## API Reference

See [packages/core (ralph-gpu)](../core) for API reference. ralph-gl aims to match this API.

### Key Differences from ralph-gpu

| Feature | ralph-gpu (WebGPU) | ralph-gl (WebGL) |
|---------|-------------------|------------------|
| Shader Language | WGSL | GLSL ES 3.0 |
| Compute Shaders | ✅ Native | ⚠️ Transform feedback (limited) |
| Storage Buffers | ✅ Native | ⚠️ Texture/vertex buffer emulation |
| Browser Support | Chrome/Edge/Safari | All modern browsers |

## Browser Compatibility

- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Check bundle size
pnpm size
```

## License

MIT

## Related

- [ralph-gpu](../core) - WebGPU version
- [Examples](../../apps/examples) - Live examples
