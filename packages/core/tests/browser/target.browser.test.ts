import { test, expect } from '@playwright/test';

test.describe('GPURenderTarget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/index.html');
  });

  test('should render to a RenderTarget and validate readPixels', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      
      const target = context.target(16, 16);
      
      const pass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(0.0, 0.0, 1.0, 1.0);
        }
      `);
      
      context.setTarget(target);
      pass.draw();
      
      const data = await readPixels(0, 0, 1, 1);
      expectPixelNear(data, [0, 0, 255, 255], 3);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
