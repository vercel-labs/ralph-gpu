/**
 * RenderTarget - Framebuffer with texture attachment
 * 
 * Allows rendering to a texture instead of the default framebuffer.
 * Supports rgba8, rgba16f, and rgba32f formats.
 */

/**
 * Supported render target formats
 */
export type RenderTargetFormat = 'rgba8' | 'rgba16f' | 'rgba32f';

/**
 * Options for RenderTarget creation
 */
export interface RenderTargetOptions {
  /** Texture format (default: 'rgba8') */
  format?: RenderTargetFormat;
  /** Minification filter (default: gl.LINEAR) */
  minFilter?: number;
  /** Magnification filter (default: gl.LINEAR) */
  magFilter?: number;
  /** Wrap mode for S coordinate (default: gl.CLAMP_TO_EDGE) */
  wrapS?: number;
  /** Wrap mode for T coordinate (default: gl.CLAMP_TO_EDGE) */
  wrapT?: number;
}

/**
 * Format configuration for WebGL internal format, format, and type
 */
interface FormatConfig {
  internalFormat: number;
  format: number;
  type: number;
  bytesPerPixel: number;
}

/**
 * RenderTarget class for framebuffer rendering
 */
export class RenderTarget {
  /** WebGL texture */
  texture: WebGLTexture | null = null;
  
  /** Target width in pixels */
  width: number = 0;
  
  /** Target height in pixels */
  height: number = 0;
  
  /** WebGL framebuffer */
  private framebuffer: WebGLFramebuffer | null = null;
  
  /** WebGL context reference */
  private gl: WebGL2RenderingContext;
  
  /** Texture format */
  private format: RenderTargetFormat;
  
  /** Format configuration */
  private formatConfig: FormatConfig;
  
  /** Filter options */
  private minFilter: number;
  private magFilter: number;
  private wrapS: number;
  private wrapT: number;

  /**
   * Create a new RenderTarget
   * @param gl - WebGL 2.0 rendering context
   * @param width - Target width in pixels
   * @param height - Target height in pixels
   * @param options - Configuration options
   */
  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    options: RenderTargetOptions = {}
  ) {
    this.gl = gl;
    this.format = options.format ?? 'rgba8';
    this.minFilter = options.minFilter ?? gl.LINEAR;
    this.magFilter = options.magFilter ?? gl.LINEAR;
    this.wrapS = options.wrapS ?? gl.CLAMP_TO_EDGE;
    this.wrapT = options.wrapT ?? gl.CLAMP_TO_EDGE;
    
    // Get format configuration
    this.formatConfig = this.getFormatConfig();
    
    // Enable float texture extensions if needed
    this.enableRequiredExtensions();
    
    // Create framebuffer and texture
    this.createFramebuffer(width, height);
  }

  /**
   * Get WebGL format configuration for the selected format
   */
  private getFormatConfig(): FormatConfig {
    const gl = this.gl;
    
    switch (this.format) {
      case 'rgba8':
        return {
          internalFormat: gl.RGBA8,
          format: gl.RGBA,
          type: gl.UNSIGNED_BYTE,
          bytesPerPixel: 4,
        };
      case 'rgba16f':
        return {
          internalFormat: gl.RGBA16F,
          format: gl.RGBA,
          type: gl.HALF_FLOAT,
          bytesPerPixel: 8,
        };
      case 'rgba32f':
        return {
          internalFormat: gl.RGBA32F,
          format: gl.RGBA,
          type: gl.FLOAT,
          bytesPerPixel: 16,
        };
      default:
        throw new Error(`Unsupported format: ${this.format}`);
    }
  }

  /**
   * Enable required WebGL extensions for float textures
   */
  private enableRequiredExtensions(): void {
    const gl = this.gl;
    
    if (this.format === 'rgba16f' || this.format === 'rgba32f') {
      // Required for rendering to float textures
      const colorBufferFloat = gl.getExtension('EXT_color_buffer_float');
      if (!colorBufferFloat) {
        console.warn('EXT_color_buffer_float not supported, float render targets may not work');
      }
    }
    
    if (this.format === 'rgba16f') {
      // Required for half-float textures
      const colorBufferHalfFloat = gl.getExtension('EXT_color_buffer_half_float');
      if (!colorBufferHalfFloat) {
        console.warn('EXT_color_buffer_half_float not supported');
      }
    }
  }

  /**
   * Create framebuffer with texture attachment
   */
  private createFramebuffer(width: number, height: number): void {
    const gl = this.gl;
    
    this.width = width;
    this.height = height;
    
    // Create texture
    this.texture = gl.createTexture();
    if (!this.texture) {
      throw new Error('Failed to create texture');
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
    
    // Allocate texture storage
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.formatConfig.internalFormat,
      width,
      height,
      0,
      this.formatConfig.format,
      this.formatConfig.type,
      null
    );
    
    // Create framebuffer
    this.framebuffer = gl.createFramebuffer();
    if (!this.framebuffer) {
      throw new Error('Failed to create framebuffer');
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // Attach texture to framebuffer
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    
    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      const statusMsg = this.getFramebufferStatusMessage(status);
      throw new Error(`Framebuffer not complete: ${statusMsg}`);
    }
    
    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Get human-readable framebuffer status message
   */
  private getFramebufferStatusMessage(status: number): string {
    const gl = this.gl;
    const statusMap: Record<number, string> = {
      [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]: 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT',
      [gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT',
      [gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS]: 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS',
      [gl.FRAMEBUFFER_UNSUPPORTED]: 'FRAMEBUFFER_UNSUPPORTED',
      [gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE]: 'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE',
    };
    return statusMap[status] ?? `Unknown status: ${status}`;
  }

  /**
   * Resize the render target
   * @param width - New width in pixels
   * @param height - New height in pixels
   * @returns The RenderTarget instance for chaining
   */
  resize(width: number, height: number): this {
    if (width === this.width && height === this.height) {
      return this;
    }
    
    // Dispose old resources
    this.disposeResources();
    
    // Create new framebuffer with new size
    this.createFramebuffer(width, height);
    
    return this;
  }

  /**
   * Bind this render target for rendering
   */
  bind(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
  }

  /**
   * Unbind this render target (bind default framebuffer)
   */
  unbind(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Read pixels from the render target (GPU → CPU transfer)
   * @param x - X coordinate (default: 0)
   * @param y - Y coordinate (default: 0)
   * @param width - Width to read (default: this.width)
   * @param height - Height to read (default: this.height)
   * @returns Pixel data as Uint8Array (rgba8) or Float32Array (rgba16f, rgba32f)
   */
  readPixels(
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): Uint8Array | Float32Array {
    const gl = this.gl;
    const w = width ?? this.width;
    const h = height ?? this.height;
    
    // Bind framebuffer for reading
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    let pixels: Uint8Array | Float32Array;
    
    if (this.format === 'rgba8') {
      pixels = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } else {
      // rgba16f and rgba32f both read as FLOAT
      pixels = new Float32Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.FLOAT, pixels);
    }
    
    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    return pixels;
  }

  /**
   * Get the framebuffer object
   */
  getFramebuffer(): WebGLFramebuffer | null {
    return this.framebuffer;
  }

  /**
   * Dispose internal resources without nullifying
   */
  private disposeResources(): void {
    const gl = this.gl;
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    
    if (this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }
  }

  /**
   * Dispose the render target and clean up resources
   */
  dispose(): void {
    this.disposeResources();
    this.width = 0;
    this.height = 0;
  }
}
