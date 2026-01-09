import { describe, it, expect } from 'vitest';
import { gpu } from '../src/context';

describe('GPU Context', () => {
  describe('gpu.isSupported()', () => {
    it('should return boolean value', () => {
      const result = gpu.isSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should return false in Node.js environment', () => {
      // In Node.js, navigator.gpu won't exist
      expect(gpu.isSupported()).toBe(false);
    });
  });

  describe('gpu.init()', () => {
    it('should be a function', () => {
      expect(typeof gpu.init).toBe('function');
    });
  });
});