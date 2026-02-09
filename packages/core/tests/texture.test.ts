import { describe, it, expect } from 'vitest';
import { Texture } from '../src/index';
import type { TextureOptions, RawTextureData } from '../src/index';

describe('Texture exports', () => {
  it('should export the Texture class', () => {
    expect(Texture).toBeDefined();
    expect(typeof Texture).toBe('function');
  });

  it('should satisfy TextureOptions type shape', () => {
    // Type-level check: verify the interface covers all expected fields.
    // If any field is missing from the type this file will fail to compile.
    const opts: TextureOptions = {
      filter: 'linear',
      wrap: 'repeat',
      premultiply: false,
      flipY: true,
    };
    expect(opts.filter).toBe('linear');
    expect(opts.wrap).toBe('repeat');
    expect(opts.premultiply).toBe(false);
    expect(opts.flipY).toBe(true);
  });

  it('should satisfy RawTextureData type shape', () => {
    const raw: RawTextureData = { width: 128, height: 64 };
    expect(raw.width).toBe(128);
    expect(raw.height).toBe(64);
  });

  it('TextureOptions fields should all be optional', () => {
    const empty: TextureOptions = {};
    expect(empty).toBeDefined();
  });
});
