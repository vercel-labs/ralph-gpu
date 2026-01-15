const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console logs
  let runLogged = false;
  page.on('console', msg => {
    if (msg.text().startsWith('Run! Code length:')) {
      runLogged = true;
      console.log('Detected console log:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/test-monaco');
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    
    // Focus the editor
    await page.click('.monaco-editor');
    
    // Press Cmd+Enter
    await page.keyboard.press('Control+Enter'); // Playwright uses Control for Cmd on Linux/Windows, but let's try both or use Meta
    await page.keyboard.press('Meta+Enter');
    
    // Wait a bit for the log
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (runLogged) {
      console.log('Shortcut verification SUCCESS');
    } else {
      console.error('Shortcut verification FAILED: "Run!" log not found');
      // Try clicking the button as a fallback to see if that works
      await page.click('button:has-text("Run")');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (runLogged) {
        console.log('Button click works, but shortcut failed');
      } else {
        console.error('Even button click failed to log');
      }
      process.exit(1);
    }
  } catch (e) {
    console.error('Verification failed:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
