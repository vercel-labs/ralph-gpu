import { chromium } from 'playwright';
import { getAllExamples } from '../lib/examples';
import * as fs from 'fs';
import * as path from 'path';

async function generatePreviews() {
  const examples = getAllExamples();
  const outputDir = path.join(__dirname, '../public/examples');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 800, height: 450 });

  for (const example of examples) {
    console.log(`Generating preview for: ${example.slug}`);
    
    try {
      await page.goto(`http://localhost:3001/examples/${example.slug}`, {
        waitUntil: 'networkidle'
      });
      
      // Wait for canvas to render
      await page.waitForTimeout(1000);
      
      // Take screenshot of the preview area
      const previewArea = await page.locator('.bg-black').first();
      if (await previewArea.isVisible()) {
        await previewArea.screenshot({
          path: path.join(outputDir, `${example.slug}.png`)
        });
      } else {
        // Fallback to full page
        await page.screenshot({
          path: path.join(outputDir, `${example.slug}.png`),
          clip: { x: 0, y: 200, width: 800, height: 400 }
        });
      }
    } catch (error) {
      console.error(`Failed to generate preview for ${example.slug}:`, error);
    }
  }

  await browser.close();
  console.log('Done generating previews!');
}

generatePreviews();
