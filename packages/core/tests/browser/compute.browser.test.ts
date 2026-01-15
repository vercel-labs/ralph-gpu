import { test, expect } from '@playwright/test';

test.describe('GPUCompute', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should run a compute shader and write to a texture', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      
      const target = context.target(16, 16, { usage: "storage" });
      (window as any).__testTarget = target;
      
      const compute = context.compute(/* wgsl */ `
        @group(1) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;
        
        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          if (id.x >= 16u || id.y >= 16u) { return; }
          textureStore(outputTex, vec2u(id.xy), vec4f(0.0, 1.0, 0.0, 1.0));
        }
      `, { 
        uniforms: { 
          outputTex: { value: target } 
        } 
      });
      
      compute.dispatch(2, 2);
      await waitForFrame();
      context.setTarget(target);
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      expectPixelNear(data, [0, 255, 0, 255], 3);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
