import { test, expect } from '@playwright/test';

test.describe('Time Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('time increments between frames', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Execute a frame to initialize time
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      `);
      pass.draw();
      await waitForFrame();
      
      const time1 = context.globals.time;
      
      // Execute another frame
      pass.draw();
      await waitForFrame();
      
      const time2 = context.globals.time;
      
      teardown();
      
      return {
        time1,
        time2,
        increased: time2 > time1
      };
    });

    expect(result.increased).toBe(true);
  });

  test('paused stops time', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      `);
      
      // Run a frame to get initial time
      pass.draw();
      await waitForFrame();
      const time1 = context.globals.time;
      
      // Pause and run more frames
      context.paused = true;
      pass.draw();
      await waitForFrame();
      const time2 = context.globals.time;
      
      pass.draw();
      await waitForFrame();
      const time3 = context.globals.time;
      
      teardown();
      
      return {
        time1,
        time2,
        time3,
        stayedConstant: time2 === time1 && time3 === time1
      };
    });

    expect(result.stayedConstant).toBe(true);
  });

  test('frame counter increments', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      `);
      
      const frames: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        pass.draw();
        await waitForFrame();
        frames.push(context.globals.frame);
      }
      
      teardown();
      
      return {
        frames,
        increments: frames[1] === frames[0] + 1 && frames[2] === frames[1] + 1
      };
    });

    expect(result.increments).toBe(true);
  });
});
