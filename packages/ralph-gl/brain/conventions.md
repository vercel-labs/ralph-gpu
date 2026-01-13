# ralph-gl Coding Conventions

## General Principles

1. **Match ralph-gpu API**: Keep the public API identical to ralph-gpu wherever possible
2. **Clear over Clever**: Prioritize readable code over micro-optimizations
3. **TypeScript Strict**: Use strict mode, no `any` types in public API
4. **Minimal Dependencies**: Pure TypeScript + WebGL 2.0, no external libraries
5. **Small Bundle**: Every byte counts - aim for < 10kB gzipped

## Code Style

### File Organization

```typescript
// 1. Imports
import { GLContext } from './context'
import type { PassOptions } from './types'

// 2. Constants
const FULLSCREEN_QUAD = new Float32Array([...])

// 3. Helper functions (private)
function compileShader(gl: WebGL2RenderingContext, ...): WebGLShader {
  // ...
}

// 4. Main class
export class Pass {
  // ...
}

// 5. Exports (if needed)
export type { PassOptions }
```

### Naming Conventions

- **Classes**: PascalCase (`GLContext`, `Pass`, `RenderTarget`)
- **Methods**: camelCase (`draw()`, `setTarget()`, `readPixels()`)
- **Private fields**: prefix with underscore (`_program`, `_gl`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TEXTURE_SIZE`)
- **Type/Interface**: PascalCase (`PassOptions`, `UniformValue`)

### WebGL Specifics

**Always check for errors in development:**
```typescript
if (ctx.debug) {
  const err = gl.getError()
  if (err !== gl.NO_ERROR) {
    console.warn(`WebGL error ${err} after operation`)
  }
}
```

**Store GL objects in private fields:**
```typescript
class Pass {
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram
  private _vao: WebGLVertexArrayObject
  
  // Public getters only if needed
  get program() { return this._program }
}
```

**Clean up resources:**
```typescript
dispose(): void {
  if (this._program) {
    this._gl.deleteProgram(this._program)
    this._program = null as any
  }
  if (this._vao) {
    this._gl.deleteVertexArray(this._vao)
    this._vao = null as any
  }
}
```

## TypeScript

### Type Definitions

**Prefer types over interfaces for options:**
```typescript
export type PassOptions = {
  uniforms?: Record<string, { value: any }>
  blend?: BlendMode | BlendConfig
  format?: TextureFormat
}
```

**Use discriminated unions for variants:**
```typescript
export type BlendMode = 'alpha' | 'additive' | 'multiply' | 'screen'

export type BlendConfig = {
  color: { src: GLenum; dst: GLenum; operation: GLenum }
  alpha: { src: GLenum; dst: GLenum; operation: GLenum }
}

export type Blend = BlendMode | BlendConfig
```

**Avoid any, use unknown or generics:**
```typescript
// Bad
function setUniform(location: WebGLUniformLocation, value: any)

// Good
function setUniform<T extends UniformValue>(
  location: WebGLUniformLocation, 
  value: T
)
```

### Strict Null Checks

**Check nullability explicitly:**
```typescript
const location = gl.getUniformLocation(program, name)
if (!location) {
  throw new Error(`Uniform '${name}' not found`)
}
```

**Use optional chaining carefully:**
```typescript
// In hot path (called every frame): avoid
const value = uniforms?.color?.value // Creates overhead

// In setup code: fine
const format = options?.format ?? 'rgba8'
```

## Error Handling

### Custom Error Types

```typescript
export class ShaderCompileError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message)
    this.name = 'ShaderCompileError'
  }
}
```

### Error Messages

**Be specific and actionable:**
```typescript
// Bad
throw new Error('Invalid shader')

// Good
throw new ShaderCompileError(
  `Fragment shader compilation failed: ${log}`,
  parseErrorLine(log),
  parseErrorColumn(log)
)
```

**Include context in error messages:**
```typescript
if (!gl.getExtension('EXT_color_buffer_float')) {
  throw new FramebufferError(
    'Float textures not supported. ' +
    'Try using format: "rgba8" instead of "rgba16f"'
  )
}
```

## Performance

### Hot Path Optimization

**Minimize allocations in draw calls:**
```typescript
// Bad: allocates every frame
draw() {
  const uniforms = Object.entries(this.uniforms)
  for (const [name, { value }] of uniforms) {
    // ...
  }
}

// Good: pre-compute in constructor
private _uniformList: Array<[string, WebGLUniformLocation]>

draw() {
  for (const [name, location] of this._uniformList) {
    const value = this.uniforms[name].value
    // ...
  }
}
```

**Cache uniform locations:**
```typescript
constructor() {
  this._uniformLocations = new Map()
  
  // Pre-fetch all uniform locations
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i)!
    const location = gl.getUniformLocation(program, info.name)!
    this._uniformLocations.set(info.name, location)
  }
}
```

**Avoid redundant state changes:**
```typescript
private _boundTexture: WebGLTexture | null = null

bindTexture(texture: WebGLTexture, unit: number) {
  if (this._boundTexture === texture) return
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  this._boundTexture = texture
}
```

### Bundle Size

**Use shorthand where clear:**
```typescript
// Bad (verbose)
if (value === undefined || value === null) {
  return defaultValue
}

// Good (concise)
return value ?? defaultValue
```

**Avoid repeat code - extract helpers:**
```typescript
// Bad: repeat this everywhere
gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
if (status !== gl.FRAMEBUFFER_COMPLETE) {
  throw new Error('Framebuffer incomplete')
}

// Good: helper function
function checkFramebuffer(gl: WebGL2RenderingContext, fb: WebGLFramebuffer) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new FramebufferError(`Framebuffer incomplete: ${status}`)
  }
}
```

## Testing

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { GLContext } from '../src/context'

describe('GLContext', () => {
  let canvas: HTMLCanvasElement
  let gl: WebGL2RenderingContext
  
  beforeEach(() => {
    canvas = document.createElement('canvas')
    gl = canvas.getContext('webgl2')!
  })
  
  it('should initialize with default options', () => {
    const ctx = new GLContext(gl, canvas, {})
    expect(ctx.width).toBeGreaterThan(0)
    expect(ctx.height).toBeGreaterThan(0)
  })
  
  it('should create a pass', () => {
    const ctx = new GLContext(gl, canvas, {})
    const pass = ctx.pass(/* glsl */ `
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `)
    expect(pass).toBeDefined()
    expect(pass.draw).toBeInstanceOf(Function)
  })
})
```

### Visual Test Pattern

```typescript
it.visual('should render red triangle', async () => {
  const ctx = await gl.init(canvas)
  const pass = ctx.pass(/* glsl */ `
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `)
  pass.draw()
  
  const screenshot = await captureCanvas(canvas)
  expect(screenshot).toMatchImage('red-triangle.png')
})
```

## Documentation

### JSDoc Comments

**Public API must have JSDoc:**
```typescript
/**
 * Creates a fullscreen fragment shader pass.
 * 
 * @param fragmentGLSL - GLSL ES 3.0 fragment shader code
 * @param options - Pass options (uniforms, blend mode, etc.)
 * @returns Pass instance
 * 
 * @example
 * ```typescript
 * const gradient = ctx.pass(`
 *   void main() {
 *     vec2 uv = gl_FragCoord.xy / u_globals_resolution;
 *     gl_FragColor = vec4(uv, 0.5, 1.0);
 *   }
 * `)
 * gradient.draw()
 * ```
 */
pass(fragmentGLSL: string, options?: PassOptions): Pass {
  // ...
}
```

**Use @internal for private helpers:**
```typescript
/**
 * @internal
 * Compiles a GLSL shader and checks for errors.
 */
function compileShader(/* ... */) {
  // ...
}
```

## Git Conventions

### Commit Messages

```
feat(pass): add blend mode support
fix(material): handle missing uniform locations
docs(readme): add migration guide from ralph-gpu
perf(uniforms): cache uniform locations on init
test(target): add framebuffer resize tests
chore(build): update webpack config for tree shaking
```

### Branch Strategy

- `main` - stable releases
- `ralph-gl` - main development branch
- No feature branches (ralphs work directly on ralph-gl branch)

## Ralph Scripts

### Progress Tracking

Every ralph must update `brain/progress.md`:

```markdown
## [2026-01-12 14:30] Ralph 01 - Package Setup

### Completed
- Created package.json with dependencies
- Set up webpack build configuration
- Added TypeScript config
- Created initial folder structure

### Next Steps
- Implement GLContext class
- Add basic error types

### Issues
- None
```

### Acceptance Criteria

Each ralph script must define clear, testable acceptance criteria:

```typescript
async function checkPassImplemented(): Promise<boolean> {
  try {
    const passTs = await fs.readFile('src/pass.ts', 'utf-8')
    return passTs.includes('class Pass') && 
           passTs.includes('draw()')
  } catch {
    return false
  }
}
```

Last Updated: 2026-01-12
