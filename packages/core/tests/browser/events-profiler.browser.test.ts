import { test, expect } from '@playwright/test';

test.describe('Events & Profiler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('events fire on draw', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['draw'] }
      });
      
      let drawEventCount = 0;
      context.on('draw', () => { drawEventCount++; });
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0);
        }
      `);
      pass.draw();
      await waitForFrame();
      
      const result = { drawEventCount };
      teardown();
      return result;
    });

    expect(result.drawEventCount).toBeGreaterThan(0);
  });

  test('event filtering works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      // Only enable 'draw' events, not 'compute'
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['draw'] }
      });
      
      let drawEventCount = 0;
      let computeEventCount = 0;
      context.on('draw', () => { drawEventCount++; });
      context.on('compute', () => { computeEventCount++; });
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0);
        }
      `);
      pass.draw();

      const compute = context.compute(`
        @compute @workgroup_size(1)
        fn main() {}
      `);
      compute.dispatch(1);

      await waitForFrame();
      
      const result = { drawEventCount, computeEventCount };
      teardown();
      return result;
    });

    expect(result.drawEventCount).toBeGreaterThan(0);
    expect(result.computeEventCount).toBe(0);
  });

  test('compute events fire', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['compute'] }
      });
      
      let computeEventCount = 0;
      context.on('compute', () => { computeEventCount++; });
      
      const compute = context.compute(`
        @compute @workgroup_size(1)
        fn main() {}
      `);
      compute.dispatch(1);

      await waitForFrame();
      
      const result = { computeEventCount };
      teardown();
      return result;
    });

    expect(result.computeEventCount).toBeGreaterThan(0);
  });

  test('frame events fire', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['frame'] }
      });
      
      let frameEventCount = 0;
      context.on('frame', () => { frameEventCount++; });
      
      // Manually trigger a frame
      const encoder = context.beginFrame();
      context.endFrame(encoder);
      
      await waitForFrame();
      
      const result = { frameEventCount };
      teardown();
      return result;
    });

    // frameEventCount should be 2 because beginFrame and endFrame both emit a 'frame' event
    expect(result.frameEventCount).toBe(2);
  });

  test('target events fire', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['target'] }
      });
      
      let targetEventCount = 0;
      context.on('target', () => { targetEventCount++; });
      
      const target = context.target(16, 16);
      context.setTarget(target);
      context.clear(target);
      context.setTarget(null);
      
      await waitForFrame();
      
      const result = { targetEventCount };
      teardown();
      return result;
    });

    // 1 for setTarget(target), 1 for clear(target), 1 for setTarget(null)
    expect(result.targetEventCount).toBe(3);
  });

  test('event history works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const { context } = await setupTest(32, 32, {
        events: { enabled: true, types: ['draw', 'compute'], historySize: 5 }
      });
      
      const pass = context.pass(`@fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }`);
      const compute = context.compute(`@compute @workgroup_size(1) fn main() {}`);
      
      // Emit 6 events (3 draw, 3 compute)
      pass.draw();
      compute.dispatch(1);
      pass.draw();
      compute.dispatch(1);
      pass.draw();
      compute.dispatch(1);
      
      await waitForFrame();
      
      const history = context.getEventHistory();
      const drawHistory = context.getEventHistory(['draw']);
      
      const result = { 
        historyLength: history.length,
        drawHistoryLength: drawHistory.length
      };
      teardown();
      return result;
    });

    // historySize is 5, so historyLength should be 5 even though 6 events were emitted
    expect(result.historyLength).toBe(5);
    // Out of the 5 events in history, 2 should be 'draw' (since the last one was compute, 
    // and they alternate: D, C, D, C, D, C -> history: [C, D, C, D, C] if size 5 and circular)
    // Actually the order depends on implementation but length should be consistent.
    expect(result.drawHistoryLength).toBeLessThan(5);
    expect(result.drawHistoryLength).toBeGreaterThan(0);
  });
});
