# Brain Index

Knowledge base for the ralph-gpu examples project.

## What's Documented

- **examples-summary.md** (root) - Complete summary of all examples in the examples app
- This index file

## Project Overview

The examples app (`../../apps/examples/`) is a Next.js application demonstrating the `ralph-gpu` library - a minimal WebGPU shader library. It contains 8 examples ranging from basic gradient shaders to complex fluid simulations and 3D raymarching.

## Key Files

- `apps/examples/app/page.tsx` - Main index with links to all examples
- `apps/examples/app/*/page.tsx` - Individual example pages
- `apps/examples/app/components/ExampleCard.tsx` - Reusable card component

## ralph-gpu Library

The library provides a clean API for WebGPU:
- `gpu.init()` - Initialize context
- `ctx.pass()` - Fragment shaders
- `ctx.material()` - Custom vertex+fragment shaders
- `ctx.compute()` - Compute shaders
- `ctx.target()` / `ctx.pingPong()` - Render targets
- `ctx.storage()` - GPU storage buffers

Uses Three.js-style uniform syntax: `{ value: X }`
