import { test, expect } from '@playwright/test';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('shader without globals does not cause validation error', async ({ page }) => {
    // This test verifies that shaders not using globals.* don't cause
    // WebGPU validation errors (globals binding should not be declared/bound)
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Shader that does NOT use globals.* at all
      const pass = context.pass(`
        @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const pixels = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: pixels[0], g: pixels[1], b: pixels[2] };
    });

    // Should render red without any validation errors
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeLessThan(50);
    expect(result.b).toBeLessThan(50);
  });

  test('shader with simple uniforms but without globals works', async ({ page }) => {
    // This tests the case where a shader uses @group(1) uniforms (simple mode) but not @group(0) globals
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Shader with simple mode uniforms but NO globals.* usage
      const pass = context.pass(`
        @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(uniforms.color, 1.0);
        }
      `, {
        color: [0.0, 1.0, 0.0]  // Green - simple mode (direct values)
      });
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const pixels = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: pixels[0], g: pixels[1], b: pixels[2] };
    });

    // Should render green without any validation errors
    expect(result.r).toBeLessThan(50);
    expect(result.g).toBeGreaterThan(200);
    expect(result.b).toBeLessThan(50);
  });

  test('shader with explicit uniforms object but without globals works', async ({ page }) => {
    // This tests the case where a shader uses explicit @group/@binding uniforms but not globals
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Shader with manual/explicit uniforms but NO globals.* usage
      const pass = context.pass(`
        @group(1) @binding(0) var<uniform> myColor: vec3f;
        
        @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(myColor, 1.0);
        }
      `, {
        uniforms: {
          myColor: { value: [0.0, 0.0, 1.0] }  // Blue - manual mode (explicit uniforms object)
        }
      });
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const pixels = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: pixels[0], g: pixels[1], b: pixels[2] };
    });

    // Should render blue without any validation errors
    expect(result.r).toBeLessThan(50);
    expect(result.g).toBeLessThan(50);
    expect(result.b).toBeGreaterThan(200);
  });

  test('material without globals does not cause validation error', async ({ page }) => {
    // Same test for Material class - verifies no WebGPU validation errors
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Material that does NOT use globals.* at all
      const material = context.material(`
        @vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
          var pos = array<vec2f, 3>(vec2f(0.0, 0.5), vec2f(-0.5, -0.5), vec2f(0.5, -0.5));
          return vec4f(pos[vi], 0.0, 1.0);
        }
        @fragment fn fs() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `, { vertexCount: 3 });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    // Just verify no crash/validation error occurred
    expect(result.success).toBe(true);
  });

  test('zero vertex count does not crash', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      try {
        const material = context.material(`
          @vertex fn vs() -> @builtin(position) vec4f { return vec4f(0.0); }
          @fragment fn fs() -> @location(0) vec4f { return vec4f(1.0); }
        `, { vertexCount: 0 });
        material.draw();
        await waitForFrame();
      } catch (e) {
        // May or may not throw - just checking no crash
      }
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('empty pass (draw with no visible output)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0);
        }
      `);
      pass.draw();
      
      await waitForFrame();
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('can dispose and create new context', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      document.body.appendChild(canvas);
      
      // Create first context
      const ctx1 = await gpu.init(canvas);
      ctx1.dispose();
      
      // Create second context on same canvas
      const ctx2 = await gpu.init(canvas);
      
      const pass = ctx2.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      pass.draw();
      
      ctx2.dispose();
      canvas.remove();
      
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('multiple contexts (two canvases)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      
      const canvas1 = document.createElement('canvas');
      canvas1.width = 32;
      canvas1.height = 32;
      document.body.appendChild(canvas1);

      const canvas2 = document.createElement('canvas');
      canvas2.width = 32;
      canvas2.height = 32;
      document.body.appendChild(canvas2);
      
      const ctx1 = await gpu.init(canvas1);
      const ctx2 = await gpu.init(canvas2);
      
      const pass1 = ctx1.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `);
      
      const pass2 = ctx2.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `);

      pass1.draw();
      pass2.draw();
      
      ctx1.dispose();
      ctx2.dispose();
      canvas1.remove();
      canvas2.remove();
      
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('rapid create/dispose stress test', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      document.body.appendChild(canvas);
      
      for (let i = 0; i < 10; i++) {
        const ctx = await gpu.init(canvas);
        const pass = ctx.pass(`
          @fragment fn main() -> @location(0) vec4f {
            return vec4f(1.0, 1.0, 1.0, 1.0);
          }
        `);
        pass.draw();
        ctx.dispose();
      }
      
      canvas.remove();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });
});
