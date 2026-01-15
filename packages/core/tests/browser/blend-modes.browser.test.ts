import { test, expect } from '@playwright/test';

test.describe('Blend Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('alpha blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Step 1: Draw solid red as base
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      // Step 2: CRITICAL - Disable autoClear so red isn't wiped
      context.autoClear = false;
      
      // Step 3: Draw semi-transparent blue with alpha blend
      const passBlue = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 0.0, 1.0, 0.5);
        }
      `, { blend: "alpha" });
      context.setTarget(target);
      passBlue.draw();
      await waitForFrame();
      
      // Step 4: Read and verify
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Alpha blend formula: result = src * srcAlpha + dst * (1 - srcAlpha)
    // Blue (0,0,1,0.5) over Red (1,0,0,1) = (0.5, 0, 0.5, 1) = ~(127, 0, 127, 255)
    expect(result.r).toBeGreaterThan(100);
    expect(result.r).toBeLessThan(160);
    expect(result.b).toBeGreaterThan(100);
    expect(result.b).toBeLessThan(160);
    expect(result.g).toBeLessThan(50);
  });

  test('additive blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Draw red base
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      // CRITICAL: Disable autoClear
      context.autoClear = false;
      
      // Add green
      const passGreen = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `, { blend: "additive" });
      context.setTarget(target);
      passGreen.draw();
      await waitForFrame();
      
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Additive: red + green = yellow
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeGreaterThan(200);
    expect(result.b).toBeLessThan(50);
  });

  test('multiply blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Draw white base
      const passWhite = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 1.0, 1.0, 1.0);
        }
      `);
      context.setTarget(target);
      passWhite.draw();
      await waitForFrame();
      
      // CRITICAL: Disable autoClear
      context.autoClear = false;
      
      // Multiply with red (should darken to red)
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `, { blend: "multiply" });
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Multiply: white * red = red
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeLessThan(50);
    expect(result.b).toBeLessThan(50);
  });

  test('screen blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Draw dark gray base
      const passDark = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.3, 0.3, 0.3, 1.0);
        }
      `);
      context.setTarget(target);
      passDark.draw();
      await waitForFrame();
      
      // CRITICAL: Disable autoClear
      context.autoClear = false;
      
      // Screen with red (should lighten)
      const passRed = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `, { blend: "screen" });
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Screen blend should lighten the result
    // Screen formula: 1 - (1-src) * (1-dst)
    expect(result.r).toBeGreaterThan(200); // Should be bright red
    expect(result.g).toBeGreaterThan(70);  // Should be lightened
    expect(result.b).toBeGreaterThan(70);  // Should be lightened
  });
});