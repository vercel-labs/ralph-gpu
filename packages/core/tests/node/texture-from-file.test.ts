import { describe, it, expect } from 'vitest';
import { createTextureFromFile } from '../../src/node/texture-from-file';

describe('createTextureFromFile', () => {
  it('should be a function', () => {
    expect(typeof createTextureFromFile).toBe('function');
  });

  it('accepts 3 parameters (device, filePath, opts)', () => {
    // In compiled JS, optional params without defaults count towards .length
    expect(createTextureFromFile.length).toBe(3);
  });
});
