import { describe, it, expect } from 'vitest';
import { gpu, RenderTarget } from '../../src/index';

// Helper to check headless support — guards against missing Dawn binaries.
// gpu.isHeadlessSupported doesn't exist yet, so this always returns false currently.
function isHeadlessSupported(): boolean {
  try {
    return typeof (gpu as any).isHeadlessSupported === 'function'
      ? (gpu as any).isHeadlessSupported()
      : false;
  } catch {
    return false;
  }
}

describe('gpu headless render targets (Node.js)', () => {
  // --- Always-running test (TDD red failure) ---

  it('gpu.isHeadlessSupported should be a function', () => {
    expect(typeof (gpu as any).isHeadlessSupported).toBe('function');
  });

  // --- Skip-guarded tests (need actual headless GPU) ---

  it.skipIf(!isHeadlessSupported())(
    'initHeadless creates context with correct dimensions',
    async () => {
      const ctx = await (gpu as any).initHeadless(256, 256);
      expect(ctx.width).toBe(256);
      expect(ctx.height).toBe(256);
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'ctx.target creates a RenderTarget',
    async () => {
      const ctx = await (gpu as any).initHeadless(256, 256);
      const target = ctx.target(128, 128);
      expect(target).toBeInstanceOf(RenderTarget);
      target.dispose();
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'can render a pass to a render target',
    async () => {
      const ctx = await (gpu as any).initHeadless(256, 256);
      const target = ctx.target(128, 128);

      const pass = ctx.pass(
        '@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f { return vec4f(1,0,0,1); }'
      );

      ctx.setTarget(target);
      ctx.drawPass(pass);
      ctx.setTarget(null);

      // Verify target has rendered data
      const pixels = await target.readPixels();
      expect(pixels).toBeInstanceOf(Uint8Array);
      expect(pixels.length).toBe(128 * 128 * 4);

      target.dispose();
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'target.readPixels returns data of correct size',
    async () => {
      const ctx = await (gpu as any).initHeadless(256, 256);
      const target = ctx.target(128, 128);
      const pixels = await target.readPixels();
      expect(pixels).toBeInstanceOf(Uint8Array);
      expect(pixels.length).toBe(128 * 128 * 4);
      target.dispose();
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'after setTarget(null), ctx.readPixels returns main context size',
    async () => {
      const ctx = await (gpu as any).initHeadless(256, 256);
      const target = ctx.target(128, 128);

      ctx.setTarget(target);
      ctx.setTarget(null);

      const pixels = await ctx.readPixels();
      expect(pixels).toBeInstanceOf(Uint8Array);
      expect(pixels.length).toBe(256 * 256 * 4);
      target.dispose();
      ctx.dispose();
    }
  );
});
