import { test, expect } from '@playwright/test';

test.describe('Resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('context resize works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f { 
          return vec4f(1.0, 0.0, 0.0, 1.0); 
        }
      `);
      
      // Render at initial size
      pass.draw();
      await waitForFrame();
      const width1 = context.width;
      const height1 = context.height;
      
      // Resize context
      context.resize(64, 64);
      
      // Render at new size
      pass.draw();
      await waitForFrame();
      const width2 = context.width;
      const height2 = context.height;
      
      teardown();
      
      return {
        width1, height1,
        width2, height2,
        resizeWorked: width2 === 64 && height2 === 64
      };
    });

    expect(result.width1).toBe(32);
    expect(result.height1).toBe(32);
    expect(result.resizeWorked).toBe(true);
  });

  test('target resize works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create a target
      const target = context.target(16, 16);
      const width1 = target.width;
      const height1 = target.height;
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f { 
          return vec4f(0.0, 1.0, 0.0, 1.0); 
        }
      `);
      
      // Render to target at initial size
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      // Resize target
      target.resize(32, 32);
      const width2 = target.width;
      const height2 = target.height;
      
      // Render to target at new size
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      teardown();
      
      return {
        width1, height1,
        width2, height2,
        resizeWorked: width2 === 32 && height2 === 32
      };
    });

    expect(result.width1).toBe(16);
    expect(result.height1).toBe(16);
    expect(result.resizeWorked).toBe(true);
  });
});
