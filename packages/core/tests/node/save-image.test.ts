import { describe, it, expect } from 'vitest';
import { saveImage } from '../../src/node/save-image';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('saveImage', () => {
  it('should be a function', () => {
    expect(typeof saveImage).toBe('function');
  });

  it('saves a 2×2 red PNG and has correct magic bytes', async () => {
    // 2×2 solid red (RGBA)
    const pixels = new Uint8Array([
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ]);
    const out = join(tmpdir(), `ralph-test-red-${Date.now()}.png`);

    try {
      await saveImage(pixels, 2, 2, out);
      expect(existsSync(out)).toBe(true);

      const bytes = readFileSync(out);
      // PNG magic bytes: 0x89 P N G
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4e);
      expect(bytes[3]).toBe(0x47);
    } finally {
      if (existsSync(out)) unlinkSync(out);
    }
  });

  it('saves a 4×4 grey JPEG with quality option', async () => {
    // 4×4 mid-grey (RGBA)
    const pixels = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 128;
      pixels[i + 1] = 128;
      pixels[i + 2] = 128;
      pixels[i + 3] = 255;
    }
    const out = join(tmpdir(), `ralph-test-grey-${Date.now()}.jpg`);

    try {
      await saveImage(pixels, 4, 4, out, { format: 'jpeg', quality: 80 });
      expect(existsSync(out)).toBe(true);

      const bytes = readFileSync(out);
      // JPEG magic bytes: 0xFF 0xD8
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1]).toBe(0xd8);
    } finally {
      if (existsSync(out)) unlinkSync(out);
    }
  });

  it('infers PNG format from .png extension', async () => {
    const pixels = new Uint8Array(2 * 2 * 4).fill(255);
    const out = join(tmpdir(), `ralph-test-infer-${Date.now()}.png`);

    try {
      await saveImage(pixels, 2, 2, out);
      expect(existsSync(out)).toBe(true);
    } finally {
      if (existsSync(out)) unlinkSync(out);
    }
  });
});
