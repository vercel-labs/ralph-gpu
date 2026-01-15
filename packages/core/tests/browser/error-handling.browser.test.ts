import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('invalid WGSL does not crash (graceful handling)', async ({ page }) => {
    // Note: The library handles invalid WGSL gracefully.
    // WebGPU's getCompilationInfo() is async, so shader errors are logged
    // but don't propagate as exceptions. This test verifies the app doesn't crash.
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      let crashed = false;
      
      try {
        // Invalid WGSL - may produce errors in console but shouldn't crash
        const pass = context.pass(`
          @fragment
          fn main() {
            // missing return type and statement - invalid but parseable
          }
        `);
        pass.draw();
      } catch (error: any) {
        crashed = true;
      }
      
      teardown();
      
      return { crashed };
    });

    // The library should handle invalid WGSL gracefully without crashing
    expect(result.crashed).toBe(false);
  });

  test('valid WGSL does not throw', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      let errorThrown = false;
      
      try {
        // Valid WGSL
        const pass = context.pass(`
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            return vec4f(1.0, 0.0, 0.0, 1.0);
          }
        `);
        pass.draw();
      } catch (error) {
        errorThrown = true;
      }
      
      teardown();
      
      return { errorThrown };
    });

    expect(result.errorThrown).toBe(false);
  });
});
