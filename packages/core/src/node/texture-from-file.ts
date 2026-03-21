/**
 * Node.js helper — load an image file from disk and create a GPU {@link Texture}.
 *
 * Uses `sharp` for decoding. The import is dynamic so this module is
 * tree-shakeable and never pulls `sharp` into browser bundles.
 *
 * @example
 * ```ts
 * import { createTextureFromFile } from '@ralph-gpu/core';
 *
 * const tex = await createTextureFromFile(device, './sprites/hero.png');
 * ```
 *
 * @packageDocumentation
 */

import type { TextureOptions } from '../texture';
import { createTextureFromData } from '../texture';
import type { Texture } from '../texture';

/**
 * Load an image file and create a GPU {@link Texture} from it (Node.js only).
 *
 * @param device   - The GPUDevice to create the texture on.
 * @param filePath - Path to an image file (png, jpeg, webp, etc.).
 * @param opts     - Optional texture sampling / wrap options.
 * @returns A {@link Texture} backed by the decoded image data.
 *
 * @example
 * ```ts
 * const texture = await createTextureFromFile(device, 'assets/diffuse.png', {
 *   filter: 'linear',
 *   wrap: 'repeat',
 * });
 * ```
 */
export async function createTextureFromFile(
  device: GPUDevice,
  filePath: string,
  opts?: TextureOptions,
): Promise<Texture> {
  // Guard: Node.js only
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error(
      'createTextureFromFile() is only available in Node.js. ' +
      'In the browser, use ctx.texture(url) or createTextureFromURL() instead.',
    );
  }

  // Dynamically import sharp (never statically imported — keeps browser bundles clean)
  let sharp: any;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error(
      'createTextureFromFile() requires the "sharp" package. Install it with: npm install sharp',
    );
  }

  const image = sharp(filePath);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Decode to raw RGBA buffer
  const data: Uint8Array = await image.ensureAlpha().raw().toBuffer();

  return createTextureFromData(device, data, width, height, opts);
}
