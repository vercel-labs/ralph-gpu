import { test, expect } from '@playwright/test';

test.describe('Clear Color', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('clear() with default color clears to black', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // First draw something (red)
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();

      // Clear with default color (should be black)
      context.clear(target);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Default clear is black (0, 0, 0, 1)
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
    expect(result.a).toBe(255);
  });

  test('clear() with custom color', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Clear to custom color (cyan: 0, 1, 1, 1)
      context.clear(target, [0, 1, 1, 1]);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Cyan (0, 255, 255, 255)
    expect(result.r).toBe(0);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
    expect(result.a).toBe(255);
  });

  test('clear() with partial alpha', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Clear to red with 50% alpha
      context.clear(target, [1, 0, 0, 0.5]);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Red with 50% alpha (255, 0, 0, ~127)
    expect(result.r).toBe(255);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
    expect(result.a).toBeGreaterThan(120);
    expect(result.a).toBeLessThan(135);
  });

  test('clear() on current target when no target specified', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Set target first
      context.setTarget(target);

      // Draw red
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      passRed.draw();
      await waitForFrame();

      // Clear without specifying target (should clear current target to green)
      context.clear(undefined, [0, 1, 0, 1]);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Should be green
    expect(result.r).toBe(0);
    expect(result.g).toBe(255);
    expect(result.b).toBe(0);
    expect(result.a).toBe(255);
  });

  test('clear() on MultiRenderTarget clears all targets', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);

      const mrt = context.mrt(
        {
          color: { format: 'rgba8unorm' },
          normal: { format: 'rgba8unorm' },
        },
        32,
        32
      );

      // Draw something to both targets
      const pass = context.pass(/* wgsl */ `
        struct Output {
          @location(0) color: vec4f,
          @location(1) normal: vec4f,
        }
        @fragment fn main() -> Output {
          var out: Output;
          out.color = vec4f(1.0, 0.0, 0.0, 1.0);
          out.normal = vec4f(0.0, 1.0, 0.0, 1.0);
          return out;
        }
      `);
      context.setTarget(mrt);
      pass.draw();
      await waitForFrame();

      // Clear MRT to blue
      context.clear(mrt, [0, 0, 1, 1]);
      await waitForFrame();

      const colorTarget = mrt.get('color')!;
      const normalTarget = mrt.get('normal')!;
      const colorData = await colorTarget.readPixels(0, 0, 1, 1);
      const normalData = await normalTarget.readPixels(0, 0, 1, 1);

      teardown();

      return {
        color: { r: colorData[0], g: colorData[1], b: colorData[2], a: colorData[3] },
        normal: { r: normalData[0], g: normalData[1], b: normalData[2], a: normalData[3] },
      };
    });

    // Both targets should be blue
    expect(result.color.r).toBe(0);
    expect(result.color.g).toBe(0);
    expect(result.color.b).toBe(255);
    expect(result.color.a).toBe(255);

    expect(result.normal.r).toBe(0);
    expect(result.normal.g).toBe(0);
    expect(result.normal.b).toBe(255);
    expect(result.normal.a).toBe(255);
  });

  test('autoClear = true clears target before draw', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Draw red
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();

      // autoClear should be true by default
      const autoClearValue = context.autoClear;

      // Draw green - with autoClear, red should be gone
      const passGreen = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passGreen.draw();
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return {
        autoClear: autoClearValue,
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3],
      };
    });

    // autoClear should be true by default
    expect(result.autoClear).toBe(true);
    // Should be green (red was cleared)
    expect(result.r).toBe(0);
    expect(result.g).toBe(255);
    expect(result.b).toBe(0);
  });

  test('autoClear = false preserves previous content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Draw solid red
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();

      // Disable autoClear
      context.autoClear = false;

      // Draw semi-transparent blue with alpha blend
      // If autoClear=false works, the red should still be there and blend with blue
      const passBlue = context.pass(
        /* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 0.0, 1.0, 0.5);
        }
      `,
        { blend: 'alpha' }
      );
      context.setTarget(target);
      passBlue.draw();
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Alpha blend: blue (0,0,1,0.5) over red (1,0,0,1) = (0.5, 0, 0.5, 1)
    // If autoClear was incorrectly true, result would be just blue over black
    expect(result.r).toBeGreaterThan(100); // Red component preserved from blending
    expect(result.r).toBeLessThan(160);
    expect(result.g).toBeLessThan(50);
    expect(result.b).toBeGreaterThan(100);
    expect(result.b).toBeLessThan(160);
  });

  test('clear() with float16 format', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32, { format: 'rgba16float' });

      // Clear to HDR value (values > 1.0)
      context.clear(target, [2.0, 0.5, 0.25, 1.0]);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Float format should preserve HDR values
    expect(result.r).toBeCloseTo(2.0, 1);
    expect(result.g).toBeCloseTo(0.5, 1);
    expect(result.b).toBeCloseTo(0.25, 1);
    expect(result.a).toBeCloseTo(1.0, 1);
  });

  test('clearColor getter returns default black', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);

      const clearColor = context.clearColor;
      teardown();

      return clearColor;
    });

    expect(result).toEqual([0, 0, 0, 1]);
  });

  test('clearColor setter changes clear color', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);

      // Set clear color to cyan
      context.clearColor = [0, 1, 1, 1];
      const clearColor = context.clearColor;
      
      teardown();
      return clearColor;
    });

    expect(result).toEqual([0, 1, 1, 1]);
  });

  test('autoClear uses clearColor', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Draw red first
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();

      // Set clear color to cyan
      context.clearColor = [0, 1, 1, 1];

      // Draw again with autoClear enabled (should clear to cyan, then draw green)
      const passGreen = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passGreen.draw();
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Should be green (not red), showing autoClear worked
    expect(result.r).toBe(0);
    expect(result.g).toBe(255);
    expect(result.b).toBe(0);
    expect(result.a).toBe(255);
  });

  test('clear() without color arg uses clearColor', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Draw red first
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();

      // Change clearColor to yellow
      context.clearColor = [1, 1, 0, 1];

      // Clear without specifying color (should use clearColor = yellow)
      context.clear(target);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Should be yellow from clearColor
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(0);
    expect(result.a).toBe(255);
  });

  test('clear() with explicit color overrides clearColor', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Set clearColor to red
      context.clearColor = [1, 0, 0, 1];

      // Clear with explicit blue color (should override clearColor)
      context.clear(target, [0, 0, 1, 1]);
      await waitForFrame();

      const data = await target.readPixels(0, 0, 1, 1);
      teardown();

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Should be blue (explicit color), not red (clearColor)
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(255);
    expect(result.a).toBe(255);
  });
});
