import { gpu, GPUContext, GPUContextOptions } from '../../src';

let currentContext: GPUContext | null = null;
let currentCanvas: HTMLCanvasElement | null = null;

/**
 * Setup a WebGPU test environment
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @param options GPU context options
 */
export async function setupTest(
  width = 100, 
  height = 100, 
  options: GPUContextOptions = {}
): Promise<{ context: GPUContext; canvas: HTMLCanvasElement }> {
  // Clean up any existing test environment
  teardown();

  currentCanvas = document.createElement('canvas');
  currentCanvas.width = width;
  currentCanvas.height = height;
  currentCanvas.style.width = `${width}px`;
  currentCanvas.style.height = `${height}px`;
  document.body.appendChild(currentCanvas);

  currentContext = await gpu.init(currentCanvas, options);
  return { context: currentContext, canvas: currentCanvas };
}

/**
 * Read pixels from the current context and return a clean Uint8Array without padding.
 * Assumes the target is rgba8unorm.
 * 
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Width of the region to read
 * @param height Height of the region to read
 */
export async function readPixels(x = 0, y = 0, width = 1, height = 1): Promise<Uint8Array> {
  if (!currentContext) {
    throw new Error('Test not set up. Call setupTest() first.');
  }
  
  const pixelsWithPadding = await currentContext.readPixels(x, y, width, height);
  
  if (!(pixelsWithPadding instanceof Uint8Array)) {
    throw new Error('readPixels returned non-Uint8Array. Only rgba8unorm is supported in this helper.');
  }

  // Handle WebGPU's 256-byte alignment requirement for buffer-to-texture copies
  const bytesPerPixel = 4;
  const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256;
  
  if (bytesPerRow === width * bytesPerPixel) {
    return pixelsWithPadding;
  }
  
  const cleanPixels = new Uint8Array(width * height * bytesPerPixel);
  for (let row = 0; row < height; row++) {
    const srcOffset = row * bytesPerRow;
    const dstOffset = row * width * bytesPerPixel;
    cleanPixels.set(
      pixelsWithPadding.subarray(srcOffset, srcOffset + width * bytesPerPixel),
      dstOffset
    );
  }
  
  return cleanPixels;
}

/**
 * Cleanup the test environment
 */
export function teardown(): void {
  if (currentContext) {
    currentContext.dispose();
    currentContext = null;
  }
  if (currentCanvas) {
    currentCanvas.remove();
    currentCanvas = null;
  }
}

/**
 * Check if a pixel color is near an expected color
 */
export function isColorNear(
  actual: Uint8Array | number[] | Uint8ClampedArray,
  expected: number[],
  tolerance = 1
): boolean {
  for (let i = 0; i < expected.length; i++) {
    if (Math.abs(actual[i] - expected[i]) > tolerance) {
      return false;
    }
  }
  return true;
}

/**
 * Helper to expect a pixel color to be near an expected color.
 * pixelIndex is the nth pixel in the flattened array.
 */
export function expectPixelNear(
  actual: Uint8Array,
  expected: number[],
  tolerance = 1,
  pixelIndex = 0
): void {
  const start = pixelIndex * 4;
  if (start + 4 > actual.length) {
    throw new Error(`Pixel index ${pixelIndex} out of bounds (length ${actual.length})`);
  }
  
  for (let i = 0; i < 4; i++) {
    const a = actual[start + i];
    const e = expected[i];
    if (Math.abs(a - e) > tolerance) {
      const actualColor = Array.from(actual.subarray(start, start + 4));
      throw new Error(
        `Pixel at index ${pixelIndex} component ${i} expected ${e} to be near ${a} (tolerance ${tolerance}). ` +
        `Actual pixel: [${actualColor.join(', ')}], Expected: [${expected.join(', ')}]`
      );
    }
  }
}
