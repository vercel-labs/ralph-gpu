# Phase 2: Core Library Implementation

## Goal

Implement the complete ralph-gpu core library following the API specification in DX_EXAMPLES.md.

## CRITICAL: Read First

**BEFORE starting implementation, you MUST:**

1. Read `DX_EXAMPLES.md` from start to finish to understand the API
2. Review the features table to know what needs to be implemented
3. Understand the Three.js-style API patterns (uniforms, setTarget, etc.)

## Implementation Order

Follow this order to build incrementally:

### Step 1: Types and Errors

**Files: `src/types.ts`, `src/errors.ts`**

Define TypeScript interfaces and types:

- `GPUContextOptions` — init options
- `RenderTargetOptions` — format, filter, wrap
- `PassOptions` — blend modes, uniforms
- `MaterialOptions` — vertexCount, instances, blend
- `ComputeOptions` — workgroup size
- `PingPongOptions` — render target options
- `Uniforms` — { [key: string]: { value: any } }
- `BlendMode` — enum or string union
- `FilterMode`, `WrapMode` — enums

Create custom error classes:

- `WebGPUNotSupportedError`
- `DeviceCreationError`
- `ShaderCompileError`

### Step 2: GPU Context (src/context.ts)

**Main entry point: `gpu` object**

Implement:

```typescript
export const gpu = {
  isSupported(): boolean,
  init(canvas: HTMLCanvasElement, options?: GPUContextOptions): Promise<Context>
};
```

`Context` class should have:

- Properties: width, height, time, timeScale, paused, autoClear, dpr
- Methods:
  - `pass(fragmentWGSL, options?)` → Pass
  - `material(wgsl, options?)` → Material
  - `compute(wgsl, options?)` → Compute
  - `target(width, height, options?)` → RenderTarget
  - `pingPong(width, height, options?)` → PingPong
  - `mrt(outputs, width, height)` → MRT
  - `storage(byteSize)` → StorageBuffer
  - `setTarget(target?)` — Set render target (null = screen)
  - `setViewport(x, y, width, height)` — Set viewport
  - `setScissor(x, y, width, height)` — Set scissor rect
  - `clear(target?, color?)` — Manual clear
  - `resize(width?, height?)` — Resize canvas and update targets
  - `dispose()` — Cleanup all resources

Internal state:

- GPUDevice, GPUCanvasContext
- Current render target
- Frame counter
- Start time for animation
- List of auto-uniforms to update

### Step 3: Render Targets (src/target.ts)

**Class: `RenderTarget`**

Properties:

- `texture` — GPUTexture
- `width`, `height`
- `format`

Methods:

- `resize(width, height)`
- `readPixels()` → Promise<Uint8Array>
- `dispose()`

Implementation notes:

- Create GPUTexture with RENDER_ATTACHMENT usage
- Support different formats (rgba8unorm, rgba16float, etc.)
- Create texture view for rendering
- Handle sampler creation based on filter/wrap options

### Step 4: Ping-Pong Buffers (src/ping-pong.ts)

**Class: `PingPong`**

Properties:

- `read` — RenderTarget
- `write` — RenderTarget

Methods:

- `swap()` — Swap read/write
- `resize(width, height)` — Resize both targets
- `dispose()` — Dispose both targets

Simply wraps two RenderTargets and provides swap functionality.

### Step 5: Pass (src/pass.ts)

**Class: `Pass`**

Fullscreen shader (fragment only, uses built-in quad).

Properties:

- `uniforms` — { [key: string]: { value: any } }

Methods:

- `draw()` — Render the pass
- `storage(buffer, binding?)` — Bind storage buffer
- `dispose()` — Cleanup

Implementation:

1. Create vertex shader (fullscreen quad)
2. Compile fragment shader from user's WGSL
3. Create render pipeline with blend modes
4. Handle uniform buffers
5. Auto-inject globals (resolution, time, etc.)
6. On draw(): update uniforms, bind resources, render

Uniform handling:

- Parse uniforms object
- Create GPUBuffer for uniform data
- Update buffer when uniforms.x.value changes
- Support types: number, vec2, vec3, vec4, mat4, texture, etc.

### Step 6: Material (src/material.ts)

**Class: `Material`**

Similar to Pass but with custom vertex shader and geometry support.

Properties:

- `uniforms` — Same as Pass

Methods:

- `draw()` — Render instances
- `storage(buffer, binding?)` — Bind storage buffer
- `dispose()`

Implementation:

- Parse WGSL for @vertex and @fragment
- Support vertexCount and instances
- Create vertex buffer if needed (or use storage buffer for particles)

### Step 7: Compute (src/compute.ts)

**Class: `Compute`**

Compute shader execution.

Methods:

- `dispatch(x, y?, z?)` — Run compute shader
- `storage(buffer, binding?)` — Bind storage buffer
- `dispose()`

Implementation:

- Create compute pipeline
- Handle workgroup size
- Bind storage buffers
- Execute compute pass

### Step 8: Storage Buffer (src/storage.ts)

**Class: `StorageBuffer`**

GPU-accessible buffer for compute/vertex data.

Methods:

- `dispose()`

Implementation:

- Create GPUBuffer with STORAGE | COPY_DST usage
- Optionally COPY_SRC for readback

### Step 9: MRT (src/mrt.ts)

**Class: `MRT`**

Multiple render targets.

Properties:

- Array of `outputs` (RenderTargets)

Methods:

- `resize(width, height)`
- `dispose()`

Implementation:

- Create multiple RenderTargets
- Configure pipeline for MRT
- Return array of outputs

### Step 10: Uniforms System (src/uniforms.ts)

Implement auto-uniform injection:

- `globals.resolution` — Current render target size (vec2)
- `globals.time` — Seconds since init (f32)
- `globals.deltaTime` — Frame delta (f32)
- `globals.frame` — Frame counter (u32)
- `globals.aspect` — width / height (f32)

Inject into all shaders via WGSL preprocessing or uniform buffers.

## Testing

For each module, create tests in `tests/`:

- `context.test.ts` — Test context creation, WebGPU support check
- `target.test.ts` — Test render target creation
- `pass.test.ts` — Test shader compilation (mock WebGPU)
- etc.

Use Vitest with mocked WebGPU API for unit tests.

Example test structure:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { gpu } from '../src/index';

describe('gpu.isSupported', () => {
  it('should return false when WebGPU is not available', () => {
    // Mock navigator.gpu
    vi.stubGlobal('navigator', { gpu: undefined });
    expect(gpu.isSupported()).toBe(false);
  });
});
```

## Exports (src/index.ts)

Final exports should match DX_EXAMPLES.md:

```typescript
export { gpu } from './context';
export { WebGPUNotSupportedError, DeviceCreationError, ShaderCompileError } from './errors';
export type {
  Context,
  Pass,
  Material,
  Compute,
  RenderTarget,
  PingPong,
  MRT,
  StorageBuffer,
  // ... other types
} from './types';
```

## Completion Criteria

Before calling `markComplete`, verify:

- [ ] All 10 implementation steps are complete
- [ ] All TypeScript compiles without errors (`pnpm typecheck`)
- [ ] All unit tests pass (`pnpm test --run`)
- [ ] Build succeeds and generates dist/ (`pnpm build`)
- [ ] dist/index.d.ts has proper type definitions
- [ ] No console errors or warnings
- [ ] Code follows best practices (no any types except where necessary)

## Implementation Tips

1. **Lazy compilation** — Start shader compilation in constructor, await in first draw()
2. **Three.js patterns** — Follow the uniform { value: X } pattern exactly
3. **Auto-uniforms** — Inject globals struct into every shader automatically
4. **Error handling** — Throw descriptive errors with helpful messages
5. **Memory management** — Properly dispose GPUBuffers, GPUTextures, etc.
6. **WebGPU best practices** — Minimize pipeline/buffer creation, reuse resources

## Common Pitfalls

- Don't forget WebGPU is async (await adapter.requestDevice())
- Shaders must be compiled before first draw
- Uniform buffers need proper alignment (16-byte for vec3)
- Texture formats must match pipeline expectations
- Dispose all GPU resources to prevent memory leaks

## Reference

- **DX_EXAMPLES.md** — Complete API specification
- **WebGPU Spec** — https://gpuweb.github.io/gpuweb/
- **WGSL Spec** — https://gpuweb.github.io/gpuweb/wgsl/
