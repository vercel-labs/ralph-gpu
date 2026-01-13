# Ralph GL Progress

## Completed

### Ralph 02 - GLContext ✅
- [x] GLContext class with gl, canvas, width, height, time, deltaTime, frame
- [x] `GLContext.isSupported()` - static check for WebGL 2.0 availability
- [x] `init(canvas, options)` - create context with configurable options
- [x] `resize(width, height)` - with DPR support
- [x] `clear(color)` - clear canvas with color/depth
- [x] `updateTime()` - time management for animation frames
- [x] `destroy()` - resource cleanup
- [x] Exported from src/index.ts
- [x] Tests in tests/context.test.ts
- [x] Build passes

### Ralph 03 - Pass (Fullscreen Quad Rendering) ✅
- [x] Built-in fullscreen quad vertex shader
- [x] Fragment shader compilation and linking
- [x] `draw()` method for fullscreen rendering
- [x] Uniform handling (setUniform method with type overloads)
- [x] Auto-inject global uniforms (u_resolution, u_time, etc.)
- [x] Exported from src/index.ts
- [x] Test page at test-pass.html (renders gradient)
- [x] Visual verification passed

### Ralph 04 - Uniform Handling ✅
- [x] `extractUniforms(shaderSource)` - parse GLSL for uniform declarations
- [x] `setUniform(gl, location, value)` - type detection and gl.uniform* calls
- [x] `detectUniformType(value)` - infer WebGL uniform type from JS values
- [x] `injectGlobalUniforms(source)` - auto-inject global uniforms into shader source
- [x] Three.js style: `{ value: X }` pattern for uniform values
- [x] Type handling:
  - number → uniform float (uniform1f)
  - [x, y] → uniform vec2 (uniform2f)
  - [x, y, z] → uniform vec3 (uniform3f)
  - [x, y, z, w] → uniform vec4 (uniform4f)
  - Float32Array(16) → uniform mat4 (uniformMatrix4fv)
  - RenderTarget → uniform sampler2D (texture binding)
- [x] Updated Pass class to use uniform system
- [x] Test page at test-uniforms.html (animated spiral with sliders)
- [x] Build passes

## Next
- Ralph 05 - RenderTarget (ping-pong buffers for post-processing)
