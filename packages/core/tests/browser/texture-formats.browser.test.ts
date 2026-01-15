import { test, expect } from '@playwright/test';

test.describe('Texture Formats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('rgba16float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create HDR target
      const target = context.target(16, 16, { format: "rgba16float" });
      
      // Render HDR red (value > 1.0)
      const pass = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(2.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      // We can call readPixels, it won't crash for rgba16float as it's 8 bytes per pixel
      const data = await target.readPixels(0, 0, 1, 1);
      const isFloatArray = data instanceof Float32Array;
      
      teardown();
      return { format, isFloatArray };
    });

    expect(result.format).toBe("rgba16float");
    expect(result.isFloatArray).toBe(true);
  });

  test('r16float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create single channel float target
      const target = context.target(16, 16, { format: "r16float" });
      
      const pass = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.5, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      const data = await target.readPixels(0, 0, 1, 1);
      const value = data[0];
      const isFloatArray = data instanceof Float32Array;
      
      teardown();
      return { format, value, isFloatArray };
    });

    expect(result.format).toBe("r16float");
    expect(result.isFloatArray).toBe(true);
    expect(result.value).toBeCloseTo(0.5, 2);
  });

  test('rg16float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const target = context.target(16, 16, { format: "rg16float" });
      
      const pass = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.1, 0.2, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      // rg16float is 4 bytes per pixel, so readPixels(1x1) is fine
      const data = await target.readPixels(0, 0, 1, 1);
      const isFloatArray = data instanceof Float32Array;

      teardown();
      return { format, isFloatArray };
    });

    expect(result.format).toBe("rg16float");
    expect(result.isFloatArray).toBe(true);
  });

  test('r32float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const target = context.target(16, 16, { format: "r32float" });
      
      const pass = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(123.456, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      const data = await target.readPixels(0, 0, 1, 1);
      const value = data[0];

      teardown();
      return { format, value };
    });

    expect(result.format).toBe("r32float");
    expect(result.value).toBeCloseTo(123.456, 3);
  });
});
