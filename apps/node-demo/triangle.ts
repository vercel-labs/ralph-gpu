/**
 * Headless RGB triangle demo
 *
 * Renders an RGB triangle using ralph-gpu in headless mode
 * and saves the result as a PNG to /tmp/ralph-triangle.png.
 *
 * Run:
 *   DISPLAY=:99 LIBGL_ALWAYS_SOFTWARE=1 XDG_RUNTIME_DIR=/tmp/xdg-runtime npx tsx triangle.ts
 */

// Must be first — registers navigator.gpu in Node.js
import 'webgpu';

import { gpu, saveImage } from 'ralph-gpu';

const WGSL = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f( 0.0,  0.7),   // top
    vec2f(-0.7, -0.7),   // bottom-left
    vec2f( 0.7, -0.7),   // bottom-right
  );

  var col = array<vec3f, 3>(
    vec3f(1.0, 0.0, 0.0), // red
    vec3f(0.0, 1.0, 0.0), // green
    vec3f(0.0, 0.0, 1.0), // blue
  );

  var out: VertexOutput;
  out.position = vec4f(pos[vi], 0.0, 1.0);
  out.color = col[vi];
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
`;

async function main() {
  console.log('Checking WebGPU support...');
  if (!gpu.isHeadlessSupported()) {
    throw new Error('WebGPU headless mode is not supported in this environment.');
  }
  console.log('✓ WebGPU headless supported');

  console.log('Initializing headless context (512×512)...');
  const ctx = await gpu.initHeadless(512, 512);
  console.log('✓ Headless context ready');

  console.log('Creating triangle material...');
  const triangle = ctx.material(WGSL, { vertexCount: 3 });
  console.log('✓ Material created');

  ctx.clearColor = [0.05, 0.05, 0.05, 1.0];

  console.log('Drawing triangle...');
  ctx.drawMaterial(triangle);
  console.log('✓ Draw complete');

  console.log('Reading pixels...');
  const pixels = await ctx.readPixels() as Uint8Array;
  console.log(`✓ Read ${pixels.length} bytes (${512}×${512}×4 RGBA)`);

  const outputPath = '/tmp/ralph-triangle.png';
  console.log(`Saving image to ${outputPath}...`);
  await saveImage(pixels, 512, 512, outputPath);
  console.log(`✓ Saved to ${outputPath}`);

  ctx.dispose();
  console.log('✓ Context disposed — done!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
