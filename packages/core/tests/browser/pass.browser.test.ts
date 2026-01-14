import { test, expect } from '@playwright/test';

test.describe('GPUPass', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/index.html');
  });

  test('should render a solid color', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      
      pass.draw();
      
      const data = await readPixels(0, 0, 1, 1);
      expectPixelNear(data, [255, 0, 0, 255], 3);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
