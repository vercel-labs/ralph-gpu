import { test, expect } from '@playwright/test';

test.describe('Texture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should create texture from raw data and render it (manual uniforms)', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(2, 2);
      const outputTarget = context.target(2, 2);
      (window as any).__testTarget = outputTarget;

      // Create a 2x2 rgba8 texture: Red, Green, Blue, White
      const data = new Uint8Array([
        255, 0, 0, 255,     // (0,0) Red
        0, 255, 0, 255,     // (1,0) Green
        0, 0, 255, 255,     // (0,1) Blue
        255, 255, 255, 255,  // (1,1) White
      ]);

      const tex = context.texture(data, { width: 2, height: 2, filter: 'nearest' });

      const pass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uTexSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return textureSample(uTex, uTexSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: tex },
        }
      });

      context.setTarget(outputTarget);
      pass.draw();
      await waitForFrame();
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      const data = await outputTarget.readPixels(0, 0, 2, 2);

      // Top-left red
      expectPixelNear(data, [255, 0, 0, 255], 3, 0);
      // Top-right green
      expectPixelNear(data, [0, 255, 0, 255], 3, 1);
      // Bottom-left blue
      expectPixelNear(data, [0, 0, 255, 255], 3, 2);
      // Bottom-right white
      expectPixelNear(data, [255, 255, 255, 255], 3, 3);

      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should create texture from OffscreenCanvas (manual uniforms)', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);
      const outputTarget = context.target(4, 4);
      (window as any).__testTarget = outputTarget;

      // Create a solid red OffscreenCanvas
      const offscreen = new OffscreenCanvas(4, 4);
      const ctx2d = offscreen.getContext('2d')!;
      ctx2d.fillStyle = 'red';
      ctx2d.fillRect(0, 0, 4, 4);

      const tex = context.texture(offscreen, { filter: 'nearest' });

      const pass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uTexSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return textureSample(uTex, uTexSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: tex },
        }
      });

      context.setTarget(outputTarget);
      pass.draw();
      await waitForFrame();
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      const data = await outputTarget.readPixels(0, 0, 4, 4);

      // All pixels should be red
      expectPixelNear(data, [255, 0, 0, 255], 3, 0);
      expectPixelNear(data, [255, 0, 0, 255], 3, 5);
      expectPixelNear(data, [255, 0, 0, 255], 3, 15);

      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should update texture from OffscreenCanvas (manual uniforms)', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);
      const outputTarget = context.target(4, 4);
      (window as any).__testTarget = outputTarget;

      // Start with red canvas
      const offscreen = new OffscreenCanvas(4, 4);
      const ctx2d = offscreen.getContext('2d')!;
      ctx2d.fillStyle = 'red';
      ctx2d.fillRect(0, 0, 4, 4);

      const tex = context.texture(offscreen, { filter: 'nearest' });

      const pass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uTexSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return textureSample(uTex, uTexSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: tex },
        }
      });

      // Draw frame 1 (red)
      context.setTarget(outputTarget);
      pass.draw();
      await waitForFrame();

      const data1 = await outputTarget.readPixels(0, 0, 4, 4);
      (window as any).__data1 = Array.from(data1);

      // Update canvas to green and re-upload
      ctx2d.fillStyle = 'green';
      ctx2d.fillRect(0, 0, 4, 4);
      tex.update(offscreen);

      // Draw frame 2 (green)
      context.setTarget(outputTarget);
      pass.draw();
      await waitForFrame();
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      const data1 = new Uint8Array((window as any).__data1);
      const data2 = await outputTarget.readPixels(0, 0, 4, 4);

      // Frame 1 should have been red
      expectPixelNear(data1, [255, 0, 0, 255], 3, 0);

      // Frame 2 should be green (after update)
      expectPixelNear(data2, [0, 128, 0, 255], 5, 0);
      expectPixelNear(data2, [0, 128, 0, 255], 5, 15);

      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should respect sampler options (nearest + repeat)', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);
      const outputTarget = context.target(4, 4);
      (window as any).__testTarget = outputTarget;

      // 1x1 red texture
      const data = new Uint8Array([255, 0, 0, 255]);
      const tex = context.texture(data, {
        width: 1,
        height: 1,
        filter: 'nearest',
        wrap: 'repeat',
      });

      // Sample with UVs > 1.0 -- repeat should tile
      const pass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uTexSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution * 3.0; // UVs go 0..3
          return textureSample(uTex, uTexSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: tex },
        }
      });

      context.setTarget(outputTarget);
      pass.draw();
      await waitForFrame();
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      const data = await outputTarget.readPixels(0, 0, 4, 4);

      // With repeat + nearest on a 1x1 red texture, all pixels should be red
      expectPixelNear(data, [255, 0, 0, 255], 3, 0);
      expectPixelNear(data, [255, 0, 0, 255], 3, 7);
      expectPixelNear(data, [255, 0, 0, 255], 3, 15);

      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should expose width, height, texture, and sampler properties', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);

      const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
      const tex = context.texture(data, { width: 2, height: 2 });

      const checks = {
        width: tex.width === 2,
        height: tex.height === 2,
        hasTexture: tex.texture != null && typeof tex.texture === 'object',
        hasSampler: tex.sampler != null && typeof tex.sampler === 'object',
      };

      teardown();
      return checks;
    });

    expect(result.width).toBe(true);
    expect(result.height).toBe(true);
    expect(result.hasTexture).toBe(true);
    expect(result.hasSampler).toBe(true);
  });

  test('should dispose without error', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);

      const data = new Uint8Array([255, 0, 0, 255]);
      const tex = context.texture(data, { width: 1, height: 1 });

      tex.dispose();
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
