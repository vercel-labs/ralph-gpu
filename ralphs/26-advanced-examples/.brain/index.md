# Ralph-GL Project Brain

## Overview
Ralph-GL is a lightweight WebGL2 abstraction library built with TypeScript. It provides clean abstractions for common WebGL operations.

## Project Structure
- `packages/ralph-gl/` - The main WebGL library
  - `src/core/` - Core WebGL wrappers (Context, Program, Shader, Buffer, Mesh)
  - `src/utils/` - Utilities (PingPong for feedback effects)
  - `src/materials/` - Material system for shading
- `apps/docs/` - Next.js documentation app with interactive examples
  - `app/examples/` - Example pages demonstrating ralph-gl features

## Key Files
- `progress.md` - Implementation progress tracking

## Examples
Located in `apps/docs/app/examples/`:
- `triangle/` - Basic triangle rendering
- `particles/` - Instanced particle system (10k particles)
- `pingpong/` - Feedback blur effect with ping-pong buffers
- `material/` - Custom 3D geometry (rotating lit cube)
