/**
 * Generate thumbnails for all examples using Playwright
 * 
 * Usage: npx tsx scripts/generate-thumbnails.ts
 * 
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - Playwright installed (npx playwright install chromium)
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Example slugs - must match the app routes
const EXAMPLE_SLUGS = [
  'basic',
  'uniforms',
  'geometry',
  'lines',
  'render-target',
  'ping-pong',
  'particles',
  'compute',
  'fluid',
  'raymarching',
  'metaballs',
  'morphing',
  'mandelbulb',
  'terrain',
  'alien-planet',
  'triangle-particles',
  'texture-sampling',
  'storage-texture',
];

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../public/thumbnails');
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;
const RENDER_WAIT_MS = 2500; // Wait for WebGPU to render

async function generateThumbnails() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Starting thumbnail generation...');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📷 Thumbnail size: ${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`);
  console.log(`🎨 Examples to capture: ${EXAMPLE_SLUGS.length}\n`);

  // Launch browser with WebGPU support
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--use-vulkan',
      '--disable-vulkan-fallback-to-gl-for-testing',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
  });

  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  for (const slug of EXAMPLE_SLUGS) {
    const url = `${BASE_URL}/${slug}`;
    const outputPath = path.join(OUTPUT_DIR, `${slug}.png`);

    try {
      console.log(`📸 Capturing ${slug}...`);
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for canvas to appear and WebGPU to render
      await page.waitForSelector('canvas', { timeout: 10000 });
      await page.waitForTimeout(RENDER_WAIT_MS);
      
      // Take screenshot of the canvas element
      const canvas = await page.$('canvas');
      if (canvas) {
        await canvas.screenshot({ path: outputPath });
        console.log(`   ✅ Saved: ${slug}.png`);
        successCount++;
      } else {
        console.log(`   ⚠️ No canvas found for ${slug}`);
        failCount++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${slug} - ${(error as Error).message}`);
      failCount++;
    }
  }

  await browser.close();

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Thumbnails saved to: ${OUTPUT_DIR}`);
}

// Run the script
generateThumbnails().catch(console.error);
