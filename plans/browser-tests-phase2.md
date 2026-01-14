---
name: Browser Tests Phase 2
overview: Expand Playwright browser test coverage to make ralph-gpu bulletproof. Focus on edge cases, error handling, all API features, and real-world usage patterns.
---

# Browser Tests Phase 2 - Comprehensive Coverage

## Current State

We have 10 passing browser tests covering basic functionality:

- `context.browser.test.ts` - Basic initialization
- `pass.browser.test.ts` - Fragment shader rendering
- `compute.browser.test.ts` - Compute shader execution
- `storage.browser.test.ts` - Storage buffer operations
- `target.browser.test.ts` - RenderTarget creation/rendering
- `ping-pong.browser.test.ts` - Ping-pong buffer swapping
- `sampler.browser.test.ts` - Texture sampling (nearest + linear)
- `particles.browser.test.ts` - Particle system
- `mrt.browser.test.ts` - Multiple render targets

## Proposed Test Categories

### 1. **Uniforms & Data Types**

Test all uniform types and both API modes.

| Test                 | Description                                  | Priority |
| -------------------- | -------------------------------------------- | -------- |
| Simple mode uniforms | Auto-generated bindings with plain values    | High     |
| Manual mode uniforms | Explicit `@group(1)` declarations            | High     |
| All scalar types     | f32, i32, u32                                | Medium   |
| Vector types         | vec2f, vec3f, vec4f                          | Medium   |
| Matrix types         | mat3x3f, mat4x4f                             | Low      |
| Array uniforms       | Fixed-size arrays in uniform buffer          | Low      |
| Uniform update       | Verify `.value` changes reflect in rendering | High     |

### 2. **Blend Modes**

Test all blend presets render correctly.

| Test                | Description                | Priority |
| ------------------- | -------------------------- | -------- |
| blend: "none"       | No blending, opaque        | Medium   |
| blend: "alpha"      | Standard transparency      | High     |
| blend: "additive"   | Glow/fire effect           | High     |
| blend: "multiply"   | Darken                     | Medium   |
| blend: "screen"     | Lighten                    | Medium   |
| Custom blend config | User-defined blend factors | Low      |

### 3. **Topology / Geometry**

Test different primitive topologies.

| Test           | Description                        | Priority |
| -------------- | ---------------------------------- | -------- |
| triangle-list  | Default triangles (already tested) | ✅ Done  |
| triangle-strip | Connected triangles                | Medium   |
| line-list      | Disconnected line segments         | Medium   |
| line-strip     | Connected line path                | Medium   |
| point-list     | Individual points (1px)            | Low      |

### 4. **Texture Formats**

Test different RenderTarget formats.

| Test        | Description                         | Priority |
| ----------- | ----------------------------------- | -------- |
| rgba8unorm  | Default format (already tested)     | ✅ Done  |
| rgba16float | HDR / high precision                | High     |
| r16float    | Single channel float                | Medium   |
| rg16float   | Two channel float (velocity fields) | Medium   |
| r32float    | High precision single channel       | Low      |

### 5. **Resize & Lifecycle**

Test resize behavior and resource management.

| Test                        | Description                            | Priority |
| --------------------------- | -------------------------------------- | -------- |
| Context resize              | `ctx.resize()` works correctly         | High     |
| RenderTarget resize         | `target.resize()` works correctly      | High     |
| Texture reference stability | References stay valid after resize     | High     |
| Auto-resize                 | `autoResize: true` tracks canvas size  | Medium   |
| DPR handling                | Device pixel ratio configuration       | Medium   |
| dispose() cleanup           | Resources properly freed               | Medium   |
| Re-init after dispose       | Can create new context after disposing | Low      |

### 6. **Time Controls**

Test time management features.

| Test                    | Description                      | Priority |
| ----------------------- | -------------------------------- | -------- |
| globals.time increments | Time increases each frame        | High     |
| ctx.paused              | Time stops when paused           | High     |
| ctx.timeScale           | Time scales correctly (0.5x, 2x) | Medium   |
| ctx.time = 0            | Time can be reset                | Medium   |
| globals.deltaTime       | Frame delta is reasonable        | Medium   |
| globals.frame           | Frame counter increments         | Medium   |

### 7. **Error Handling**

Test graceful error handling.

| Test                | Description                    | Priority |
| ------------------- | ------------------------------ | -------- |
| Invalid WGSL        | ShaderCompileError thrown      | High     |
| Unsupported browser | WebGPUNotSupportedError thrown | Medium   |
| Missing uniform     | Warning logged, doesn't crash  | Medium   |
| Wrong uniform type  | Graceful handling              | Low      |

### 8. **Compute Advanced**

Advanced compute shader features.

| Test                        | Description                        | Priority |
| --------------------------- | ---------------------------------- | -------- |
| Texture sampling in compute | textureSampleLevel                 | High     |
| Storage texture write       | textureStore                       | High     |
| Multiple storage buffers    | Multiple @binding in compute       | Medium   |
| Large dispatch              | >65535 workgroups (split dispatch) | Low      |

### 9. **Material Advanced**

Material-specific features beyond particles.

| Test                 | Description                 | Priority |
| -------------------- | --------------------------- | -------- |
| Custom vertex shader | Non-particle material       | Medium   |
| Instancing           | instanceCount > 1           | Medium   |
| Multiple varyings    | Pass data vertex → fragment | Medium   |
| Index buffer         | Indexed drawing             | Low      |

### 10. **Events & Profiler**

Test the debug/profiling system.

| Test             | Description                       | Priority |
| ---------------- | --------------------------------- | -------- |
| Event emission   | Events fire on draw/compute       | Medium   |
| Event filtering  | Only requested types fire         | Low      |
| Profiler FPS     | getFPS() returns reasonable value | Low      |
| Profiler regions | begin/end timing works            | Low      |

### 11. **Edge Cases**

Unusual but valid usage patterns.

| Test                 | Description                  | Priority |
| -------------------- | ---------------------------- | -------- |
| Zero-size draw       | vertexCount: 0 doesn't crash | Medium   |
| Empty pass           | Draw with no visible output  | Low      |
| Multiple contexts    | Two canvases, two contexts   | Low      |
| Rapid create/dispose | Stress test lifecycle        | Low      |

---

## Proposed Implementation Order

**Phase 2a - Critical Coverage (High Priority)**

1. Uniforms (simple mode, manual mode, updates)
2. Time controls (paused, timeScale)
3. Resize behavior (context, target, reference stability)
4. Error handling (invalid WGSL)
5. Blend modes (alpha, additive)

**Phase 2b - Format & Feature Coverage (Medium Priority)**

6. Texture formats (rgba16float, r16float)
7. Topology (line-list, line-strip)
8. Compute advanced (texture sampling, storage textures)
9. Material advanced (custom vertex, instancing)
10. Auto-resize & DPR

**Phase 2c - Polish & Edge Cases (Low Priority)**

11. All blend modes
12. Events & profiler
13. Edge cases
14. Remaining formats and types

---

## Decisions

- ✅ **Pixel spot-checking** - Use `readPixels()` and check specific pixel values (not snapshot/visual comparison)
- ✅ **Auto-resize** - Test `autoResize: true` option (Phase 2b)
- ✅ **DPR testing** - Test device pixel ratio configuration (Phase 2b)
- ❌ **Performance tests** - Out of scope for now

---

## Notes

- Each test file should be focused (one feature area)
- Use `test.describe` to group related tests
- Keep tests fast - small canvas sizes, minimal iterations
- Add comments explaining what each test verifies

---

## Progress Log

### Ralph 45: Uniforms Browser Tests ✅
**Completed**: 2026-01-14 19:30
**Cost**: ~$1.50 (ralph) + manual fixes
**Test file**: `uniforms.browser.test.ts`

**Tests added**:
1. Simple mode f32 uniform - passes value directly like `{ redValue: 0.75 }`
2. Simple mode vec4f uniform - color array
3. Uniform value update - uses `pass.set('name', value)` for simple mode

**Key findings**:
- Simple mode API: pass values directly, NOT wrapped in `uniforms: {}`
- Example: `context.pass(shader, { myValue: 0.5 })` NOT `{ uniforms: { myValue: 0.5 } }`
- To update uniforms in simple mode, use `pass.set('name', value)`
- Direct `pass.uniforms.name.value = x` only works in manual mode

**API distinction**:
- **Simple mode**: `ctx.pass(shader, { value: 0.5 })` → shader uses `uniforms.value`
- **Manual mode**: `ctx.pass(shader, { uniforms: { value: { value: 0.5 } } })` → shader has explicit `@group(1) @binding(0)`
