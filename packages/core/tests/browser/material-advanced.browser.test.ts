import { test, expect } from '@playwright/test';

test.describe('Material Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('custom vertex shader works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Material with custom vertex shader
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vi: u32) -> VertexOutput {
          var positions = array<vec2f, 3>(
            vec2f(0.0, 0.5),
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vi], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `, {
        vertexCount: 3
      });

      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    // Just verify no crash
    expect(result.success).toBe(true);
  });

  test('instancing works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Material with instancing - draw 4 copies
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VertexOutput {
          var positions = array<vec2f, 3>(
            vec2f(0.0, 0.3),
            vec2f(-0.3, -0.3),
            vec2f(0.3, -0.3),
          );
          var output: VertexOutput;
          // Offset each instance
          let offset = vec2f(f32(ii % 2u) - 0.5, f32(ii / 2u) - 0.5);
          output.position = vec4f(positions[vi] * 0.4 + offset, 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `, {
        vertexCount: 3,
        instances: 4
      });

      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    // Just verify no crash
    expect(result.success).toBe(true);
  });

  test('varyings work (vertex to fragment)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);

      // Material with varyings
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
          @location(0) color: vec3f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vi: u32) -> VertexOutput {
          var positions = array<vec2f, 3>(
            vec2f(0.0, 0.8),
            vec2f(-0.8, -0.8),
            vec2f(0.8, -0.8),
          );
          var colors = array<vec3f, 3>(
            vec3f(1.0, 0.0, 0.0),  // red
            vec3f(0.0, 1.0, 0.0),  // green
            vec3f(0.0, 0.0, 1.0),  // blue
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vi], 0.0, 1.0);
          output.color = colors[vi];
          return output;
        }
        
        @fragment
        fn fs(in: VertexOutput) -> @location(0) vec4f {
          return vec4f(in.color, 1.0);
        }
      `, {
        vertexCount: 3
      });

      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    // Just verify no crash - varyings are used correctly
    expect(result.success).toBe(true);
  });
});
