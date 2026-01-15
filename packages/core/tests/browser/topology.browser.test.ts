import { test, expect } from '@playwright/test';

test.describe('Topology', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('line-list topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Material with line-list topology
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          // Two lines: horizontal and vertical
          var positions = array<vec2f, 4>(
            vec2f(-0.5, 0.0), vec2f(0.5, 0.0),   // horizontal line
            vec2f(0.0, -0.5), vec2f(0.0, 0.5),   // vertical line
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `, {
        vertexCount: 4,
        topology: "line-list"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('line-strip topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var positions = array<vec2f, 4>(
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
            vec2f(0.5, 0.5),
            vec2f(-0.5, 0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      `, {
        vertexCount: 4,
        topology: "line-strip"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('point-list topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var positions = array<vec2f, 4>(
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
            vec2f(0.5, 0.5),
            vec2f(-0.5, 0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(0.0, 0.0, 1.0, 1.0);
        }
      `, {
        vertexCount: 4,
        topology: "point-list"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('triangle-list topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var positions = array<vec2f, 3>(
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
            vec2f(0.0, 0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 1.0, 1.0);
        }
      `, {
        vertexCount: 3,
        topology: "triangle-list"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('triangle-strip topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      const material = context.material(/* wgsl */ `
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var positions = array<vec2f, 4>(
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
            vec2f(-0.5, 0.5),
            vec2f(0.5, 0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 1.0, 0.0, 1.0);
        }
      `, {
        vertexCount: 4,
        topology: "triangle-strip"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });
});
