# Ralph-GPU Examples Registry

## Overview
A centralized registry of all examples in the `ralph-gpu` repository. This registry is used to populate the gallery and provide initial shader code for the interactive playground.

## Location
- Registry File: `apps/examples/lib/examples.ts`
- Examples Directory: `apps/examples/app/`

## Metadata Structure
```typescript
export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: "basics" | "techniques" | "simulations" | "advanced" | "features";
  shaderCode: string;
}
```

## Categories
- **basics**: basic, uniforms, geometry, lines
- **techniques**: render-target, ping-pong, particles, compute
- **simulations**: fluid, raymarching
- **advanced**: metaballs, morphing, mandelbulb, terrain, alien-planet
- **features**: triangle-particles, texture-sampling, storage-texture

## Extraction Logic
Shader code is extracted from `page.tsx` files by looking for the largest WGSL template literal block (`/* wgsl */ \`...\``). This handles cases where examples have multiple passes by picking the most substantial one.
