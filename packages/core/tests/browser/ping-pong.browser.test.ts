import { test, expect } from '@playwright/test';

test.describe('PingPong', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should swap read and write targets', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pingPong = context.pingPong(32, 32);
      (window as any).__pingPong = pingPong;
      
      // 1. Fill write with Red
      const pass1 = context.pass(/* wgsl */ `
        @fragment
        fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      
      context.setTarget(pingPong.write);
      pass1.draw();
      await waitForFrame();
      
      // 2. Swap
      pingPong.swap();
      
      // 3. Fill write with Blue, using read (Red) as input
      const pass2 = context.pass(/* wgsl */ `
        @group(1) @binding(0) var uRead: texture_2d<f32>;
        @group(1) @binding(1) var uSampler: sampler;
        
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let readColor = textureLoad(uRead, vec2i(pos.xy), 0);
          return readColor + vec4f(0.0, 0.0, 1.0, 0.0);
        }
      `, {
        uniforms: {
          uRead: { value: pingPong.read },
          uSampler: { value: context.createSampler() }
        }
      });
      
      context.setTarget(pingPong.write);
      pass2.draw();
      await waitForFrame();
      
      // 4. Swap
      pingPong.swap();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const pingPong = (window as any).__pingPong;
      if (!pingPong) throw new Error('pingPong missing');
      // Verify read is Purple (Red + Blue)
      const data2 = await pingPong.read.readPixels(0, 0, 1, 1);
      expectPixelNear(data2, [255, 0, 255, 255], 3);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
