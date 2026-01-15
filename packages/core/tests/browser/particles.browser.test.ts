import { test, expect } from '@playwright/test';

test.describe('Particles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('should draw instanced particles', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(16, 16);
      const target = context.target(16, 16);
      (window as any).__testTarget = target;
      
      // Note: Particles class provides built-in quadOffset() and quadUV() functions
      // quadOffset returns -0.5 to 0.5, quadUV returns 0 to 1
      const particles = context.particles(1, {
        shader: /* wgsl */ `
          struct Particle { pos: vec2f, size: f32, hue: f32 }
          @group(1) @binding(0) var<storage, read> particles: array<Particle>;
          
          struct VertexOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
            @location(1) hue: f32
          }

          @vertex
          fn vs_main(@builtin(instance_index) iid: u32, @builtin(vertex_index) vid: u32) -> VertexOutput {
            let p = particles[iid];
            // quadOffset returns -0.5 to 0.5, so multiply by 2 to get -1 to 1
            let quadPos = quadOffset(vid) * 2.0 * p.size;
            var out: VertexOutput;
            out.position = vec4f(p.pos + quadPos, 0.0, 1.0);
            out.uv = quadUV(vid);
            out.hue = p.hue;
            return out;
          }

          @fragment
          fn fs_main(in: VertexOutput) -> @location(0) vec4f {
            return vec4f(1.0, 0.0, 0.0, 1.0);
          }
        `,
        bufferSize: 16, // Enough for 1 particle (4 floats = 16 bytes)
      });

      // Particle: pos=(0,0), size=1.0, hue=1.0
      particles.write(new Float32Array([0.0, 0.0, 1.0, 1.0]));
      
      context.setTarget(target);
      particles.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      // The particle is at center (0,0) in NDC, size 1.0 means it covers the whole screen since it goes from -1 to 1.
      // Wait, quadOffset returns -1 to 1, and p.size is 1.0, so it covers -1 to 1.
      // Our setupTest(16, 16) creates a 16x16 canvas.
      const data = await target.readPixels(8, 8, 1, 1);
      expectPixelNear(data, [255, 0, 0, 255], 3);
      
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
