# Brain Index - Raymarching Gallery Project

## Overview
Creating 5 raymarching examples for ralph-gpu using WebGPU.

## Key Files
- `../../apps/examples/app/raymarching/page.tsx` - Reference implementation
- Examples to create in `../../apps/examples/app/`:
  - mandelbulb/page.tsx
  - terrain/page.tsx
  - metaballs/page.tsx
  - morphing/page.tsx
  - alien-planet/page.tsx

## Pattern for New Examples
See `conventions.md` for the exact pattern to follow.

## Technical Notes
- Uses WGSL shaders with `ctx.pass()`
- `globals` struct auto-injected: resolution, time, deltaTime, frame, aspect
- Canvas should have fixed dimensions (1280x720)
- Cleanup on unmount is critical (disposed flag, cancelAnimationFrame, ctx.dispose())
