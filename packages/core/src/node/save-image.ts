/**
 * Node.js helper — save raw RGBA pixel data to an image file.
 *
 * Uses `sharp` for encoding. The import is dynamic so this module is
 * tree-shakeable and never pulls `sharp` into browser bundles.
 *
 * @example
 * ```ts
 * import { saveImage } from '@ralph-gpu/core';
 *
 * const pixels = new Uint8Array(width * height * 4);
 * // … fill pixels from GPU readback …
 * await saveImage(pixels, width, height, 'output.png');
 * ```
 *
 * @packageDocumentation
 */

/**
 * Options for {@link saveImage}.
 */
export interface SaveImageOptions {
  /** Output format. Inferred from file extension when omitted. */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality for lossy formats (jpeg / webp). 1–100. */
  quality?: number;
}

/**
 * Save raw RGBA pixels to an image file (Node.js only).
 *
 * @param pixels   - Raw RGBA pixel data (4 bytes per pixel).
 * @param width    - Image width in pixels.
 * @param height   - Image height in pixels.
 * @param outputPath - Destination file path.
 * @param options  - Optional format / quality overrides.
 *
 * @example
 * ```ts
 * await saveImage(pixels, 128, 128, 'screenshot.png');
 * await saveImage(pixels, 128, 128, 'photo.jpg', { format: 'jpeg', quality: 90 });
 * ```
 */
export async function saveImage(
  pixels: Uint8Array,
  width: number,
  height: number,
  outputPath: string,
  options: SaveImageOptions = {},
): Promise<void> {
  // Guard: Node.js only
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error(
      'saveImage() is only available in Node.js. ' +
      'In the browser, use canvas.toBlob() or similar APIs instead.',
    );
  }

  // Dynamically import sharp (never statically imported — keeps browser bundles clean)
  let sharp: any;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error(
      'saveImage() requires the "sharp" package. Install it with: npm install sharp',
    );
  }

  // Determine output format
  const format = options.format ?? inferFormat(outputPath);

  const image = sharp(
    Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength),
    { raw: { width, height, channels: 4 } },
  );

  switch (format) {
    case 'jpeg':
      await image.jpeg({ quality: options.quality }).toFile(outputPath);
      break;
    case 'webp':
      await image.webp({ quality: options.quality }).toFile(outputPath);
      break;
    case 'png':
    default:
      await image.png().toFile(outputPath);
      break;
  }
}

/** Infer image format from a file extension. Defaults to `'png'`. */
function inferFormat(path: string): 'png' | 'jpeg' | 'webp' {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'webp':
      return 'webp';
    default:
      return 'png';
  }
}
