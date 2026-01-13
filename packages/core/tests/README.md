# Test Suite for Texture Binding Enhancements

This document describes the tests added for the texture binding enhancement features.

## Test Files

### 1. `sampler.test.ts` (11 tests)

Tests for the `Sampler` class and `ctx.createSampler()` API.

**Coverage:**
- ✅ Creating samplers with default values
- ✅ Creating samplers with custom filter modes (linear, nearest)
- ✅ Creating samplers with custom address modes (clamp, repeat, mirror)
- ✅ LOD clamping configuration
- ✅ Comparison function for depth textures
- ✅ Anisotropic filtering
- ✅ Exposing underlying GPUSampler
- ✅ Read-only descriptor access
- ✅ Dispose method

### 2. `texture-bindings.test.ts` (25 tests)

Tests for texture binding collection and WGSL parsing.

**Coverage:**
- ✅ `isTextureValue()` - Detecting textures vs samplers vs regular uniforms
- ✅ `collectTextureBindings()` - Collecting textures from uniforms
  - Handling GPUTexture
  - Handling RenderTarget-like objects
  - Handling Sampler instances
  - Extracting texture + sampler from RenderTarget
- ✅ `collectSimpleTextureBindings()` - Collecting from simple uniforms
  - Handling Sampler instances in simple mode
- ✅ `parseBindGroupBindings()` - Parsing WGSL declarations
  - Regular textures (texture_2d<f32>)
  - Storage textures (texture_storage_2d)
  - Samplers
  - Storage buffers
  - Uniform buffers
  - Multiple binding groups
- ✅ `validateBindings()` - Validation and error messages
  - Correct bindings return null
  - Missing texture detection
  - Missing storage buffer detection
  - Non-texture value detection
  - Helpful error messages with fix suggestions
  - Warning for missing samplers

### 3. `render-target-usage.test.ts` (7 tests)

Tests for the new `RenderTargetUsage` type and usage options.

**Coverage:**
- ✅ RenderTargetUsage type accepts "render", "storage", "both"
- ✅ RenderTargetOptions with each usage mode
- ✅ RenderTargetOptions without usage (default)

### 4. `sampler-integration.test.ts` (16 tests)

Integration tests for Sampler with the type system.

**Coverage:**
- ✅ `SimpleUniformValue` type accepts Sampler instances
- ✅ `SimpleUniformValue` type accepts all value types:
  - Numbers, booleans, arrays (vec2/3/4)
  - Float32Array
  - GPUTexture, GPUSampler, Sampler
  - RenderTarget-like objects with Sampler
- ✅ Sampler in uniforms collections
- ✅ Multiple samplers with different configurations
- ✅ Common sampler creation patterns:
  - Linear clamp (for blur, postprocessing)
  - Nearest repeat (for pixel art, tiling)
  - Mirror repeat (for seamless tiling)

## Test Results

All 59 new tests pass:

```
✓ tests/render-target-usage.test.ts (7 tests)
✓ tests/sampler-integration.test.ts (16 tests)
✓ tests/sampler.test.ts (11 tests)
✓ tests/texture-bindings.test.ts (25 tests)
```

## What's Tested

### Core Features ✅
1. **Sampler Creation** - Full API surface including all descriptor options
2. **Texture Binding Detection** - Correctly identifies textures vs samplers
3. **Texture Collection** - Extracts textures from various uniform formats
4. **WGSL Parsing** - Parses all binding types including storage textures
5. **Validation** - Comprehensive error detection with helpful messages
6. **Type System** - Integration with TypeScript types
7. **Storage Texture Support** - Parsing and type checking for storage textures
8. **Usage Modes** - RenderTarget usage configuration

### Edge Cases ✅
- Empty/default configurations
- Mixed uniform types (textures + samplers + numbers)
- RenderTarget-like objects vs raw GPUTexture
- Sampler instances vs raw GPUSampler
- Multiple binding groups
- Missing bindings (errors and warnings)
- Non-texture values in texture bindings

### Not Tested (Requires WebGPU Runtime)
- Actual WebGPU device creation
- GPU memory allocation
- Shader compilation
- Render pass execution
- Texture sampling behavior
- Storage texture writes

These runtime features require a WebGPU environment and are better suited for integration tests or manual testing in the browser.

## Running Tests

Run all tests:
```bash
pnpm test
```

Run only texture binding tests:
```bash
pnpm test -- texture-bindings sampler render-target-usage sampler-integration
```

Run tests in watch mode:
```bash
pnpm test:watch
```
