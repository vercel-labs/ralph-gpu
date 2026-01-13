# Ralph GL Architecture

## Overview
Ralph GL is a WebGL 2.0 rendering library using GLSL ES 3.0 directly (no WGSL transpiler).

## Core Components

### GLContext
The foundational class that manages WebGL 2.0 state:
- `gl` - WebGL2RenderingContext
- `canvas` - HTMLCanvasElement
- `width/height` - Canvas dimensions (with DPR support)
- `time/deltaTime/frame` - Animation frame timing

Key methods:
- `isSupported()` - Static check for WebGL 2.0 availability
- `init(canvas, options)` - Create and configure context
- `resize(width, height)` - Resize with device pixel ratio support
- `clear(color)` - Clear color and depth buffers
- `updateTime()` - Update time tracking for animation
- `destroy()` - Clean up resources

## Design Principles
1. **Simple API** - Fluent interface with method chaining
2. **WebGL 2.0 native** - Direct GLSL ES 3.0, no transpilation
3. **DPR aware** - Automatic device pixel ratio handling
4. **Resource management** - Proper cleanup on destroy
