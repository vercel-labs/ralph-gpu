import { test, expect } from '@playwright/test';

test.describe('GPUPass', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should render a solid color', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      expectPixelNear(data, [255, 0, 0, 255], 3);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
