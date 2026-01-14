import { test, expect } from '@playwright/test';

test.describe('Uniforms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('simple mode f32 uniform', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      
      // Shader uses uniforms.redValue - simple mode (pass values directly, not wrapped)
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(uniforms.redValue, 0.0, 0.0, 1.0);
        }
      `, {
        redValue: 0.75
      });
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      // 0.75 * 255 ≈ 191
      expectPixelNear(data, [191, 0, 0, 255], 5);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('simple mode vec4f uniform', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      
      // Simple mode: pass color value directly
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return uniforms.color;
        }
      `, {
        color: [0.0, 1.0, 0.0, 1.0]
      });
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      expectPixelNear(data, [0, 255, 0, 255], 5);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('uniform value can be updated', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      (window as any).__testContext = context;
      
      // Simple mode: pass intensity value directly
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(uniforms.intensity, 0.0, 0.0, 1.0);
        }
      `, {
        intensity: 0.5
      });
      
      (window as any).__testPass = pass;
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    // First check - should be ~127 (0.5 * 255)
    const firstValue = await page.evaluate(async () => {
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      return data[0];
    });
    expect(firstValue).toBeGreaterThan(120);
    expect(firstValue).toBeLessThan(135);

    // Update uniform and redraw (use pass.set() for simple mode)
    await page.evaluate(async () => {
      const { waitForFrame } = (window as any).RalphTestUtils;
      const pass = (window as any).__testPass;
      const target = (window as any).__testTarget;
      const context = (window as any).__testContext;
      
      pass.set('intensity', 1.0);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    // Second check - should be ~255 (1.0 * 255)
    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      expectPixelNear(data, [255, 0, 0, 255], 5);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
