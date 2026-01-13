import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GLContext } from '../src/context';

describe('GLContext', () => {
  describe('isSupported', () => {
    it('should return boolean for WebGL 2.0 support', () => {
      const result = GLContext.isSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('init', () => {
    let canvas: HTMLCanvasElement;
    let ctx: GLContext;

    beforeEach(() => {
      // Create a canvas element
      canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      Object.defineProperty(canvas, 'clientWidth', { value: 800 });
      Object.defineProperty(canvas, 'clientHeight', { value: 600 });
      document.body.appendChild(canvas);
      ctx = new GLContext();
    });

    afterEach(() => {
      ctx.destroy();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    });

    it('should initialize with a canvas element', () => {
      // In test environment, WebGL may not be available
      // So we test the error case
      try {
        ctx.init(canvas);
        expect(ctx.canvas).toBe(canvas);
        expect(ctx.gl).not.toBeNull();
      } catch (e) {
        expect((e as Error).message).toBe('WebGL 2.0 is not supported');
      }
    });

    it('should initialize with a canvas selector', () => {
      canvas.id = 'test-canvas';
      try {
        ctx.init('#test-canvas');
        expect(ctx.canvas).toBe(canvas);
      } catch (e) {
        expect((e as Error).message).toBe('WebGL 2.0 is not supported');
      }
    });

    it('should throw error for invalid selector', () => {
      expect(() => ctx.init('#nonexistent')).toThrow('Canvas element not found');
    });

    it('should return this for chaining', () => {
      try {
        const result = ctx.init(canvas);
        expect(result).toBe(ctx);
      } catch (e) {
        // WebGL not supported in test env
        expect((e as Error).message).toBe('WebGL 2.0 is not supported');
      }
    });
  });

  describe('resize', () => {
    it('should throw if not initialized', () => {
      const ctx = new GLContext();
      expect(() => ctx.resize(100, 100)).toThrow('GLContext not initialized');
    });
  });

  describe('clear', () => {
    it('should throw if not initialized', () => {
      const ctx = new GLContext();
      expect(() => ctx.clear()).toThrow('GLContext not initialized');
    });
  });

  describe('updateTime', () => {
    let canvas: HTMLCanvasElement;
    let ctx: GLContext;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { value: 800 });
      Object.defineProperty(canvas, 'clientHeight', { value: 600 });
      ctx = new GLContext();
    });

    afterEach(() => {
      ctx.destroy();
    });

    it('should update time values when context is available', () => {
      try {
        ctx.init(canvas);
        expect(ctx.time).toBe(0);
        expect(ctx.frame).toBe(0);
        
        ctx.updateTime();
        expect(ctx.time).toBeGreaterThanOrEqual(0);
        expect(ctx.frame).toBe(1);
        
        ctx.updateTime();
        expect(ctx.frame).toBe(2);
      } catch (e) {
        // WebGL not supported - that's ok for this test env
        expect((e as Error).message).toBe('WebGL 2.0 is not supported');
      }
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const ctx = new GLContext();
      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { value: 800 });
      Object.defineProperty(canvas, 'clientHeight', { value: 600 });

      try {
        ctx.init(canvas);
        ctx.destroy();
        
        expect(ctx.gl).toBeNull();
        expect(ctx.canvas).toBeNull();
        expect(ctx.width).toBe(0);
        expect(ctx.height).toBe(0);
      } catch (e) {
        // WebGL not supported - clean destroy should still work
        ctx.destroy();
        expect(ctx.gl).toBeNull();
        expect(ctx.canvas).toBeNull();
      }
    });
  });

  describe('getDevicePixelRatio', () => {
    it('should return dpr value', () => {
      const ctx = new GLContext();
      expect(ctx.getDevicePixelRatio()).toBe(1);
    });
  });
});
