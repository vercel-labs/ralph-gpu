/**
 * Render target management
 */

import type { RenderTargetOptions, FilterMode, WrapMode, TextureFormat, RenderTargetUsage } from "./types";
import type { GPUContext } from "./context";
import { generateEventId } from "./events";
import type { MemoryEvent } from "./events";

/**
 * Convert a Float16 (half-precision) value to Float32
 * Float16: 1 sign bit, 5 exponent bits, 10 mantissa bits
 * Float32: 1 sign bit, 8 exponent bits, 23 mantissa bits
 */
function float16ToFloat32(h: number): number {
  const sign = (h & 0x8000) >> 15;
  const exponent = (h & 0x7c00) >> 10;
  const mantissa = h & 0x03ff;

  if (exponent === 0) {
    if (mantissa === 0) {
      // Zero
      return sign ? -0 : 0;
    }
    // Subnormal number
    const m = mantissa / 1024;
    const value = m * Math.pow(2, -14);
    return sign ? -value : value;
  } else if (exponent === 31) {
    // Infinity or NaN
    if (mantissa === 0) {
      return sign ? -Infinity : Infinity;
    }
    return NaN;
  }

  // Normal number
  const e = exponent - 15;
  const m = 1 + mantissa / 1024;
  const value = m * Math.pow(2, e);
  return sign ? -value : value;
}

/**
 * Convert a Uint16Array of float16 values to Float32Array
 */
function convertFloat16ArrayToFloat32(uint16Data: Uint16Array): Float32Array {
  const result = new Float32Array(uint16Data.length);
  for (let i = 0; i < uint16Data.length; i++) {
    result[i] = float16ToFloat32(uint16Data[i]);
  }
  return result;
}

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
 * Calculate texture size in bytes
 */
function calculateTextureSize(width: number, height: number, format: TextureFormat): number {
  const bytesPerPixel: Record<TextureFormat, number> = {
    "rgba8unorm": 4,
    "rgba16float": 8,
    "r16float": 2,
    "rg16float": 4,
    "r32float": 4,
  };
  return width * height * bytesPerPixel[format];
}

/**
 * Stable texture reference that survives resize operations.
 * The texture object reference remains the same while the underlying
 * GPU resource can be swapped out during resize.
 */
export class TextureReference {
  private _gpuTexture: GPUTexture;

  constructor(gpuTexture: GPUTexture) {
    this._gpuTexture = gpuTexture;
  }

  /**
   * Get the current GPU texture (for direct access)
   */
  get texture(): GPUTexture {
    return this._gpuTexture;
  }

  /**
   * Create a view of the current texture
   */
  createView(): GPUTextureView {
    return this._gpuTexture.createView();
  }

  /**
   * Update the internal GPU texture reference.
   * Called internally by RenderTarget during resize.
   * @internal
   */
  _updateTexture(newTexture: GPUTexture): void {
    this._gpuTexture = newTexture;
  }
}

/**
 * Render target class
 */
export class RenderTarget {
  private device: GPUDevice;
  private context?: GPUContext;
  private _gpuTexture!: GPUTexture;
  private _textureRef!: TextureReference;
  private _view!: GPUTextureView;
  private _sampler!: GPUSampler;
  private _width: number;
  private _height: number;
  private _format: TextureFormat;
  private _filter: FilterMode;
  private _wrap: WrapMode;
  private _usage: RenderTargetUsage;

  constructor(
    device: GPUDevice,
    width: number,
    height: number,
    options: RenderTargetOptions = {},
    context?: GPUContext
  ) {
    this.device = device;
    this.context = context;
    this._width = width;
    this._height = height;
    this._format = options.format || "rgba8unorm";
    this._filter = options.filter || "linear";
    this._wrap = options.wrap || "clamp";
    this._usage = options.usage || "render";

    // Create texture and view
    this.createTexture();
    this.createSampler();

    // Emit allocate event
    if (this.context) {
      const allocateEvent: MemoryEvent = {
        type: "memory",
        timestamp: performance.now(),
        id: generateEventId(),
        resourceType: "texture",
        size: calculateTextureSize(this._width, this._height, this._format),
        action: "allocate",
      };
      this.context.emitEvent(allocateEvent);
    }
  }

  private createTexture(): void {
    // Determine usage flags based on usage mode
    let usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    
    if (this._usage === "render" || this._usage === "both") {
      usage |= GPUTextureUsage.RENDER_ATTACHMENT;
    }
    
    if (this._usage === "storage" || this._usage === "both") {
      usage |= GPUTextureUsage.STORAGE_BINDING;
    }
    
    this._gpuTexture = this.device.createTexture({
      size: { width: this._width, height: this._height },
      format: getGPUTextureFormat(this._format),
      usage,
    });
    
    // Create view from the new texture
    this._view = this._gpuTexture.createView();
    
    // Create or update the stable texture reference
    if (!this._textureRef) {
      this._textureRef = new TextureReference(this._gpuTexture);
    } else {
      this._textureRef._updateTexture(this._gpuTexture);
    }
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
   * Get the stable texture reference.
   * This reference remains valid across resize operations.
   * Use this when passing textures to uniforms.
   */
  get texture(): TextureReference {
    return this._textureRef;
  }

  /**
   * Get the current GPU texture directly.
   * Note: This reference becomes invalid after resize.
   * Prefer using .texture for uniform bindings.
   */
  get gpuTexture(): GPUTexture {
    return this._gpuTexture;
  }

  /**
   * Get the texture view.
   * Returns cached view which is updated automatically during resize.
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
   * Get the usage mode
   */
  get usage(): RenderTargetUsage {
    return this._usage;
  }

  /**
   * Resize the render target.
   * The stable texture reference is automatically updated,
   * so uniform bindings remain valid.
   */
  resize(width: number, height: number): void {
    if (width === this._width && height === this._height) {
      return;
    }

    // Destroy old texture
    this._gpuTexture.destroy();

    // Update size and recreate
    this._width = width;
    this._height = height;
    this.createTexture();

    // Emit resize event
    if (this.context) {
      const resizeEvent: MemoryEvent = {
        type: "memory",
        timestamp: performance.now(),
        id: generateEventId(),
        resourceType: "texture",
        size: calculateTextureSize(this._width, this._height, this._format),
        action: "resize",
      };
      this.context.emitEvent(resizeEvent);
    }
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
    
    // Determine if this is a float16 format that needs conversion
    const isFloat16 = this._format === "r16float" || 
                      this._format === "rg16float" || 
                      this._format === "rgba16float";
    const isFloat32 = this._format === "r32float";
    
    const actualBytesPerRow = width * bytesPerPixel;
    const alignedBytesPerRow = Math.ceil(actualBytesPerRow / 256) * 256;
    const bufferSize = alignedBytesPerRow * height;

    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: this._gpuTexture, origin: { x, y, z: 0 } },
      { buffer, bytesPerRow: alignedBytesPerRow },
      { width, height, depthOrArrayLayers: 1 }
    );
    this.device.queue.submit([encoder.finish()]);

    await buffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = buffer.getMappedRange();
    
    // Strip out row padding if needed
    let packedData: Uint8Array;
    if (alignedBytesPerRow === actualBytesPerRow) {
      packedData = new Uint8Array(arrayBuffer.slice(0));
    } else {
      const paddedData = new Uint8Array(arrayBuffer);
      const packedSize = actualBytesPerRow * height;
      packedData = new Uint8Array(packedSize);
      
      for (let row = 0; row < height; row++) {
        const srcOffset = row * alignedBytesPerRow;
        const dstOffset = row * actualBytesPerRow;
        packedData.set(paddedData.subarray(srcOffset, srcOffset + actualBytesPerRow), dstOffset);
      }
    }
    
    buffer.unmap();
    buffer.destroy();

    // Convert to appropriate typed array based on format
    if (this._format === "rgba8unorm") {
      return packedData;
    }
    
    if (isFloat16) {
      // Float16 formats need conversion from half-precision to single-precision
      const uint16Data = new Uint16Array(packedData.buffer);
      return convertFloat16ArrayToFloat32(uint16Data);
    }
    
    if (isFloat32) {
      // Float32 formats can be directly interpreted
      return new Float32Array(packedData.buffer);
    }
    
    // Fallback (shouldn't reach here with current formats)
    return new Float32Array(packedData.buffer);
  }

  /**
   * Dispose the render target
   */
  dispose(): void {
    // Emit free event
    if (this.context) {
      const freeEvent: MemoryEvent = {
        type: "memory",
        timestamp: performance.now(),
        id: generateEventId(),
        resourceType: "texture",
        size: calculateTextureSize(this._width, this._height, this._format),
        action: "free",
      };
      this.context.emitEvent(freeEvent);
    }
    this._gpuTexture.destroy();
  }
}
