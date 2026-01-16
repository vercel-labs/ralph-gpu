import { chromium } from 'playwright';
import { getAllExamples } from '../lib/examples';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { PNG } from 'pngjs';
import sharp from 'sharp';

async function generatePreviews() {
  const examples = getAllExamples();
  const outputDir = path.join(__dirname, '../public/examples');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read template and ralph-gpu bundle
  const templatePath = path.join(__dirname, 'preview-template.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const ralphGpuPath = path.join(__dirname, '../public/ralph-gpu.mjs');
  const ralphGpu = fs.readFileSync(ralphGpuPath, 'utf-8');
  
  let currentHtml = '';
  
  // Simple HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === '/ralph-gpu.mjs') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(ralphGpu);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(currentHtml);
    }
  });
  
  await new Promise<void>((resolve) => {
    server.listen(9999, () => {
      console.log('Preview server running on http://localhost:9999');
      resolve();
    });
  });

  const browser = await chromium.launch({
    headless: false, // WebGPU canvas rendering requires headed mode
    args: [
      '--enable-unsafe-webgpu',
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 800, height: 450 },
  });
  const page = await context.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });
  

  for (const example of examples) {
    console.log(`Generating preview for: ${example.slug}`);
    
    try {
      // Get code for this example - all examples now have code property
      let code = example.code;
      
      if (!code && example.shader) {
        // Fallback for examples that only have shader (shouldn't happen anymore)
        console.warn(`Example ${example.slug} missing code, using shader fallback`);
        code = `
const ctx = await gpu.init(canvas, { dpr: 1, autoResize: true });
const pass = ctx.pass(\`${example.shader.replace(/`/g, '\\`')}\`${example.uniforms ? `, { uniforms: ${JSON.stringify(example.uniforms)} }` : ''});

function frame() {
  pass.draw();
  requestAnimationFrame(frame);
}
frame();
        `;
      }
      
      // Strip import statement
      code = code.replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*/g, '');
      
      // Inject code into template
      currentHtml = template.replace('// CODE_PLACEHOLDER', code);
      
      // Navigate to the server
      await page.goto('http://localhost:9999', {
        waitUntil: 'load',
        timeout: 60000
      });
      
      // Wait for rendering (longer for complex examples)
      const isComplex = example.slug === 'fluid' || example.slug === "triangle-particles";
      if(isComplex) {
        await page.waitForTimeout(3000)
      }
      await page.waitForTimeout(example.animated ? 500 : 200);
      
      // Screenshot the canvas
      const canvas = await page.$('canvas');
      if (!canvas) {
        console.error(`  ✗ No canvas found for ${example.slug}`);
        continue;
      }
      
      const pngPath = path.join(outputDir, `${example.slug}.png`);
      const webpPath = path.join(outputDir, `${example.slug}.webp`);
      const buffer = await canvas.screenshot({ path: pngPath });
      
      // Verify the screenshot has content
      const png = PNG.sync.read(buffer);
      let nonBlackPixels = 0;
      
      for (let i = 0; i < png.data.length; i += 4) {
        const r = png.data[i];
        const g = png.data[i + 1];
        const b = png.data[i + 2];
        
        if (r !== 0 || g !== 0 || b !== 0) {
          nonBlackPixels++;
        }
      }
      
      const percentNonBlack = (nonBlackPixels / (png.data.length / 4) * 100).toFixed(1);
      
      // Convert to WebP with good quality
      const webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
      
      fs.writeFileSync(webpPath, webpBuffer);
      
      // Get file sizes for comparison
      const pngSize = fs.statSync(pngPath).size;
      const webpSize = webpBuffer.length;
      const savings = ((1 - webpSize / pngSize) * 100).toFixed(0);
      
      console.log(`  ✓ ${example.slug} (${percentNonBlack}% non-black) - WebP: ${(webpSize / 1024).toFixed(0)}KB (${savings}% smaller)`);
    } catch (error) {
      console.error(`Failed to generate preview for ${example.slug}:`, error);
    }
  }

  await browser.close();
  server.close();
  console.log('Done generating previews!');
}

generatePreviews();
