import { describe, it, expect } from 'vitest';
import { saveImage } from '../../src/node/save-image';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync } from 'fs';

describe('saveImage integration', () => {
  it('should produce a valid gradient PNG', async () => {
    const W = 64, H = 64;
    const pixels = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        pixels[i + 0] = Math.floor((x / W) * 255);
        pixels[i + 1] = Math.floor((y / H) * 255);
        pixels[i + 2] = 128;
        pixels[i + 3] = 255;
      }
    }

    const outputPath = join(tmpdir(), `ralph-gpu-gradient-${Date.now()}.png`);
    await saveImage(pixels, W, H, outputPath);

    expect(existsSync(outputPath)).toBe(true);

    const fileBytes = readFileSync(outputPath);
    // Valid PNG magic bytes
    expect(fileBytes[0]).toBe(0x89);
    expect(fileBytes[1]).toBe(0x50); // 'P'
    expect(fileBytes[2]).toBe(0x4E); // 'N'
    expect(fileBytes[3]).toBe(0x47); // 'G'
    expect(fileBytes[4]).toBe(0x0D);
    expect(fileBytes[5]).toBe(0x0A);

    // File should be reasonably sized (at least 100 bytes, less than 100KB for 64x64)
    expect(fileBytes.length).toBeGreaterThan(100);
    expect(fileBytes.length).toBeLessThan(100_000);

    unlinkSync(outputPath);
  });

  it('should produce correct pixel colors when decoded', async () => {
    // Use sharp to decode the saved image and verify pixel values
    const W = 4, H = 4;
    // Solid red image
    const pixels = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      pixels[i * 4 + 0] = 255; // R
      pixels[i * 4 + 1] = 0;   // G
      pixels[i * 4 + 2] = 0;   // B
      pixels[i * 4 + 3] = 255; // A
    }

    const outputPath = join(tmpdir(), `ralph-gpu-red-${Date.now()}.png`);
    await saveImage(pixels, W, H, outputPath);

    // Decode back with sharp and verify
    const sharp = (await import('sharp')).default;
    const decoded = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });

    // First pixel should be red (255, 0, 0) — sharp decodes to RGB or RGBA
    expect(decoded.data[0]).toBe(255); // R
    expect(decoded.data[1]).toBe(0);   // G
    expect(decoded.data[2]).toBe(0);   // B

    unlinkSync(outputPath);
  });
});
