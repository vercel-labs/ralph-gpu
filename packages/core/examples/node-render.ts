/**
 * Node.js headless rendering example
 *
 * Renders a UV-gradient shader to a PNG file using ralph-gpu in headless mode.
 *
 * Prerequisites:
 *   npm install ralph-gpu webgpu sharp
 *
 * Run:
 *   npx tsx packages/core/examples/node-render.ts
 */

// Bootstrap the webgpu package — registers navigator.gpu in Node.js
import 'webgpu';

import { gpu } from '../src/index';
import { saveImage } from '../src/node/save-image';
import { join } from 'path';

async function main() {
  if (!gpu.isHeadlessSupported()) {
    console.error('WebGPU not available in this environment. Install the webgpu package.');
    process.exit(1);
  }

  console.log('Initializing ralph-gpu in headless mode (512x512)...');
  const ctx = await gpu.initHeadless(512, 512);

  const pass = ctx.pass(`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / globals.resolution;
      return vec4f(uv.x, uv.y, 0.5 + 0.5 * sin(globals.time), 1.0);
    }
  `);

  console.log('Rendering frame...');
  ctx.drawPass(pass);

  const pixels = await ctx.readPixels() as Uint8Array;
  const outputPath = join(process.cwd(), 'output-render.png');
  await saveImage(pixels, 512, 512, outputPath);

  ctx.dispose();
  console.log(`Done! Rendered to: ${outputPath}`);
}

main().catch(console.error);
