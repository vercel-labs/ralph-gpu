import { test, expect } from '@playwright/test';

test.describe('Canvas Alpha Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should initialize with default premultiplied alpha mode', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;

      // Default should be premultiplied
      const { context } = await setupTest(64, 64);
      await waitForFrame();

      // We can't directly read the alphaMode, but we can verify the context was created successfully
      const width = context.width;
      const height = context.height;

      teardown();
      return { width, height, success: true };
    });

    expect(result.success).toBe(true);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  test('should initialize with explicit premultiplied alpha mode', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;

      const { context } = await setupTest(64, 64, { alphaMode: 'premultiplied' });
      await waitForFrame();

      const width = context.width;
      const height = context.height;

      teardown();
      return { width, height, success: true };
    });

    expect(result.success).toBe(true);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  test('should initialize with opaque alpha mode', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;

      const { context } = await setupTest(64, 64, { alphaMode: 'opaque' });
      await waitForFrame();

      const width = context.width;
      const height = context.height;

      teardown();
      return { width, height, success: true };
    });

    expect(result.success).toBe(true);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  test('premultiplied alpha mode allows transparent rendering to screen', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown, readPixels } = (window as any).RalphTestUtils;

      // Set up with premultiplied alpha (default)
      const { context, canvas } = await setupTest(64, 64, { alphaMode: 'premultiplied' });

      // Set CSS background to gray (128, 128, 128)
      canvas.style.backgroundColor = 'rgb(128, 128, 128)';

      // Clear to transparent
      context.clearColor = [0, 0, 0, 0];
      context.setTarget(null);
      context.clear();
      await waitForFrame();

      // Draw semi-transparent red with premultiplied alpha
      const pass = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          let color = vec3f(1.0, 0.0, 0.0); // Red
          let alpha = 0.5;
          // Premultiply RGB by alpha
          return vec4f(color * alpha, alpha);
        }
      `, { blend: 'alpha' });

      context.setTarget(null);
      pass.draw();
      await waitForFrame();

      // Read pixels from the canvas
      const data = await readPixels(32, 32, 1, 1);

      teardown();
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // With premultiplied alpha, the shader output should have RGB premultiplied by alpha
    // Output: vec4f(0.5, 0.0, 0.0, 0.5) (red premultiplied by 0.5)
    // When read back, we should see approximately (128, 0, 0, 128)
    expect(result.r).toBeGreaterThan(100);
    expect(result.r).toBeLessThan(160);
    expect(result.g).toBeLessThan(10);
    expect(result.b).toBeLessThan(10);
    expect(result.a).toBeGreaterThan(100);
    expect(result.a).toBeLessThan(160);
  });

  test('premultiplied alpha requires RGB * alpha in shaders', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown, readPixels } = (window as any).RalphTestUtils;

      const { context } = await setupTest(64, 64, { alphaMode: 'premultiplied' });

      // Test with correctly premultiplied alpha
      context.clearColor = [0, 0, 0, 0];

      const passCorrect = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          let color = vec3f(1.0, 0.0, 0.0);
          let alpha = 0.5;
          return vec4f(color * alpha, alpha); // Correct: premultiplied
        }
      `, { blend: 'alpha' });

      context.setTarget(null);
      context.clear();
      passCorrect.draw();
      await waitForFrame();

      const correctData = await readPixels(32, 32, 1, 1);

      // Now test without premultiplication (incorrect for premultiplied mode)
      const passIncorrect = context.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          let color = vec3f(1.0, 0.0, 0.0);
          let alpha = 0.5;
          return vec4f(color, alpha); // Wrong: not premultiplied
        }
      `, { blend: 'alpha' });

      context.clear();
      passIncorrect.draw();
      await waitForFrame();

      const incorrectData = await readPixels(32, 32, 1, 1);

      teardown();

      return {
        correct: { r: correctData[0], g: correctData[1], b: correctData[2], a: correctData[3] },
        incorrect: { r: incorrectData[0], g: incorrectData[1], b: incorrectData[2], a: incorrectData[3] }
      };
    });

    // Correctly premultiplied should give ~(128, 0, 0, 128)
    expect(result.correct.r).toBeGreaterThan(100);
    expect(result.correct.r).toBeLessThan(160);

    // Incorrectly not premultiplied will give (255, 0, 0, 128) which looks wrong
    expect(result.incorrect.r).toBeGreaterThan(200);
    expect(result.incorrect.r).toBeLessThan(256);
  });

  test('clear with transparent color in premultiplied mode', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown, readPixels } = (window as any).RalphTestUtils;

      const { context } = await setupTest(64, 64, { alphaMode: 'premultiplied' });

      // Clear to fully transparent
      context.setTarget(null);
      context.clear(null, [0, 0, 0, 0]);
      await waitForFrame();

      const data = await readPixels(32, 32, 1, 1);

      teardown();
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Should be transparent black
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
    expect(result.a).toBe(0);
  });
});
