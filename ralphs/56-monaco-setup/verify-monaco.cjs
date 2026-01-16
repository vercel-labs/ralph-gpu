const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/test-monaco');
  try {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    console.log('SUCCESS: Monaco editor found');
  } catch (e) {
    console.log('FAILURE: Monaco editor NOT found');
    const content = await page.content();
    console.log('Page content length:', content.length);
  }
  await browser.close();
})();
