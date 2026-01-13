/**
 * GLContext - WebGL 2.0 context wrapper
 * 
 * Manages the WebGL context, global state, and provides factory
 * methods for creating passes, materials, and render targets.
 * 
 * Equivalent to the Context class in ralph-gpu.
 */

import type { GLContextOptions, PassOptions, MaterialOptions, RenderTargetOptions } from './types'
import { Pass } from './pass'
import { Material } from './material'
import { RenderTarget } from './target'
import { PingPongTarget } from './ping-pong'
import { StorageBuffer } from './storage'
import { WebGLNotSupportedError } from './errors'

export class GLContext {
  /** The underlying WebGL2RenderingContext */
  gl: WebGL2RenderingContext
  
  /** The canvas element */
  canvas: HTMLCanvasElement
  
  /** Canvas width in pixels */
  width: number = 0
  
  /** Canvas height in pixels */
  height: number = 0
  
  /** Time since context creation in seconds */
  time: number = 0
  
  /** Time elapsed since last frame in seconds */
  deltaTime: number = 0
  
  /** Time scale multiplier (default: 1.0) */
  timeScale: number = 1
  
  /** Whether the context is paused */
  paused: boolean = false
  
  /** Current frame number */
  frame: number = 0
  
  /** Device pixel ratio */
  dpr: number = 1
  
  /** Currently active render target (null = canvas) */
  private _currentTarget: RenderTarget | null = null
  
  /** Auto-resize observer */
  private _resizeObserver: ResizeObserver | null = null
  
  /** Options used to create this context */
  private _options: GLContextOptions
  
  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, options?: GLContextOptions) {
    this.gl = gl
    this.canvas = canvas
    this._options = options ?? {}
    
    // Enable required extensions for float textures
    gl.getExtension('EXT_color_buffer_float')
    gl.getExtension('OES_texture_float_linear')
    
    // Set device pixel ratio
    this.dpr = options?.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    
    // Initialize canvas size
    this.updateSize()
    
    // Setup auto-resize if enabled
    if (options?.autoResize !== false) {
      this.setupAutoResize()
    }
  }
  
  /**
   * Update canvas size from current dimensions
   */
  private updateSize(): void {
    const canvas = this.canvas
    const dpr = this.dpr
    
    // Get CSS size
    const cssWidth = canvas.clientWidth || canvas.width
    const cssHeight = canvas.clientHeight || canvas.height
    
    // Set canvas buffer size with DPR
    const width = Math.floor(cssWidth * dpr)
    const height = Math.floor(cssHeight * dpr)
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    
    this.width = width
    this.height = height
    
    // Update viewport if rendering to canvas
    if (!this._currentTarget) {
      this.gl.viewport(0, 0, width, height)
    }
  }
  
  /**
   * Setup auto-resize observer
   */
  private setupAutoResize(): void {
    if (typeof ResizeObserver === 'undefined') {
      // Fallback to window resize for older browsers
      if (typeof window !== 'undefined') {
        const handleResize = () => this.updateSize()
        window.addEventListener('resize', handleResize)
      }
      return
    }
    
    this._resizeObserver = new ResizeObserver(() => {
      this.updateSize()
    })
    
    this._resizeObserver.observe(this.canvas)
  }
  
  /**
   * Create a fullscreen fragment shader pass
   */
  pass(fragmentGLSL: string, options?: PassOptions): Pass {
    // TODO: Implement pass creation
    return new Pass(this, fragmentGLSL, options)
  }
  
  /**
   * Create a material with custom vertex and fragment shaders
   */
  material(vertexGLSL: string, fragmentGLSL: string, options?: MaterialOptions): Material {
    // TODO: Implement material creation
    return new Material(this, vertexGLSL, fragmentGLSL, options)
  }
  
  /**
   * Create an offscreen render target
   * @param width - Width in pixels (default: canvas width)
   * @param height - Height in pixels (default: canvas height)
   * @param options - Render target options
   */
  target(width?: number, height?: number, options?: RenderTargetOptions): RenderTarget {
    return new RenderTarget(this, width, height, options)
  }
  
  /**
   * Create a ping-pong buffer pair for iterative effects
   */
  pingPong(width?: number, height?: number, options?: RenderTargetOptions): PingPongTarget {
    // TODO: Implement ping-pong target creation
    return new PingPongTarget(this, width, height, options)
  }
  
  /**
   * Create a storage buffer for large data
   */
  storage(byteSize: number): StorageBuffer {
    // TODO: Implement storage buffer creation
    return new StorageBuffer(this, byteSize)
  }
  
  /**
   * Set the active render target (null = canvas)
   * @param target - RenderTarget to render to, or null for canvas
   */
  setTarget(target: RenderTarget | null): void {
    const gl = this.gl
    
    this._currentTarget = target
    
    if (target) {
      // Bind framebuffer and set viewport
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
      gl.viewport(0, 0, target.width, target.height)
    } else {
      // Bind canvas (null framebuffer) and restore viewport
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.width, this.height)
    }
  }
  
  /**
   * Get the currently active render target
   */
  get currentTarget(): RenderTarget | null {
    return this._currentTarget
  }
  
  /**
   * Clear the current render target
   */
  clear(color?: [number, number, number, number]): void {
    const gl = this.gl
    const [r, g, b, a] = color ?? [0, 0, 0, 1]
    gl.clearColor(r, g, b, a)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }
  
  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.width = width
    this.height = height
    
    // Update viewport if rendering to canvas
    if (!this._currentTarget) {
      this.gl.viewport(0, 0, width, height)
    }
  }
  
  /**
   * Clean up all WebGL resources
   */
  dispose(): void {
    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }
  }
}

/**
 * Factory object for creating GLContext instances
 */
export const gl = {
  /**
   * Check if WebGL 2.0 is supported
   */
  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!canvas.getContext('webgl2')
    } catch {
      return false
    }
  },
  
  /**
   * Initialize a WebGL 2.0 context
   */
  async init(canvas: HTMLCanvasElement, options?: GLContextOptions): Promise<GLContext> {
    const webgl2 = canvas.getContext('webgl2', {
      alpha: options?.alpha ?? true,
      antialias: options?.antialias ?? false,
      depth: options?.depth ?? false,
      stencil: options?.stencil ?? false,
      premultipliedAlpha: options?.premultipliedAlpha ?? true,
      preserveDrawingBuffer: options?.preserveDrawingBuffer ?? false,
      powerPreference: options?.powerPreference ?? 'high-performance',
    })
    
    if (!webgl2) {
      throw new WebGLNotSupportedError(
        'WebGL 2.0 is not supported in this browser. ' +
        'Try updating your browser or using Chrome/Firefox/Safari.'
      )
    }
    
    return new GLContext(webgl2, canvas, options)
  },
}
