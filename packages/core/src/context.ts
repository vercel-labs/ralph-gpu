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
  private dpr: number;
  private debug: boolean;

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
    this.dpr = options.dpr || 1;
    this.debug = options.debug || false;

    // Set canvas size
    this._width = Math.floor(canvas.width * this.dpr);
    this._height = Math.floor(canvas.height * this.dpr);
    canvas.width = this._width;
    canvas.height = this._height;

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

    updateGlobalsBuffer(this.device, this.globalsBuffer, this.globals);
  }

  /**
   * Create a fullscreen pass
   */
  pass(fragmentWGSL: string, options?: PassOptions): Pass {
    return new Pass(this.device, fragmentWGSL, this.globalsBuffer, this, options);
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
   * Resize the context
   */
  resize(width: number, height: number): void {
    this._width = Math.floor(width * this.dpr);
    this._height = Math.floor(height * this.dpr);
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
    let loadOp: GPULoadOp = this._autoClear ? "clear" : "load";

    if (this.currentTarget === null) {
      view = this.context.getCurrentTexture().createView();
    } else if (this.currentTarget instanceof RenderTarget) {
      view = this.currentTarget.view;
    } else {
      // MRT - use first target for now (should handle properly)
      const views = this.currentTarget.getViews();
      view = views[0];
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

    drawable.drawInternal(commandEncoder, renderPassDescriptor, this.format);
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
    this.globalsBuffer.destroy();
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
