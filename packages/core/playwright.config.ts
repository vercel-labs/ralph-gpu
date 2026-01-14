import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WebGPU tests.
 * 
 * To run tests in headed mode:
 * npx playwright test --headed
 */
export default defineConfig({
  testDir: './tests/browser',
  // Only run files that end with .browser.test.ts
  testMatch: /.*\.browser\.test\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000, // 30 seconds for GPU tests
  use: {
    // Base URL should point to the browser test harness
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan',
          ],
        },
      },
    },
  ],
});
