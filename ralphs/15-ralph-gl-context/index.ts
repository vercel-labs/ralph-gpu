/**
 * Ralph 15: GLContext Implementation
 * 
 * Implements the main WebGL context wrapper with initialization and global uniforms.
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, testFirstRule } from "@ralph/agent-loop";
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
# Task: Implement GLContext

## Context
Create the main GLContext class that manages WebGL 2.0 state, initialization, and global uniforms.
Reference ${PROJECT_ROOT}/packages/core/src/context.ts for API structure.

## Implementation

### ${RALPH_GL_PKG}/src/context.ts

\`\`\`typescript
import { WebGLNotSupportedError } from './errors'
import type { GLContextOptions } from './types'

export class GLContext {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement
  width: number
  height: number
  time: number
  deltaTime: number
  frame: number
  timeScale: number
  paused: boolean
  autoClear: boolean
  debug: boolean
  
  private startTime: number
  private lastFrameTime: number
  private dpr: number | [number, number]
  private autoResize: boolean
  private resizeObserver?: ResizeObserver
  
  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, options: GLContextOptions) {
    this.gl = gl
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height
    this.time = 0
    this.deltaTime = 0
    this.frame = 0
    this.timeScale = 1
    this.paused = false
    this.autoClear = true
    this.debug = options.debug || false
    
    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
    this.dpr = options.dpr ?? 1
    this.autoResize = options.autoResize ?? false
    
    // Set up auto-resize if requested
    if (this.autoResize) {
      this.setupAutoResize()
    }
    
    // Update time each frame
    this.updateTime()
  }
  
  private setupAutoResize() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      this.resize(width, height)
    })
    this.resizeObserver.observe(this.canvas)
  }
  
  private updateTime() {
    if (!this.paused) {
      const now = performance.now()
      const elapsed = (now - this.startTime) / 1000
      this.deltaTime = (now - this.lastFrameTime) / 1000
      this.time = elapsed * this.timeScale
      this.lastFrameTime = now
      this.frame++
    }
    requestAnimationFrame(() => this.updateTime())
  }
  
  resize(width: number, height: number) {
    // Apply DPR
    let dpr = 1
    if (typeof this.dpr === 'number') {
      dpr = this.dpr
    } else if (Array.isArray(this.dpr)) {
      dpr = Math.max(this.dpr[0], Math.min(this.dpr[1], window.devicePixelRatio))
    }
    
    this.width = Math.floor(width * dpr)
    this.height = Math.floor(height * dpr)
    
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.gl.viewport(0, 0, this.width, this.height)
  }
  
  clear(color: [number, number, number, number] = [0, 0, 0, 1]) {
    this.gl.clearColor(color[0], color[1], color[2], color[3])
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }
  
  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    // Additional cleanup will be added as features are implemented
  }
}

// Main API
export const gl = {
  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2')
      return context !== null
    } catch {
      return false
    }
  },
  
  async init(canvas: HTMLCanvasElement, options: GLContextOptions = {}): Promise<GLContext> {
    if (!this.isSupported()) {
      throw new WebGLNotSupportedError()
    }
    
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    })
    
    if (!gl) {
      throw new WebGLNotSupportedError('Failed to create WebGL 2.0 context')
    }
    
    const ctx = new GLContext(gl, canvas, options)
    
    // Initial resize
    const rect = canvas.getBoundingClientRect()
    ctx.resize(rect.width, rect.height)
    
    return ctx
  }
}
\`\`\`

### Update ${RALPH_GL_PKG}/src/index.ts

Export GLContext and gl:
\`\`\`typescript
export { GLContext, gl } from './context'
export type { GLContextOptions } from './types'
// ... existing exports
\`\`\`

### Unit Tests

${RALPH_GL_PKG}/tests/context.test.ts:

\`\`\`typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { gl, GLContext } from '../src/context'
import { WebGLNotSupportedError } from '../src/errors'

describe('gl.isSupported', () => {
  it('should return true in test environment', () => {
    expect(gl.isSupported()).toBe(true)
  })
})

describe('gl.init', () => {
  let canvas: HTMLCanvasElement
  
  beforeEach(() => {
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
  })
  
  it('should create GLContext', async () => {
    const ctx = await gl.init(canvas)
    expect(ctx).toBeInstanceOf(GLContext)
    expect(ctx.gl).toBeDefined()
    expect(ctx.canvas).toBe(canvas)
  })
  
  it('should throw if WebGL not supported', async () => {
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    await expect(gl.init(canvas)).rejects.toThrow(WebGLNotSupportedError)
  })
  
  it('should handle options', async () => {
    const ctx = await gl.init(canvas, { debug: true, dpr: 2 })
    expect(ctx.debug).toBe(true)
  })
})

describe('GLContext', () => {
  let canvas: HTMLCanvasElement
  let ctx: GLContext
  
  beforeEach(async () => {
    canvas = document.createElement('canvas')
    ctx = await gl.init(canvas)
  })
  
  it('should initialize time properties', () => {
    expect(ctx.time).toBeGreaterThanOrEqual(0)
    expect(ctx.deltaTime).toBeGreaterThanOrEqual(0)
    expect(ctx.frame).toBeGreaterThanOrEqual(0)
  })
  
  it('should resize canvas', () => {
    ctx.resize(800, 600)
    expect(ctx.width).toBe(800)
    expect(ctx.height).toBe(600)
  })
  
  it('should clear canvas', () => {
    const clearColor = vi.spyOn(ctx.gl, 'clearColor')
    const clear = vi.spyOn(ctx.gl, 'clear')
    
    ctx.clear([1, 0, 0, 1])
    
    expect(clearColor).toHaveBeenCalledWith(1, 0, 0, 1)
    expect(clear).toHaveBeenCalled()
  })
})
\`\`\`

## Testing

\`\`\`bash
cd ${RALPH_GL_PKG}
pnpm test
\`\`\`

## Acceptance Criteria

- [ ] GLContext class implemented
- [ ] gl.isSupported() works
- [ ] gl.init() creates context
- [ ] Time management (time, deltaTime, frame)
- [ ] resize() method
- [ ] clear() method
- [ ] Auto-resize support
- [ ] DPR handling
- [ ] All tests passing
- [ ] Exported from index.ts
- [ ] brain/progress.md updated

Update ${RALPH_GL_PKG}/brain/progress.md when complete.
`;

async function main() {
  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule],
    debug: DEBUG,
    limits: { maxIterations: 50, maxCost: 12.0, timeout: "45m" },
  });

  console.log("\n🚀 Starting Ralph 15: GLContext\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 15 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
