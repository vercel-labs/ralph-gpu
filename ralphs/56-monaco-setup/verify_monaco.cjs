const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/test-monaco');
    // Wait for Monaco to load
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    console.log('Monaco editor found!');
    await page.screenshot({ path: 'monaco-test-result.png' });
  } catch (e) {
    console.error('Error finding monaco editor:', e.message);
    const content = await page.content();
    console.log('Page content length:', content.length);
    await page.screenshot({ path: 'monaco-test-error.png' });
  } finally {
    await browser.close();
  }
})();
