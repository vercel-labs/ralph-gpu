import { describe, it, expect } from 'vitest';
import type { RenderTargetOptions, RenderTargetUsage } from '../src/types';

describe('RenderTarget Usage', () => {
  describe('RenderTargetUsage type', () => {
    it('should accept "render" value', () => {
      const usage: RenderTargetUsage = 'render';
      expect(usage).toBe('render');
    });

    it('should accept "storage" value', () => {
      const usage: RenderTargetUsage = 'storage';
      expect(usage).toBe('storage');
    });

    it('should accept "both" value', () => {
      const usage: RenderTargetUsage = 'both';
      expect(usage).toBe('both');
    });
  });

  describe('RenderTargetOptions with usage', () => {
    it('should accept options with render usage', () => {
      const options: RenderTargetOptions = {
        format: 'rgba16float',
        usage: 'render',
      };

      expect(options.usage).toBe('render');
    });

    it('should accept options with storage usage', () => {
      const options: RenderTargetOptions = {
        format: 'rgba16float',
        usage: 'storage',
      };

      expect(options.usage).toBe('storage');
    });

    it('should accept options with both usage', () => {
      const options: RenderTargetOptions = {
        format: 'rgba16float',
        usage: 'both',
      };

      expect(options.usage).toBe('both');
    });

    it('should accept options without usage (default)', () => {
      const options: RenderTargetOptions = {
        format: 'rgba16float',
      };

      expect(options.usage).toBeUndefined();
    });
  });
});
