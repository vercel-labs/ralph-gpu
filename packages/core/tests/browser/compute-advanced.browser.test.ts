import { test, expect } from '@playwright/test';

test.describe('GPUCompute Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should sample texture in compute shader using textureSampleLevel', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      
      // Create input texture with known color
      const inputTexture = context.target(4, 4);
      const fillPass = context.pass(/* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(0.5, 0.8, 0.2, 1.0); // Orange-ish color
        }
      `);
      context.setTarget(inputTexture);
      fillPass.draw();
      await waitForFrame();
      
      // Create sampler
      const sampler = context.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
      });
      
      // Create output texture to write the sampled color
      const outputTexture = context.target(1, 1, { usage: "storage" });
      (window as any).__testTarget = outputTexture;
      
      const compute = context.compute(/* wgsl */ `
        @group(1) @binding(0) var inputTex: texture_2d<f32>;
        @group(1) @binding(1) var inputSampler: sampler;
        @group(1) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;
        
        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) id: vec3u) {
          let color = textureSampleLevel(inputTex, inputSampler, vec2f(0.5, 0.5), 0.0);
          textureStore(outputTex, vec2u(0, 0), color);
        }
      `, {
        uniforms: {
          inputTex: { value: inputTexture },
          inputSampler: { value: sampler },
          outputTex: { value: outputTexture },
        }
      });
      
      compute.dispatch(1, 1);
      await waitForFrame();
      context.setTarget(outputTexture);
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTexture = (window as any).__testTarget;
      
      const data = await outputTexture.readPixels(0, 0, 1, 1);
      
      // Check that we sampled the orange-ish color (0.5, 0.8, 0.2, 1.0)
      // 0.5 * 255 = 127.5, 0.8 * 255 = 204, 0.2 * 255 = 51
      expectPixelNear(data, [128, 204, 51, 255], 3);
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should write to storage texture using textureStore', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      
      const storageTexture = context.target(8, 8, { usage: "storage" });
      (window as any).__testTarget = storageTexture;
      
      const compute = context.compute(/* wgsl */ `
        @group(1) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;
        
        @compute @workgroup_size(4, 4)
        fn main(@builtin(global_invocation_id) id: vec3u) {
          if (id.x >= 8u || id.y >= 8u) { return; }
          
          // Create a checkerboard pattern
          let isEven = (id.x + id.y) % 2u == 0u;
          let color = select(vec4f(1.0, 0.0, 0.0, 1.0), vec4f(0.0, 1.0, 0.0, 1.0), isEven);
          textureStore(outputTex, vec2u(id.xy), color);
        }
      `, { 
        uniforms: { 
          outputTex: { value: storageTexture } 
        } 
      });
      
      compute.dispatch(2, 2);
      await waitForFrame();
      context.setTarget(storageTexture);
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const storageTexture = (window as any).__testTarget;
      
      // Check checkerboard pattern
      const data = await storageTexture.readPixels(0, 0, 4, 4);
      
      // (0,0) even -> green, (1,0) odd -> red, (0,1) odd -> red, (1,1) even -> green
      expectPixelNear(data, [0, 255, 0, 255], 3, 0); // (0,0) green
      expectPixelNear(data, [255, 0, 0, 255], 3, 1); // (1,0) red
      expectPixelNear(data, [255, 0, 0, 255], 3, 4); // (0,1) red
      expectPixelNear(data, [0, 255, 0, 255], 3, 5); // (1,1) green
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('should use multiple storage buffers in compute shader', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      
      // Create multiple storage buffers
      const inputBuffer1 = context.storage(16); // 4 floats
      const inputBuffer2 = context.storage(16); // 4 floats  
      
      // Fill input buffers with test data
      inputBuffer1.write(new Float32Array([1.0, 2.0, 3.0, 4.0]));
      inputBuffer2.write(new Float32Array([10.0, 20.0, 30.0, 40.0]));
      
      // Create output target to display results
      const outputTarget = context.target(2, 2, { usage: "storage" });
      (window as any).__testTarget = outputTarget;
      
      const compute = context.compute(/* wgsl */ `
        @group(1) @binding(0) var<storage, read> input1: array<f32>;
        @group(1) @binding(1) var<storage, read> input2: array<f32>;
        @group(1) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;
        
        @compute @workgroup_size(2, 2)
        fn main(@builtin(global_invocation_id) id: vec3u) {
          if (id.x >= 2u || id.y >= 2u) { return; }
          
          let index = id.y * 2u + id.x;
          let sum = input1[index] + input2[index];
          
          // Normalize the result to [0,1] range for display
          // Expected sums: 11, 22, 33, 44 -> normalize by 44 to get 0.25, 0.5, 0.75, 1.0
          let normalized = sum / 44.0;
          textureStore(outputTex, vec2u(id.xy), vec4f(normalized, 0.0, 0.0, 1.0));
        }
      `, {
        uniforms: {
          outputTex: { value: outputTarget },
        }
      });
      
      compute.storage("input1", inputBuffer1);
      compute.storage("input2", inputBuffer2);
      
      compute.dispatch(1, 1);
      await waitForFrame();
      context.setTarget(outputTarget);
    });

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const outputTarget = (window as any).__testTarget;
      
      const data = await outputTarget.readPixels(0, 0, 2, 2);
      
      // Check expected results: [11, 22, 33, 44] normalized by 44
      // 11/44 = 0.25 -> 64, 22/44 = 0.5 -> 128, 33/44 = 0.75 -> 191, 44/44 = 1.0 -> 255
      expectPixelNear(data, [64, 0, 0, 255], 3, 0);   // (0,0) 11/44
      expectPixelNear(data, [128, 0, 0, 255], 3, 1);  // (1,0) 22/44
      expectPixelNear(data, [191, 0, 0, 255], 3, 2);  // (0,1) 33/44
      expectPixelNear(data, [255, 0, 0, 255], 3, 3);  // (1,1) 44/44
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});