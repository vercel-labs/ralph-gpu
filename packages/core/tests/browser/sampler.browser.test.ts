import { test, expect } from '@playwright/test';

test.describe('Sampler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should sample texture with nearest filter', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(4, 4);
      const outputTarget = context.target(4, 4);
      (window as any).__testTarget = outputTarget;
      
      // 1. Create a 2x2 texture with 4 colors
      const texture = context.target(2, 2);
      
      // Fill texture with [Red, Green, Blue, White]
      const fillPass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let x = u32(pos.x);
          let y = u32(pos.y);
          if (x == 0u && y == 0u) { return vec4f(1.0, 0.0, 0.0, 1.0); }
          if (x == 1u && y == 0u) { return vec4f(0.0, 1.0, 0.0, 1.0); }
          if (x == 0u && y == 1u) { return vec4f(0.0, 0.0, 1.0, 1.0); }
          return vec4f(1.0, 1.0, 1.0, 1.0); // 1,1 is White
        }
      `);
      context.setTarget(texture);
      fillPass.draw();
      await waitForFrame();
      
      // 2. Create a sampler with nearest filtering
      const nearestSampler = context.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest'
      });
      
      // 3. Render the texture to a 4x4 canvas using the sampler
      const renderPass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uSampler: sampler;
        
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / vec2f(4.0, 4.0);
          return textureSample(uTex, uSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: texture },
          uSampler: { value: nearestSampler }
        }
      });
      
      context.setTarget(outputTarget); // Render to target (4x4)
      renderPass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      // 4. Verify pixels in the 4x4 target
      // With nearest filter, 2x2 regions should have the same color
      const data = await outputTarget.readPixels(0, 0, 4, 4);
      
      // Top-left 2x2 should be Red [255, 0, 0, 255]
      expectPixelNear(data, [255, 0, 0, 255], 3, 0); // (0,0)
      expectPixelNear(data, [255, 0, 0, 255], 3, 1); // (1,0)
      expectPixelNear(data, [255, 0, 0, 255], 3, 4); // (0,1)
      expectPixelNear(data, [255, 0, 0, 255], 3, 5); // (1,1)
      
      // Top-right 2x2 should be Green [0, 255, 0, 255]
      expectPixelNear(data, [0, 255, 0, 255], 3, 2); // (2,0)
      expectPixelNear(data, [0, 255, 0, 255], 3, 3); // (3,0)
      expectPixelNear(data, [0, 255, 0, 255], 3, 6); // (2,1)
      expectPixelNear(data, [0, 255, 0, 255], 3, 7); // (3,1)
      
      // Bottom-left 2x2 should be Blue [0, 0, 255, 255]
      expectPixelNear(data, [0, 0, 255, 255], 3, 8); // (0,2)
      
      // Bottom-right 2x2 should be White [255, 255, 255, 255]
      expectPixelNear(data, [255, 255, 255, 255], 3, 15); // (3,3)
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should sample texture with linear filter', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(2, 1);
      const outputTarget = context.target(2, 1);
      (window as any).__testTarget = outputTarget;
      
      // 1. Create a 2x1 texture: Left is Red, Right is Blue
      const texture = context.target(2, 1);
      const fillPass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          if (pos.x < 1.0) { return vec4f(1.0, 0.0, 0.0, 1.0); }
          return vec4f(0.0, 0.0, 1.0, 1.0);
        }
      `);
      context.setTarget(texture);
      fillPass.draw();
      await waitForFrame();
      
      // 2. Create a linear sampler
      const linearSampler = context.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
      });
      
      // 3. Render to a 3x1 target to see interpolation
      // We want to sample exactly in the middle between the two pixels
      const renderPass = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uTex: texture_2d<f32>;
        @group(1) @binding(1) var uSampler: sampler;
        
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Sample at 0.5 (center of the texture horizontally)
          // Texture width is 2 pixels. Centers are at 0.25 and 0.75 in UV.
          // Sampling at 0.5 should give 50% Red, 50% Blue.
          let uv = vec2f(0.5, 0.5);
          return textureSample(uTex, uSampler, uv);
        }
      `, {
        uniforms: {
          uTex: { value: texture },
          uSampler: { value: linearSampler }
        }
      });
      
      context.setTarget(outputTarget); // 2x1 target
      renderPass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      const data = await outputTarget.readPixels(0, 0, 2, 1);
      // Both pixels should be Purple [127, 0, 127, 255] (approx)
      expectPixelNear(data, [127, 0, 127, 255], 5, 0);
      expectPixelNear(data, [127, 0, 127, 255], 5, 1);
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
