import { test, expect } from '@playwright/test';

test.describe('GPUStorage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should write/read data via storage buffer', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(8, 8);
      const target = context.target(8, 8);
      (window as any).__testTarget = target;
      
      const buffer = context.storage(16); // 4 floats = 16 bytes
      buffer.write(new Float32Array([0.25, 0.5, 0.75, 1.0]));
      
      const pass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var<storage, read> data: array<f32>;
        
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(data[0], data[1], data[2], data[3]);
        }
      `);
      
      pass.storage("data", buffer);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      
      // 0.25 * 255 = 63.75 -> 64
      // 0.5 * 255 = 127.5 -> 128
      // 0.75 * 255 = 191.25 -> 191
      // 1.0 * 255 = 255
      expectPixelNear(data, [64, 128, 191, 255], 2);
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
