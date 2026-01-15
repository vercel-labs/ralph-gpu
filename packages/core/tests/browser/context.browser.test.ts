import { test, expect } from '@playwright/test';

test.describe('GPUContext', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should initialize and report support', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { gpu } = (window as any).RalphGPU;
      const { context } = await setupTest(64, 64);
      await waitForFrame();
      const supported = gpu.isSupported();
      const size = [context.width, context.height];
      teardown();
      return { supported, size };
    });

    expect(result.supported).toBe(true);
    expect(result.size).toEqual([64, 64]);
  });
});
