/**
 * Color type for clear operations
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Options for GLContext initialization
 */
export interface GLContextOptions {
  /** Enable antialiasing (default: true) */
  antialias?: boolean;
  /** Enable alpha channel (default: true) */
  alpha?: boolean;
  /** Preserve drawing buffer (default: false) */
  preserveDrawingBuffer?: boolean;
  /** Power preference (default: 'high-performance') */
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  /** Enable stencil buffer (default: false) */
  stencil?: boolean;
  /** Enable depth buffer (default: true) */
  depth?: boolean;
}

/**
 * GLContext - Core WebGL 2.0 context manager
 * 
 * Manages WebGL 2.0 state including context creation, resizing,
 * and time management for animation frames.
 */
export class GLContext {
  /** The WebGL 2.0 rendering context */
  gl: WebGL2RenderingContext | null = null;
  
  /** The canvas element */
  canvas: HTMLCanvasElement | null = null;
  
  /** Canvas width in pixels (accounting for DPR) */
  width: number = 0;
  
  /** Canvas height in pixels (accounting for DPR) */
  height: number = 0;
  
  /** Current time in seconds since init */
  time: number = 0;
  
  /** Time elapsed since last frame in seconds */
  deltaTime: number = 0;
  
  /** Current frame number */
  frame: number = 0;
  
  /** Device pixel ratio */
  private dpr: number = 1;
  
  /** Start time for time tracking */
  private startTime: number = 0;
  
  /** Last frame time for deltaTime calculation */
  private lastFrameTime: number = 0;

  /**
   * Check if WebGL 2.0 is supported in this environment
   */
  static isSupported(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the WebGL 2.0 context
   * @param canvas - The canvas element or selector
   * @param options - Context creation options
   * @returns The GLContext instance for chaining
   */
  init(
    canvas: HTMLCanvasElement | string,
    options: GLContextOptions = {}
  ): this {
    // Resolve canvas element
    if (typeof canvas === 'string') {
      const element = document.querySelector(canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element not found: ${canvas}`);
      }
      this.canvas = element;
    } else {
      this.canvas = canvas;
    }

    // Merge default options
    const contextOptions: WebGLContextAttributes = {
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      powerPreference: options.powerPreference ?? 'high-performance',
      stencil: options.stencil ?? false,
      depth: options.depth ?? true,
    };

    // Create WebGL 2.0 context
    const gl = this.canvas.getContext('webgl2', contextOptions);
    if (!gl) {
      throw new Error('WebGL 2.0 is not supported');
    }
    this.gl = gl;

    // Get device pixel ratio
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Initialize size
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);

    // Initialize time tracking
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.time = 0;
    this.deltaTime = 0;
    this.frame = 0;

    return this;
  }

  /**
   * Resize the canvas with DPR support
   * @param width - Logical width in CSS pixels
   * @param height - Logical height in CSS pixels
   * @returns The GLContext instance for chaining
   */
  resize(width: number, height: number): this {
    if (!this.canvas || !this.gl) {
      throw new Error('GLContext not initialized. Call init() first.');
    }

    // Calculate physical pixels
    this.width = Math.floor(width * this.dpr);
    this.height = Math.floor(height * this.dpr);

    // Update canvas size
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Set CSS size (logical pixels)
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Update viewport
    this.gl.viewport(0, 0, this.width, this.height);

    return this;
  }

  /**
   * Clear the canvas with a color
   * @param color - Clear color (r, g, b in 0-1 range, optional a)
   * @returns The GLContext instance for chaining
   */
  clear(color: Color = { r: 0, g: 0, b: 0, a: 1 }): this {
    if (!this.gl) {
      throw new Error('GLContext not initialized. Call init() first.');
    }

    const { r, g, b, a = 1 } = color;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    return this;
  }

  /**
   * Update time tracking. Call this at the start of each frame.
   * @returns The GLContext instance for chaining
   */
  updateTime(): this {
    const now = performance.now();
    this.time = (now - this.startTime) / 1000;
    this.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.frame++;

    return this;
  }

  /**
   * Get the device pixel ratio
   */
  getDevicePixelRatio(): number {
    return this.dpr;
  }

  /**
   * Destroy the context and clean up resources
   */
  destroy(): void {
    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    }
    this.gl = null;
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.deltaTime = 0;
    this.frame = 0;
  }
}
