/**
 * StorageBuffer - Emulated storage buffer for WebGL
 * 
 * WebGL 2.0 doesn't have native storage buffers like WebGPU.
 * This class provides a similar API using vertex buffers or textures
 * depending on the use case.
 * 
 * Limitations compared to WebGPU:
 * - Read-only in most cases (no atomic operations)
 * - Must choose between vertex attribute or texture storage
 * - No compute shader write support (use transform feedback)
 * 
 * Equivalent to the StorageBuffer class in ralph-gpu.
 */

import type { GLContext } from './context'

export type StorageUsage = 'vertex' | 'texture'

export class StorageBuffer {
  /** The underlying WebGL buffer or texture */
  buffer: WebGLBuffer | WebGLTexture | null = null
  
  /** Size in bytes */
  byteSize: number = 0
  
  /** How the buffer is used */
  usage: StorageUsage = 'vertex'
  
  private _ctx: GLContext
  private _gl: WebGL2RenderingContext
  
  constructor(ctx: GLContext, byteSize: number, usage?: StorageUsage) {
    this._ctx = ctx
    this._gl = ctx.gl
    this.byteSize = byteSize
    this.usage = usage ?? 'vertex'
    
    this._createBuffer()
  }
  
  /**
   * Create the underlying WebGL buffer
   */
  private _createBuffer(): void {
    const gl = this._gl
    
    if (this.usage === 'vertex') {
      // Create vertex buffer
      const buffer = gl.createBuffer()
      if (!buffer) {
        throw new Error('Failed to create vertex buffer')
      }
      
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.byteSize, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      
      this.buffer = buffer
    } else {
      // Create texture for texture-based storage
      // Calculate dimensions to fit the byte size (assuming RGBA32F = 16 bytes per pixel)
      const pixelCount = Math.ceil(this.byteSize / 16)
      const width = Math.min(pixelCount, 4096)
      const height = Math.ceil(pixelCount / 4096)
      
      const texture = gl.createTexture()
      if (!texture) {
        throw new Error('Failed to create texture storage')
      }
      
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        width,
        height,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.bindTexture(gl.TEXTURE_2D, null)
      
      this.buffer = texture
    }
  }
  
  /**
   * Write data to the buffer
   */
  write(data: ArrayBufferView, offset: number = 0): this {
    const gl = this._gl
    
    if (!this.buffer) {
      throw new Error('Buffer not initialized')
    }
    
    if (this.usage === 'vertex') {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer as WebGLBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, offset, data)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    } else {
      // For texture storage, we need to convert to RGBA float data
      const texture = this.buffer as WebGLTexture
      const pixelCount = Math.ceil(this.byteSize / 16)
      const width = Math.min(pixelCount, 4096)
      
      gl.bindTexture(gl.TEXTURE_2D, texture)
      
      if (data instanceof Float32Array) {
        // Calculate row to update based on offset
        const rowWidth = width * 4 // RGBA
        const startPixel = Math.floor(offset / 16)
        const y = Math.floor(startPixel / width)
        const x = startPixel % width
        const pixelsToUpdate = Math.ceil(data.length / 4)
        
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          x,
          y,
          Math.min(pixelsToUpdate, width - x),
          1,
          gl.RGBA,
          gl.FLOAT,
          data
        )
      }
      
      gl.bindTexture(gl.TEXTURE_2D, null)
    }
    
    return this
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this._gl
    
    if (this.buffer) {
      if (this.usage === 'vertex') {
        gl.deleteBuffer(this.buffer as WebGLBuffer)
      } else {
        gl.deleteTexture(this.buffer as WebGLTexture)
      }
      this.buffer = null
    }
  }
}
