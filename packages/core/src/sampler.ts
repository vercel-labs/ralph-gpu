/**
 * Sampler - Texture sampling configuration wrapper
 * 
 * Wraps GPUSampler with explicit control over filtering and addressing modes.
 * Samplers can be reused across multiple shaders for consistency and performance.
 */

/**
 * Sampler descriptor options
 */
export interface SamplerDescriptor {
  /** Magnification filter (default: "linear") */
  magFilter?: "linear" | "nearest";
  /** Minification filter (default: "linear") */
  minFilter?: "linear" | "nearest";
  /** Mipmap filter (default: "linear") */
  mipmapFilter?: "linear" | "nearest";
  /** Address mode for U coordinate (default: "clamp-to-edge") */
  addressModeU?: "clamp-to-edge" | "repeat" | "mirror-repeat";
  /** Address mode for V coordinate (default: "clamp-to-edge") */
  addressModeV?: "clamp-to-edge" | "repeat" | "mirror-repeat";
  /** Address mode for W coordinate (default: "clamp-to-edge") */
  addressModeW?: "clamp-to-edge" | "repeat" | "mirror-repeat";
  /** Minimum LOD clamp (default: 0) */
  lodMinClamp?: number;
  /** Maximum LOD clamp (default: 32) */
  lodMaxClamp?: number;
  /** Comparison function for depth textures */
  compare?: "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";
  /** Maximum anisotropy (default: 1) */
  maxAnisotropy?: number;
}

/**
 * Sampler class - wraps GPUSampler
 */
export class Sampler {
  private _gpuSampler: GPUSampler;
  private _descriptor: SamplerDescriptor;

  constructor(device: GPUDevice, descriptor: SamplerDescriptor = {}) {
    this._descriptor = descriptor;

    // Create GPUSampler with defaults
    this._gpuSampler = device.createSampler({
      magFilter: descriptor.magFilter || "linear",
      minFilter: descriptor.minFilter || "linear",
      mipmapFilter: descriptor.mipmapFilter || "linear",
      addressModeU: descriptor.addressModeU || "clamp-to-edge",
      addressModeV: descriptor.addressModeV || "clamp-to-edge",
      addressModeW: descriptor.addressModeW || "clamp-to-edge",
      lodMinClamp: descriptor.lodMinClamp ?? 0,
      lodMaxClamp: descriptor.lodMaxClamp ?? 32,
      compare: descriptor.compare,
      maxAnisotropy: descriptor.maxAnisotropy ?? 1,
    });
  }

  /**
   * Get the underlying GPUSampler
   */
  get gpuSampler(): GPUSampler {
    return this._gpuSampler;
  }

  /**
   * Get the sampler descriptor
   */
  get descriptor(): Readonly<SamplerDescriptor> {
    return this._descriptor;
  }

  /**
   * Dispose the sampler (currently a no-op as WebGPU samplers don't need explicit cleanup)
   * Kept for API consistency and future-proofing
   */
  dispose(): void {
    // GPUSampler doesn't have a destroy() method
    // This is here for API consistency and future WebGPU spec changes
  }
}
