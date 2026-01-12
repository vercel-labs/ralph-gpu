# Brain Index - ralph-gpu Documentation App

## Overview

Creating a comprehensive documentation web application for the ralph-gpu WebGPU shader library.

## Project Structure

- Documentation app location: `../../apps/docs/` (Next.js app)
- Source material: `../../packages/core/README.md` (ralph-gpu library)
- Examples reference: `../../apps/examples/` (working examples)

## Key Files to Document

- `packages/core/src/index.ts` - Main exports
- `packages/core/src/context.ts` - GPUContext class
- `packages/core/src/pass.ts` - Pass (fullscreen shader)
- `packages/core/src/material.ts` - Material (custom vertex)
- `packages/core/src/compute.ts` - Compute shaders
- `packages/core/src/target.ts` - Render targets
- `packages/core/src/ping-pong.ts` - Ping-pong buffers
- `packages/core/src/storage.ts` - Storage buffers
- `packages/core/src/types.ts` - Type definitions

## Documentation Sections

1. Getting Started
2. Core Concepts
3. API Reference
4. Examples (with live demos)
5. Advanced Topics

## Technical Stack

- Next.js (React)
- Tailwind CSS for styling
- MDX for documentation content
- Live code examples with ralph-gpu
