/**
 * Render target management
 */

import type { RenderTargetOptions, FilterMode, WrapMode, TextureFormat } from "./types";

/**
 * Maps our texture format strings to GPUTextureFormat
 */
function getGPUTextureFormat(format: TextureFormat): GPUTextureFormat {
  const formatMap: Record<TextureFormat, GPUTextureFormat> = {
    "rgba8unorm": "rgba8unorm",
    "rgba16float": "rgba16float",
    "r16float": "r16float",
    "rg16float": "rg16float",
    "r32float": "r32float",
  };
  return formatMap[format];
}

/**
 * Render target class
 */
export class RenderTarget {
  private device: GPUDevice;
  private _texture!: GPUTexture;
  private _view!: GPUTextureView;
  private _sampler!: GPUSampler;
  private _width: number;
  private _height: number;
  private _format: TextureFormat;
  private _filter: FilterMode;
  private _wrap: WrapMode;

  constructor(
    device: GPUDevice,
    width: number,
    height: number,
    options: RenderTargetOptions = {}
  ) {
    this.device = device;
    this._width = width;
    this._height = height;
    this._format = options.format || "rgba8unorm";
    this._filter = options.filter || "linear";
    this._wrap = options.wrap || "clamp";

    // Create texture and view
    this.createTexture();
    this.createSampler();
  }

  private createTexture(): void {
    this._texture = this.device.createTexture({
      size: { width: this._width, height: this._height },
      format: getGPUTextureFormat(this._format),
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this._view = this._texture.createView();
  }

  private createSampler(): void {
    const addressMode = this._wrap === "clamp" ? "clamp-to-edge" : 
                       this._wrap === "repeat" ? "repeat" : "mirror-repeat";
    
    this._sampler = this.device.createSampler({
      magFilter: this._filter,
      minFilter: this._filter,
      addressModeU: addressMode,
      addressModeV: addressMode,
    });
  }

  /**
   * Get the texture
   */
  get texture(): GPUTexture {
    return this._texture;
  }

  /**
   * Get the texture view
   */
  get view(): GPUTextureView {
    return this._view;
  }

  /**
   * Get the sampler
   */
  get sampler(): GPUSampler {
    return this._sampler;
  }

  /**
   * Get the width
   */
  get width(): number {
    return this._width;
  }

  /**
   * Get the height
   */
  get height(): number {
    return this._height;
  }

  /**
   * Get the format
   */
  get format(): TextureFormat {
    return this._format;
  }

  /**
   * Resize the render target
   */
  resize(width: number, height: number): void {
    if (width === this._width && height === this._height) {
      return;
    }

    // Destroy old texture
    this._texture.destroy();

    // Update size and recreate
    this._width = width;
    this._height = height;
    this.createTexture();
  }

  /**
   * Read pixels from the render target
   */
  async readPixels(
    x = 0,
    y = 0,
    width = this._width,
    height = this._height
  ): Promise<Uint8Array | Float32Array> {
    const bytesPerPixel = this._format === "rgba8unorm" ? 4 : 
                          this._format === "r16float" ? 2 :
                          this._format === "rg16float" ? 4 :
                          this._format === "rgba16float" ? 8 :
                          this._format === "r32float" ? 4 : 4;
    
    const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
    const bufferSize = bytesPerRow * height;

    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: this._texture, origin: { x, y, z: 0 } },
      { buffer, bytesPerRow },
      { width, height, depthOrArrayLayers: 1 }
    );
    this.device.queue.submit([encoder.finish()]);

    await buffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = buffer.getMappedRange();
    
    // Create appropriate typed array based on format
    const isFloat = this._format !== "rgba8unorm";
    const data = isFloat 
      ? new Float32Array(arrayBuffer.slice(0))
      : new Uint8Array(arrayBuffer.slice(0));
    
    buffer.unmap();
    buffer.destroy();

    return data;
  }

  /**
   * Dispose the render target
   */
  dispose(): void {
    this._texture.destroy();
  }
}
