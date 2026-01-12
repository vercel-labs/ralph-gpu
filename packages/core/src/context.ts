/**
 * GPU context management
 */

import type {
  GPUContextOptions,
  PassOptions,
  MaterialOptions,
  ComputeOptions,
  RenderTargetOptions,
  MRTOutputs,
  SimpleUniforms,
  ParticlesOptions,
} from "./types";
import {
  WebGPUNotSupportedError,
  DeviceCreationError,
} from "./errors";
import { Pass } from "./pass";
import { Material } from "./material";
import { ComputeShader } from "./compute";
import { RenderTarget } from "./target";
import { PingPongTarget } from "./ping-pong";
import { createMultiRenderTarget, MultiRenderTarget } from "./mrt";
import { StorageBuffer } from "./storage";
import { Particles } from "./particles";
import {
  createGlobalsBuffer,
  updateGlobalsBuffer,
} from "./uniforms";
import type { GlobalUniforms } from "./types";

/**
 * GPU Context class
 */
export class GPUContext {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private canvas: HTMLCanvasElement;
  private format: GPUTextureFormat;
  private globalsBuffer: GPUBuffer;
  private globals: GlobalUniforms;
  private _width: number;
  private _height: number;
  private _time = 0;
  private _timeScale = 1;
  private _paused = false;
  private _autoClear = true;
  private _frame = 0;
  private lastFrameTime = 0;
  private currentTarget: RenderTarget | MultiRenderTarget | null = null;
  private viewportState: { x: number; y: number; width: number; height: number } | null = null;
  private scissorState: { x: number; y: number; width: number; height: number } | null = null;
  private _dpr: number;
  private debug: boolean;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    canvas: HTMLCanvasElement,
    format: GPUTextureFormat,
    options: GPUContextOptions = {}
  ) {
    this.device = device;
    this.context = context;
    this.canvas = canvas;
    this.format = format;
    this._dpr = options.dpr ?? Math.min(window.devicePixelRatio, 2);
    this.debug = options.debug || false;

    // Set canvas size based on display size or canvas attributes
    if (options.autoResize) {
      // Use display size (CSS size) for autoResize - apply DPR
      const rect = canvas.getBoundingClientRect();
      this._width = Math.floor(rect.width * this._dpr);
      this._height = Math.floor(rect.height * this._dpr);
      canvas.width = this._width;
      canvas.height = this._height;
      
      // Setup ResizeObserver to track canvas size changes
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this._width = Math.floor(width * this._dpr);
          this._height = Math.floor(height * this._dpr);
          this.canvas.width = this._width;
          this.canvas.height = this._height;
        }
      });
      this.resizeObserver.observe(canvas);
    } else {
      // When NOT using autoResize, use canvas.width/height directly as pixel dimensions
      // User has already set the pixel size they want - don't multiply by DPR
      // This avoids double-multiplication issues with React StrictMode remounts
      this._width = canvas.width;
      this._height = canvas.height;
    }

    // Configure context
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });

    // Create globals buffer
    this.globalsBuffer = createGlobalsBuffer(device);
    this.globals = {
      resolution: [this._width, this._height],
      time: 0,
      deltaTime: 0,
      frame: 0,
      aspect: this._width / this._height,
    };

    this.updateGlobals();
  }

  /**
   * Get canvas width
   */
  get width(): number {
    return this._width;
  }

  /**
   * Get canvas height
   */
  get height(): number {
    return this._height;
  }

  /**
   * Get/set time
   */
  get time(): number {
    return this._time;
  }

  set time(value: number) {
    this._time = value;
  }

  /**
   * Get/set time scale
   */
  get timeScale(): number {
    return this._timeScale;
  }

  set timeScale(value: number) {
    this._timeScale = value;
  }

  /**
   * Get/set paused state
   */
  get paused(): boolean {
    return this._paused;
  }

  set paused(value: boolean) {
    this._paused = value;
  }

  /**
   * Get/set auto clear
   */
  get autoClear(): boolean {
    return this._autoClear;
  }

  set autoClear(value: boolean) {
    this._autoClear = value;
  }

  /**
   * Get the GPU device
   */
  get gpuDevice(): GPUDevice {
    return this.device;
  }

  /**
   * Update global uniforms
   */
  private updateGlobals(): void {
    const now = performance.now() / 1000;
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
    }

    if (!this._paused) {
      const deltaTime = (now - this.lastFrameTime) * this._timeScale;
      this._time += deltaTime;
      this.globals.deltaTime = deltaTime;
    } else {
      this.globals.deltaTime = 0;
    }

    this.lastFrameTime = now;
    this.globals.time = this._time;
    this.globals.frame = this._frame++;

    // Update resolution based on current target
    if (this.currentTarget) {
      if (this.currentTarget instanceof RenderTarget) {
        this.globals.resolution = [this.currentTarget.width, this.currentTarget.height];
        this.globals.aspect = this.currentTarget.width / this.currentTarget.height;
      } else if (this.currentTarget instanceof MultiRenderTarget) {
        this.globals.resolution = [this.currentTarget.width, this.currentTarget.height];
        this.globals.aspect = this.currentTarget.width / this.currentTarget.height;
      }
    } else {
      this.globals.resolution = [this._width, this._height];
      this.globals.aspect = this._width / this._height;
    }

    // DEBUG: Log resolution for first few frames
    if (this._frame < 5) {
      console.log(`[GPUContext] Frame ${this._frame}: resolution=${this.globals.resolution[0]}x${this.globals.resolution[1]}, target=${this.currentTarget ? 'FBO' : 'screen'}`);
    }

    updateGlobalsBuffer(this.device, this.globalsBuffer, this.globals);
  }

  /**
   * Create a fullscreen pass
   * 
   * **Simple mode** (recommended): Pass plain values, WGSL bindings auto-generated
   * ```typescript
   * ctx.pass(`
   *   @fragment
   *   fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
   *     let tex = textureSample(uTexture, uTextureSampler, pos.xy / globals.resolution);
   *     return tex * vec4f(uniforms.color, 1.0) * uniforms.intensity;
   *   }
   * `, {
   *   uTexture: someTarget,
   *   color: [1, 0, 0],
   *   intensity: 0.5,
   * });
   * ```
   * 
   * **Manual mode**: Write your own @group(1) @binding() declarations
   * ```typescript
   * ctx.pass(`
   *   @group(1) @binding(0) var uTexture: texture_2d<f32>;
   *   @group(1) @binding(1) var uTextureSampler: sampler;
   *   struct Params { color: vec3f, intensity: f32, }
   *   @group(1) @binding(2) var<uniform> params: Params;
   *   @fragment fn main(...) { ... }
   * `, { uniforms: { uTexture: { value: someTarget }, ... } });
   * ```
   */
  pass(fragmentWGSL: string, options?: PassOptions): Pass;
  pass(fragmentWGSL: string, simpleUniforms?: SimpleUniforms): Pass;
  pass(fragmentWGSL: string, optionsOrUniforms?: PassOptions | SimpleUniforms): Pass {
    // Detect if it's SimpleUniforms or PassOptions
    // PassOptions has 'uniforms' or 'blend' keys with specific structure
    // SimpleUniforms has plain values directly
    if (optionsOrUniforms && !this.isPassOptions(optionsOrUniforms)) {
      // Simple mode: auto-generate bindings
      return new Pass(this.device, fragmentWGSL, this.globalsBuffer, this, {}, optionsOrUniforms as SimpleUniforms);
    }
    // Manual mode
    return new Pass(this.device, fragmentWGSL, this.globalsBuffer, this, optionsOrUniforms as PassOptions);
  }

  /**
   * Check if an object is PassOptions (has 'uniforms' key with { value: T } structure or 'blend' key)
   */
  private isPassOptions(obj: any): obj is PassOptions {
    if (!obj || typeof obj !== 'object') return false;
    // If it has 'blend' key, it's PassOptions
    if ('blend' in obj) return true;
    // If it has 'uniforms' key, check if uniforms have { value: T } structure
    if ('uniforms' in obj && obj.uniforms) {
      const firstKey = Object.keys(obj.uniforms)[0];
      if (firstKey && obj.uniforms[firstKey] && typeof obj.uniforms[firstKey] === 'object' && 'value' in obj.uniforms[firstKey]) {
        return true;
      }
    }
    // If no uniforms but has 'uniforms' key, it's still PassOptions
    if ('uniforms' in obj) return true;
    return false;
  }

  /**
   * Create a material
   */
  material(wgsl: string, options?: MaterialOptions): Material {
    return new Material(this.device, wgsl, this.globalsBuffer, this, options);
  }

  /**
   * Create a compute shader
   */
  compute(wgsl: string, options?: ComputeOptions): ComputeShader {
    return new ComputeShader(this.device, wgsl, this.globalsBuffer, options);
  }

  /**
   * Create a render target
   */
  target(width: number, height: number, options?: RenderTargetOptions): RenderTarget {
    return new RenderTarget(this.device, width, height, options);
  }

  /**
   * Create a ping-pong buffer
   */
  pingPong(width: number, height: number, options?: RenderTargetOptions): PingPongTarget {
    return new PingPongTarget(this.device, width, height, options);
  }

  /**
   * Create multiple render targets
   */
  mrt(outputs: MRTOutputs, width: number, height: number): MultiRenderTarget {
    return createMultiRenderTarget(this.device, outputs, width, height);
  }

  /**
   * Create a storage buffer
   */
  storage(byteSize: number): StorageBuffer {
    return new StorageBuffer(this.device, byteSize);
  }

  /**
   * Create a particle system with instanced quads
   * 
   * User provides full shader control - no built-in colors, shapes, or assumptions.
   * Built-in helpers: quadOffset(vid) returns -0.5 to 0.5, quadUV(vid) returns 0 to 1
   * 
   * ```typescript
   * const particles = ctx.particles(1000, {
   *   shader: \`
   *     struct Particle { pos: vec2f, size: f32, _pad: f32 }
   *     @group(1) @binding(0) var<storage, read> particles: array<Particle>;
   *     
   *     struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f }
   *     
   *     @vertex fn vs_main(@builtin(instance_index) iid: u32, @builtin(vertex_index) vid: u32) -> VertexOutput {
   *       let p = particles[iid];
   *       var out: VertexOutput;
   *       out.position = vec4f(p.pos + quadOffset(vid) * p.size, 0.0, 1.0);
   *       out.uv = quadUV(vid);
   *       return out;
   *     }
   *     
   *     @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f {
   *       return vec4f(1.0); // White square
   *     }
   *   \`,
   *   bufferSize: 1000 * 16, // 16 bytes per particle
   * });
   * 
   * particles.write(myFloat32Array);
   * particles.draw();
   * ```
   */
  particles(count: number, options: ParticlesOptions): Particles {
    return new Particles(this, count, options);
  }

  /**
   * Set the render target
   */
  setTarget(target: RenderTarget | MultiRenderTarget | null): void {
    this.currentTarget = target;
  }

  /**
   * Set viewport
   */
  setViewport(x?: number, y?: number, width?: number, height?: number): void {
    if (x === undefined) {
      this.viewportState = null;
    } else {
      this.viewportState = {
        x: x!,
        y: y!,
        width: width!,
        height: height!,
      };
    }
  }

  /**
   * Set scissor rect
   */
  setScissor(x?: number, y?: number, width?: number, height?: number): void {
    if (x === undefined) {
      this.scissorState = null;
    } else {
      this.scissorState = {
        x: x!,
        y: y!,
        width: width!,
        height: height!,
      };
    }
  }

  /**
   * Clear the current target
   */
  clear(
    target?: RenderTarget | MultiRenderTarget | null,
    color: [number, number, number, number] = [0, 0, 0, 1]
  ): void {
    const clearTarget = target !== undefined ? target : this.currentTarget;

    const commandEncoder = this.device.createCommandEncoder();
    
    if (clearTarget === null) {
      // Clear screen
      const textureView = this.context.getCurrentTexture().createView();
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: color[0], g: color[1], b: color[2], a: color[3] },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.end();
    } else if (clearTarget instanceof RenderTarget) {
      // Clear render target
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: clearTarget.view,
            clearValue: { r: color[0], g: color[1], b: color[2], a: color[3] },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.end();
    } else if (clearTarget instanceof MultiRenderTarget) {
      // Clear MRT
      const views = clearTarget.getViews();
      const colorAttachments = views.map((view) => ({
        view,
        clearValue: { r: color[0], g: color[1], b: color[2], a: color[3] },
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      }));
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments,
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Resize the context (width/height in pixels, DPR already applied)
   */
  resize(width: number, height: number): void {
    this._width = Math.floor(width);
    this._height = Math.floor(height);
    this.canvas.width = this._width;
    this.canvas.height = this._height;
  }

  /**
   * Get the current device pixel ratio
   */
  get dpr(): number {
    return this._dpr;
  }

  /**
   * Set the device pixel ratio and resize canvas accordingly
   */
  set dpr(value: number) {
    this._dpr = value;
    // Recalculate size based on display size
    const rect = this.canvas.getBoundingClientRect();
    this._width = Math.floor(rect.width * this._dpr);
    this._height = Math.floor(rect.height * this._dpr);
    this.canvas.width = this._width;
    this.canvas.height = this._height;
  }

  /**
   * Read pixels from current target or screen
   */
  async readPixels(
    x = 0,
    y = 0,
    width = this._width,
    height = this._height
  ): Promise<Uint8Array | Float32Array> {
    if (this.currentTarget && this.currentTarget instanceof RenderTarget) {
      return this.currentTarget.readPixels(x, y, width, height);
    }

    // Read from screen
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const bufferSize = bytesPerRow * height;

    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const texture = this.context.getCurrentTexture();
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture, origin: { x, y, z: 0 } },
      { buffer, bytesPerRow },
      { width, height, depthOrArrayLayers: 1 }
    );
    this.device.queue.submit([encoder.finish()]);

    await buffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = buffer.getMappedRange();
    const data = new Uint8Array(arrayBuffer.slice(0));
    buffer.unmap();
    buffer.destroy();

    return data;
  }

  /**
   * Execute a pass or material draw call (internal helper)
   */
  private executeDrawCall(
    drawable: Pass | Material,
    commandEncoder: GPUCommandEncoder
  ): void {
    let view: GPUTextureView;
    let format: GPUTextureFormat;
    let loadOp: GPULoadOp = this._autoClear ? "clear" : "load";

    if (this.currentTarget === null) {
      view = this.context.getCurrentTexture().createView();
      format = this.format;
    } else if (this.currentTarget instanceof RenderTarget) {
      view = this.currentTarget.view;
      // Get the actual GPU texture format from the render target
      const formatMap: Record<string, GPUTextureFormat> = {
        "rgba8unorm": "rgba8unorm",
        "rgba16float": "rgba16float",
        "r16float": "r16float",
        "rg16float": "rg16float",
        "r32float": "r32float",
      };
      format = formatMap[this.currentTarget.format] || "rgba8unorm";
    } else {
      // MRT - use first target for now (should handle properly)
      const views = this.currentTarget.getViews();
      view = views[0];
      format = this.format; // TODO: Get format from MRT
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp,
          storeOp: "store",
        },
      ],
    };

    drawable.drawInternal(commandEncoder, renderPassDescriptor, format);
  }

  /**
   * Begin a frame (updates globals, returns command encoder)
   */
  beginFrame(): GPUCommandEncoder {
    this.updateGlobals();
    return this.device.createCommandEncoder();
  }

  /**
   * End a frame (submits commands)
   */
  endFrame(commandEncoder: GPUCommandEncoder): void {
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Helper to draw a pass
   */
  drawPass(pass: Pass): void {
    const encoder = this.beginFrame();
    this.executeDrawCall(pass, encoder);
    this.endFrame(encoder);
  }

  /**
   * Helper to draw a material
   */
  drawMaterial(material: Material): void {
    const encoder = this.beginFrame();
    this.executeDrawCall(material, encoder);
    this.endFrame(encoder);
  }

  /**
   * Dispose the context
   */
  dispose(): void {
    // Disconnect ResizeObserver if active
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.globalsBuffer.destroy();
    // Unconfigure the canvas context before destroying the device
    // This is required to allow re-initialization with a new device
    this.context.unconfigure();
    this.device.destroy();
  }
}

/**
 * GPU module for initialization
 */
export const gpu = {
  /**
   * Check if WebGPU is supported
   */
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  },

  /**
   * Initialize GPU context
   */
  async init(
    canvas: HTMLCanvasElement,
    options: GPUContextOptions = {}
  ): Promise<GPUContext> {
    if (!this.isSupported()) {
      throw new WebGPUNotSupportedError();
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new DeviceCreationError("Failed to get GPU adapter");
      }

      const device = await adapter.requestDevice();
      const context = canvas.getContext("webgpu");
      if (!context) {
        throw new DeviceCreationError("Failed to get WebGPU context");
      }

      const format = navigator.gpu.getPreferredCanvasFormat();

      return new GPUContext(device, context, canvas, format, options);
    } catch (error) {
      if (
        error instanceof WebGPUNotSupportedError ||
        error instanceof DeviceCreationError
      ) {
        throw error;
      }
      throw new DeviceCreationError((error as Error).message);
    }
  },
};
