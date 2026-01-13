/**
 * RenderTarget - Offscreen framebuffer wrapper
 * 
 * Allows rendering to a texture instead of the canvas.
 * The resulting texture can be used as input to other passes.
 * 
 * Equivalent to the RenderTarget class in ralph-gpu.
 */

import type { GLContext } from './context'
import type { RenderTargetOptions, TextureFormat } from './types'
import { FramebufferError } from './errors'

/**
 * Get WebGL internal format, format, and type for a texture format
 */
function getFormatInfo(gl: WebGL2RenderingContext, format: TextureFormat): {
  internalFormat: number
  formatEnum: number
  type: number
  bytesPerPixel: number
} {
  switch (format) {
    case 'rgba8':
      return {
        internalFormat: gl.RGBA8,
        formatEnum: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        bytesPerPixel: 4,
      }
    case 'rgba16f':
      return {
        internalFormat: gl.RGBA16F,
        formatEnum: gl.RGBA,
        type: gl.HALF_FLOAT,
        bytesPerPixel: 8,
      }
    case 'rgba32f':
      return {
        internalFormat: gl.RGBA32F,
        formatEnum: gl.RGBA,
        type: gl.FLOAT,
        bytesPerPixel: 16,
      }
    default:
      // Default to rgba8
      return {
        internalFormat: gl.RGBA8,
        formatEnum: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        bytesPerPixel: 4,
      }
  }
}

/**
 * Get WebGL filter enum
 */
function getFilter(gl: WebGL2RenderingContext, filter: 'nearest' | 'linear'): number {
  return filter === 'nearest' ? gl.NEAREST : gl.LINEAR
}

/**
 * Get WebGL wrap enum
 */
function getWrap(gl: WebGL2RenderingContext, wrap: 'clamp' | 'repeat' | 'mirror'): number {
  switch (wrap) {
    case 'repeat':
      return gl.REPEAT
    case 'mirror':
      return gl.MIRRORED_REPEAT
    case 'clamp':
    default:
      return gl.CLAMP_TO_EDGE
  }
}

export class RenderTarget {
  /** The underlying framebuffer */
  framebuffer: WebGLFramebuffer
  
  /** The color attachment texture */
  texture: WebGLTexture
  
  /** Width in pixels */
  width: number
  
  /** Height in pixels */
  height: number
  
  /** Texture format */
  format: TextureFormat
  
  /** Filter mode */
  filter: 'nearest' | 'linear'
  
  /** Wrap mode */
  wrap: 'clamp' | 'repeat' | 'mirror'
  
  private _ctx: GLContext
  private _gl: WebGL2RenderingContext
  
  constructor(ctx: GLContext, width?: number, height?: number, options?: RenderTargetOptions) {
    this._ctx = ctx
    this._gl = ctx.gl
    
    this.width = width ?? ctx.width ?? 1
    this.height = height ?? ctx.height ?? 1
    this.format = options?.format ?? 'rgba8'
    this.filter = options?.filter ?? 'linear'
    this.wrap = options?.wrap ?? 'clamp'
    
    // Initialize to satisfy TypeScript - will be set immediately
    this.framebuffer = null as any
    this.texture = null as any
    
    this._createResources()
    
    // Upload initial data if provided
    if (options?.data) {
      this.write(options.data)
    }
  }
  
  /**
   * Create framebuffer and texture resources
   */
  private _createResources(): void {
    const gl = this._gl
    
    // Create framebuffer
    const framebuffer = gl.createFramebuffer()
    if (!framebuffer) {
      throw new FramebufferError('Failed to create framebuffer')
    }
    this.framebuffer = framebuffer
    
    // Create texture
    const texture = gl.createTexture()
    if (!texture) {
      gl.deleteFramebuffer(this.framebuffer)
      throw new FramebufferError('Failed to create texture for framebuffer')
    }
    this.texture = texture
    
    // Get format info
    const formatInfo = getFormatInfo(gl, this.format)
    const filterEnum = getFilter(gl, this.filter)
    const wrapEnum = getWrap(gl, this.wrap)
    
    // Setup texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      formatInfo.internalFormat,
      this.width,
      this.height,
      0,
      formatInfo.formatEnum,
      formatInfo.type,
      null
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterEnum)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterEnum)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapEnum)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapEnum)
    
    // Attach texture to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    )
    
    // Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      const msg = FramebufferError.statusMessage(status)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      this.dispose()
      throw new FramebufferError(`Framebuffer incomplete: ${msg}`, status)
    }
    
    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }
  
  /**
   * Resize the render target
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) {
      return
    }
    
    this.width = width
    this.height = height
    
    // Recreate texture with new size
    const gl = this._gl
    const formatInfo = getFormatInfo(gl, this.format)
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      formatInfo.internalFormat,
      this.width,
      this.height,
      0,
      formatInfo.formatEnum,
      formatInfo.type,
      null
    )
    gl.bindTexture(gl.TEXTURE_2D, null)
  }
  
  /**
   * Read pixels from the render target
   * @param x - Starting x coordinate (default: 0)
   * @param y - Starting y coordinate (default: 0)
   * @param w - Width to read (default: full width)
   * @param h - Height to read (default: full height)
   * @returns Typed array with pixel data
   */
  readPixels(x: number = 0, y: number = 0, w?: number, h?: number): Uint8Array | Float32Array {
    const gl = this._gl
    const width = w ?? this.width
    const height = h ?? this.height
    const formatInfo = getFormatInfo(gl, this.format)
    
    // Bind framebuffer for reading
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
    
    // Create appropriate typed array
    let pixels: Uint8Array | Float32Array
    
    if (this.format === 'rgba8') {
      pixels = new Uint8Array(width * height * 4)
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    } else {
      // For float formats, we need to read as floats
      pixels = new Float32Array(width * height * 4)
      gl.readPixels(x, y, width, height, gl.RGBA, gl.FLOAT, pixels)
    }
    
    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    
    return pixels
  }
  
  /**
   * Write data to the texture
   * @param data - Typed array containing pixel data
   * @param x - X offset (default: 0)
   * @param y - Y offset (default: 0)
   * @param width - Width to write (default: full width)
   * @param height - Height to write (default: full height)
   */
  write(
    data: Float32Array | Uint8Array | Uint16Array | Uint32Array,
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): void {
    const gl = this._gl
    const w = width ?? this.width
    const h = height ?? this.height
    const formatInfo = getFormatInfo(gl, this.format)
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0, // level
      x, y, // offset
      w, h, // dimensions
      formatInfo.formatEnum,
      formatInfo.type,
      data
    )
    gl.bindTexture(gl.TEXTURE_2D, null)
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this._gl
    gl.deleteFramebuffer(this.framebuffer)
    gl.deleteTexture(this.texture)
  }
}
