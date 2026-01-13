/**
 * ComputeShader - Emulated compute shader using transform feedback
 * 
 * WebGL 2.0 doesn't have native compute shaders like WebGPU.
 * This class provides limited compute-like functionality using
 * transform feedback for operations like particle simulation.
 * 
 * LIMITATIONS (compared to WebGPU):
 * - No shared memory or workgroups
 * - No synchronization barriers
 * - Only works for operations expressible as vertex transformations
 * - Read-write requires ping-pong between two buffers
 * - Performance may be lower than native compute
 * 
 * Consider this feature EXPERIMENTAL - many compute operations
 * are not feasible in WebGL. Document alternatives where possible.
 * 
 * Equivalent to the ComputeShader class in ralph-gpu (with limitations).
 */

import type { GLContext } from './context'
import type { StorageBuffer } from './storage'
import type { UniformValue } from './types'

export interface ComputeShaderOptions {
  uniforms?: Record<string, { value: UniformValue }>
}

export class ComputeShader {
  /** Uniform values */
  uniforms: Record<string, { value: UniformValue }> = {}
  
  private _ctx: GLContext
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram | null = null
  private _transformFeedback: WebGLTransformFeedback | null = null
  private _vao: WebGLVertexArrayObject | null = null
  private _storageBuffers: Map<string, StorageBuffer> = new Map()
  private _uniformLocations: Map<string, WebGLUniformLocation> = new Map()
  
  constructor(ctx: GLContext, computeGLSL: string, options?: ComputeShaderOptions) {
    this._ctx = ctx
    this._gl = ctx.gl
    
    if (options?.uniforms) {
      this.uniforms = options.uniforms
    }
    
    // TODO: Create vertex shader from compute source
    // TODO: Setup transform feedback
    // TODO: Create VAO for input data
  }
  
  /**
   * Bind a storage buffer for compute input/output
   */
  storage(name: string, buffer: StorageBuffer): void {
    this._storageBuffers.set(name, buffer)
    // TODO: Setup as vertex attribute input or transform feedback output
  }
  
  /**
   * Set a uniform value
   */
  set(name: string, value: UniformValue): void {
    if (this.uniforms[name]) {
      this.uniforms[name].value = value
    } else {
      this.uniforms[name] = { value }
    }
  }
  
  /**
   * Execute the compute operation
   * 
   * Note: In WebGL, this processes vertices linearly (no workgroups).
   * The count specifies how many items to process.
   */
  dispatch(count: number): void {
    // TODO: Begin transform feedback
    // TODO: Bind program and update uniforms
    // TODO: Draw points to process each item
    // TODO: End transform feedback
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this._gl
    
    if (this._program) {
      gl.deleteProgram(this._program)
      this._program = null
    }
    
    if (this._transformFeedback) {
      gl.deleteTransformFeedback(this._transformFeedback)
      this._transformFeedback = null
    }
    
    if (this._vao) {
      gl.deleteVertexArray(this._vao)
      this._vao = null
    }
  }
}
