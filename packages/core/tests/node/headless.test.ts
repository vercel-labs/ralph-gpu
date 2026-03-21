/**
 * Node.js headless mode tests — TDD red phase
 *
 * These tests define the API for gpu.initHeadless().
 * The "should be a function" tests FAIL now because the implementation doesn't exist yet.
 * The GPU-hardware tests are skipped until gpu.isHeadlessSupported() returns true.
 */

import { describe, it, expect } from 'vitest';
import { gpu } from '../../src/index';

// Helper to check headless support without crashing if the method doesn't exist yet.
// Returns false until Phase 2 implements gpu.isHeadlessSupported().
function isHeadlessSupported(): boolean {
  try {
    return typeof (gpu as any).isHeadlessSupported === 'function'
      ? (gpu as any).isHeadlessSupported()
      : false;
  } catch {
    return false;
  }
}

describe('gpu headless API (Node.js)', () => {
  // --- Always-running tests (TDD red failures) ---

  it('gpu.isHeadlessSupported should be a function', () => {
    // Fails now: expected 'undefined' to be 'function'
    expect(typeof (gpu as any).isHeadlessSupported).toBe('function');
  });

  it('gpu.initHeadless should be a function', () => {
    // Fails now: expected 'undefined' to be 'function'
    expect(typeof (gpu as any).initHeadless).toBe('function');
  });

  // --- GPU-hardware tests (skipped until headless support is available) ---

  it.skipIf(!isHeadlessSupported())(
    'initHeadless returns a context with correct width and height',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      expect(ctx.width).toBe(512);
      expect(ctx.height).toBe(512);
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'readPixels returns a Uint8Array of correct length (512 * 512 * 4)',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      const pixels = await ctx.readPixels();
      expect(pixels).toBeInstanceOf(Uint8Array);
      expect(pixels.length).toBe(512 * 512 * 4);
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'ctx.dispose does not throw',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      expect(() => ctx.dispose()).not.toThrow();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'ctx.pass creates a Pass',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      const pass = ctx.pass(`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      expect(pass).toBeDefined();
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'ctx.drawPass does not throw',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      const pass = ctx.pass(`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      expect(() => ctx.drawPass(pass)).not.toThrow();
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'after drawPass, readPixels returns non-zero pixels',
    async () => {
      const ctx = await (gpu as any).initHeadless(512, 512);
      const pass = ctx.pass(`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      ctx.drawPass(pass);
      const pixels = (await ctx.readPixels()) as Uint8Array;
      const hasNonZero = Array.from(pixels).some((v) => v > 0);
      expect(hasNonZero).toBe(true);
      ctx.dispose();
    }
  );
});
