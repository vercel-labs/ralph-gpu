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

### Ralph 46: Time Controls Browser Tests ✅

**Completed**: 2026-01-14 19:31
**Cost**: ~$0.72
**Test file**: `time-controls.browser.test.ts`

**Tests added**:

1. Time increments between frames - verifies `context.globals.time` increases
2. Paused stops time - verifies time stays constant when `context.paused = true`
3. Frame counter increments - verifies `context.globals.frame` goes 0, 1, 2, ...

**Key findings**:

- Time updates happen during frame execution (draw calls)
- `context.paused = true` prevents time from advancing
- Frame counter always increments, even when paused
- Access time via `context.globals.time`, `context.globals.frame`, `context.globals.deltaTime`

### Ralph 47: Resize Browser Tests ✅

**Completed**: 2026-01-14 19:33
**Cost**: ~$0.04 (very fast - 1 iteration)
**Test file**: `resize.browser.test.ts`

**Tests added**:

1. Context resize works - verifies `context.resize(w, h)` changes dimensions
2. Target resize works - verifies `target.resize(w, h)` changes dimensions

**Key findings**:

- `context.resize(width, height)` updates `context.width` and `context.height`
- `target.resize(width, height)` updates `target.width` and `target.height`
- Rendering continues to work correctly after resize

### Ralph 48: Error Handling Browser Tests ✅

**Completed**: 2026-01-14 19:45
**Cost**: ~$0.57 (ralph) + manual fixes
**Test file**: `error-handling.browser.test.ts`

**Tests added**:

1. Invalid WGSL does not crash (graceful handling)
2. Valid WGSL does not throw

**Key findings**:

- The library handles invalid WGSL gracefully without crashing
- WebGPU's `getCompilationInfo()` is async, so shader errors don't propagate as JS exceptions
- Invalid shaders may render incorrectly but don't crash the app
- This is a known limitation: shader errors are logged but not thrown

### Ralph 49: Blend Modes Browser Tests ✅

**Completed**: 2026-01-14 22:20
**Cost**: ~$0.17 (Claude - retry after Gemini failed)
**Test file**: `blend-modes.browser.test.ts`

**Tests added** (4 tests):

1. Alpha blend mode - semi-transparent blue over red = purple
2. Additive blend mode - red + green = yellow
3. Multiply blend mode - yellow \* magenta = red
4. Screen blend mode - red screen green = yellow

**Key findings**:

- `context.autoClear = true` by default - clears target before each draw
- To test blending, MUST set `context.autoClear = false` before the blend draw
- Blend mode passed as `{ blend: "alpha" }` in second argument to pass()
- First attempt with Gemini failed; Claude succeeded in 3 iterations

**Lesson learned**: When a ralph fails, reset changes, improve instructions with learnings, and try a different model.

---

## Phase 2 Summary - COMPLETE ✅

**Total Tests: 50** (from 10 original)

### Phase 2a - Critical Coverage ✅

| Ralph | Feature        | Tests Added |
| ----- | -------------- | ----------- |
| 45    | Uniforms       | 3           |
| 46    | Time Controls  | 3           |
| 47    | Resize         | 2           |
| 48    | Error Handling | 2           |
| 49    | Blend Modes    | 4           |

### Phase 2b - Features ✅

| Ralph | Feature           | Tests Added |
| ----- | ----------------- | ----------- |
| 50    | Texture Formats   | 4           |
| 51    | Topology          | 5           |
| 52    | Compute Advanced  | 3           |
| 53    | Material Advanced | 3           |

### Phase 2c - Polish ✅

| Ralph | Feature           | Tests Added |
| ----- | ----------------- | ----------- |
| 54    | Events & Profiler | 6           |
| 55    | Edge Cases        | 5           |

**Total Cost**: ~$3.50 across 11 ralphs
**Models Used**: Gemini (9), Claude (2 - blend modes retry, compute retry)
