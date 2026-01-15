# Ralph GPU Project Brain

## Overview
This is the ralph-gpu project with WebGPU compute and rendering capabilities.

## Key Patterns Learned

### Test Structure
- Browser tests use Playwright
- Tests are in `packages/core/tests/browser/`
- Pattern: page.evaluate() wraps test logic 
- Uses `setupTest()`, `waitForFrame()`, `teardown()` utilities
- Pixel verification with `expectPixelNear()`

### Compute Shaders
- Created with `context.compute(wgslSource, { uniforms })`
- Dispatched with `compute.dispatch(x, y, z)`
- Can write to storage textures using `textureStore()`

### Texture Sampling
- Use `textureSample()` in fragment shaders
- Use `textureSampleLevel()` in compute shaders (no implicit derivatives)
- Samplers created with `context.createSampler()`

### Storage Buffers
- Created with `context.storage(sizeInBytes)`
- Bound with `pass.storage(name, buffer)`
- Can be read/write in shaders