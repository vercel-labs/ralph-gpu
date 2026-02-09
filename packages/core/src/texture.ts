/**
 * Texture - Load external images, canvases, video, or raw pixel data as GPU textures.
 *
 * Exposes `.texture` (GPUTexture) and `.sampler` (GPUSampler) so the uniform
 * system treats it the same way as a RenderTarget — no special-casing needed.
 */

import type { FilterMode, WrapMode } from "./types";

/**
 * Options for creating a Texture.
 */
export interface TextureOptions {
  /** Filtering mode (default: "linear") */
  filter?: FilterMode;
  /** Wrapping / address mode (default: "clamp") */
  wrap?: WrapMode;
  /** Premultiply alpha when loading from URL/ImageBitmap (default: true) */
  premultiply?: boolean;
  /** Flip image vertically (default: false) */
  flipY?: boolean;
}

/**
 * Extra fields required when creating a Texture from raw pixel data.
 */
export interface RawTextureData {
  width: number;
  height: number;
}

/**
 * A loaded GPU texture with an associated sampler.
 *
 * Duck-types the same shape as RenderTarget (`{ texture, sampler }`) so it
 * integrates with both simple-mode and manual-mode uniforms automatically.
 */
export class Texture {
  private _gpuTexture: GPUTexture;
  private _sampler: GPUSampler;
  private _width: number;
  private _height: number;
  private device: GPUDevice;

  /** @internal — use `ctx.texture()` instead. */
  constructor(
    device: GPUDevice,
    gpuTexture: GPUTexture,
    sampler: GPUSampler,
    width: number,
    height: number,
  ) {
    this.device = device;
    this._gpuTexture = gpuTexture;
    this._sampler = sampler;
    this._width = width;
    this._height = height;
  }

  // ------------------------------------------------------------------
  // Public getters — satisfy the { texture, sampler } duck-type
  // ------------------------------------------------------------------

  /** The underlying GPUTexture (used by the uniform system). */
  get texture(): GPUTexture {
    return this._gpuTexture;
  }

  /** The GPUSampler derived from filter/wrap options. */
  get sampler(): GPUSampler {
    return this._sampler;
  }

  /** Texture width in pixels. */
  get width(): number {
    return this._width;
  }

  /** Texture height in pixels. */
  get height(): number {
    return this._height;
  }

  // ------------------------------------------------------------------
  // Mutation
  // ------------------------------------------------------------------

  /**
   * Re-upload pixel data from a new source (canvas, video frame, ImageBitmap).
   * Call this each frame for live video / canvas textures.
   */
  update(source: ImageBitmap | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas): void {
    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture: this._gpuTexture },
      [this._width, this._height],
    );
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  /** Destroy the underlying GPUTexture. */
  dispose(): void {
    this._gpuTexture.destroy();
  }
}

// ====================================================================
// Factory helpers (called by GPUContext.texture)
// ====================================================================

function createSampler(device: GPUDevice, opts: TextureOptions): GPUSampler {
  const filter = opts.filter ?? "linear";
  const wrap = opts.wrap ?? "clamp";
  const addressMode =
    wrap === "clamp"
      ? "clamp-to-edge"
      : wrap === "repeat"
        ? "repeat"
        : "mirror-repeat";

  return device.createSampler({
    magFilter: filter,
    minFilter: filter,
    addressModeU: addressMode,
    addressModeV: addressMode,
  });
}

function createGPUTexture(
  device: GPUDevice,
  width: number,
  height: number,
): GPUTexture {
  return device.createTexture({
    size: [width, height, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

/**
 * Load a texture from a URL (async).
 * @internal — called by GPUContext.texture()
 */
export async function createTextureFromURL(
  device: GPUDevice,
  url: string,
  opts: TextureOptions = {},
): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load texture from "${url}": ${response.status} ${response.statusText}`,
    );
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: "none",
    premultiplyAlpha: opts.premultiply !== false ? "premultiply" : "none",
    imageOrientation: opts.flipY ? "flipY" : "none",
  });

  const width = bitmap.width;
  const height = bitmap.height;
  const gpuTexture = createGPUTexture(device, width, height);
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: gpuTexture },
    [width, height],
  );
  bitmap.close();

  return new Texture(
    device,
    gpuTexture,
    createSampler(device, opts),
    width,
    height,
  );
}

/**
 * Create a texture from an HTMLCanvasElement, OffscreenCanvas,
 * HTMLVideoElement or ImageBitmap (sync — data already in memory).
 * @internal
 */
export function createTextureFromSource(
  device: GPUDevice,
  source: HTMLCanvasElement | OffscreenCanvas | HTMLVideoElement | ImageBitmap,
  opts: TextureOptions = {},
): Texture {
  let width: number;
  let height: number;

  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
    width = source.width;
    height = source.height;
  } else {
    // ImageBitmap
    width = source.width;
    height = source.height;
  }

  const gpuTexture = createGPUTexture(device, width, height);
  device.queue.copyExternalImageToTexture(
    { source },
    { texture: gpuTexture },
    [width, height],
  );

  return new Texture(device, gpuTexture, createSampler(device, opts), width, height);
}

/**
 * Create a texture from raw pixel data (Uint8Array for rgba8unorm).
 * @internal
 */
export function createTextureFromData(
  device: GPUDevice,
  data: Uint8Array | Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
  opts: TextureOptions = {},
): Texture {
  const gpuTexture = createGPUTexture(device, width, height);
  // Cast to satisfy strict ArrayBuffer vs ArrayBufferLike typing
  device.queue.writeTexture(
    { texture: gpuTexture },
    data.buffer as ArrayBuffer,
    { offset: data.byteOffset, bytesPerRow: width * 4, rowsPerImage: height },
    [width, height, 1],
  );

  return new Texture(device, gpuTexture, createSampler(device, opts), width, height);
}
