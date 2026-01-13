/**
 * Ralph 14: Types & Error Classes
 * 
 * Creates TypeScript type definitions and custom error classes for ralph-gl.
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true";
const RALPH_GL_PKG = `${PROJECT_ROOT}/packages/ralph-gl`;

const TASK = `
# Task: Implement Types & Error Classes

## Context
Create comprehensive TypeScript type definitions and custom error classes for ralph-gl.
Reference ralph-gpu types at ${PROJECT_ROOT}/packages/core/src/types.ts

## Files

### 1. ${RALPH_GL_PKG}/src/types.ts

Define all public types:

\`\`\`typescript
// Context options
export interface GLContextOptions {
  dpr?: number | [number, number]
  autoResize?: boolean
  debug?: boolean
}

// Texture formats
export type TextureFormat = 'rgba8' | 'rgba16f' | 'rgba32f' | 'r16f' | 'rg16f'

// Filter modes
export type FilterMode = 'linear' | 'nearest'

// Wrap modes
export type WrapMode = 'clamp' | 'repeat' | 'mirror'

// Blend modes
export type BlendMode = 'alpha' | 'additive' | 'multiply' | 'screen'

export interface BlendConfig {
  color: { src: GLenum; dst: GLenum; operation: GLenum }
  alpha: { src: GLenum; dst: GLenum; operation: GLenum }
}

// Topology for materials
export type Topology = 'triangles' | 'lines' | 'points' | 'line-strip' | 'triangle-strip'

// Uniform values
export type UniformValue = 
  | number 
  | number[] 
  | Float32Array 
  | RenderTarget
  | WebGLTexture

// Pass options
export interface PassOptions {
  uniforms?: Record<string, { value: UniformValue }>
  blend?: BlendMode | BlendConfig
  format?: TextureFormat
}

// Material options
export interface MaterialOptions {
  uniforms?: Record<string, { value: UniformValue }>
  vertexCount?: number
  instances?: number
  topology?: Topology
  blend?: BlendMode | BlendConfig
}

// Render target options
export interface RenderTargetOptions {
  format?: TextureFormat
  filter?: FilterMode
  wrap?: WrapMode
}

// Compute options (if we implement it)
export interface ComputeOptions {
  uniforms?: Record<string, { value: UniformValue }>
  workgroupSize?: number
}
\`\`\`

### 2. ${RALPH_GL_PKG}/src/errors.ts

Custom error classes:

\`\`\`typescript
/**
 * Error thrown when WebGL 2.0 is not supported.
 */
export class WebGLNotSupportedError extends Error {
  constructor(message = 'WebGL 2.0 is not supported in this browser') {
    super(message)
    this.name = 'WebGLNotSupportedError'
  }
}

/**
 * Error thrown during shader compilation.
 */
export class ShaderCompileError extends Error {
  line?: number
  column?: number
  
  constructor(message: string, line?: number, column?: number) {
    super(message)
    this.name = 'ShaderCompileError'
    this.line = line
    this.column = column
  }
}

/**
 * Error thrown during framebuffer operations.
 */
export class FramebufferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FramebufferError'
  }
}

/**
 * Parse shader error log to extract line number.
 */
export function parseShaderError(log: string): { line?: number; column?: number } {
  // Common error format: "ERROR: 0:42: ..."
  const match = log.match(/ERROR:\\s*(\\d+):(\\d+)/)
  if (match) {
    return { line: parseInt(match[2]), column: parseInt(match[1]) }
  }
  return {}
}
\`\`\`

### 3. Update ${RALPH_GL_PKG}/src/index.ts

Export types and errors:

\`\`\`typescript
// Export types
export type {
  GLContextOptions,
  TextureFormat,
  FilterMode,
  WrapMode,
  BlendMode,
  BlendConfig,
  Topology,
  UniformValue,
  PassOptions,
  MaterialOptions,
  RenderTargetOptions,
  ComputeOptions,
} from './types'

// Export errors
export {
  WebGLNotSupportedError,
  ShaderCompileError,
  FramebufferError,
  parseShaderError,
} from './errors'

// Placeholder for main API (will be implemented later)
export const gl = {
  isSupported: () => false,
  init: async () => { throw new Error('Not implemented') }
}
\`\`\`

### 4. Unit Tests

Create ${RALPH_GL_PKG}/tests/types.test.ts:

\`\`\`typescript
import { describe, it, expect } from 'vitest'
import type { 
  GLContextOptions, 
  TextureFormat,
  UniformValue 
} from '../src/types'

describe('Types', () => {
  it('should allow valid texture formats', () => {
    const formats: TextureFormat[] = ['rgba8', 'rgba16f', 'rgba32f']
    expect(formats.length).toBe(3)
  })
  
  it('should allow various uniform values', () => {
    const uniforms: Record<string, { value: UniformValue }> = {
      scalar: { value: 1.0 },
      vec3: { value: [1, 2, 3] },
      mat4: { value: new Float32Array(16) },
    }
    expect(Object.keys(uniforms).length).toBe(3)
  })
})
\`\`\`

Create ${RALPH_GL_PKG}/tests/errors.test.ts:

\`\`\`typescript
import { describe, it, expect } from 'vitest'
import { 
  WebGLNotSupportedError,
  ShaderCompileError,
  parseShaderError 
} from '../src/errors'

describe('Errors', () => {
  it('should create WebGLNotSupportedError', () => {
    const err = new WebGLNotSupportedError()
    expect(err.name).toBe('WebGLNotSupportedError')
    expect(err.message).toContain('WebGL 2.0')
  })
  
  it('should create ShaderCompileError with line info', () => {
    const err = new ShaderCompileError('Syntax error', 42, 10)
    expect(err.name).toBe('ShaderCompileError')
    expect(err.line).toBe(42)
    expect(err.column).toBe(10)
  })
  
  it('should parse shader error log', () => {
    const log = 'ERROR: 0:42: syntax error'
    const { line } = parseShaderError(log)
    expect(line).toBe(42)
  })
})
\`\`\`

## Testing

Run tests:
\`\`\`bash
cd ${RALPH_GL_PKG}
pnpm test
\`\`\`

## Acceptance Criteria

- [ ] types.ts with all type definitions
- [ ] errors.ts with custom error classes
- [ ] parseShaderError helper function
- [ ] index.ts exports types and errors
- [ ] types.test.ts with type tests
- [ ] errors.test.ts with error tests
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] brain/progress.md updated

Update ${RALPH_GL_PKG}/brain/progress.md when complete.
`;

async function main() {
  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule],
    debug: DEBUG,
    limits: { maxIterations: 40, maxCost: 8.0, timeout: "30m" },
  });

  console.log("\n🚀 Starting Ralph 14: Types & Errors\n");
  const result = await agent.run();

  console.log(`\n${result.success ? "✅" : "❌"} Ralph 14 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
