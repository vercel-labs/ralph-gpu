import { describe, it, expect } from 'vitest';
import { gpu } from '../src/index';

describe('ralph-gpu', () => {
  it('should export gpu object', () => {
    expect(gpu).toBeDefined();
  });

  it('should have isSupported method', () => {
    expect(typeof gpu.isSupported).toBe('function');
  });

  it('should have init method', () => {
    expect(typeof gpu.init).toBe('function');
  });

  it('isSupported should return boolean', () => {
    const result = gpu.isSupported();
    expect(typeof result).toBe('boolean');
  });
});
