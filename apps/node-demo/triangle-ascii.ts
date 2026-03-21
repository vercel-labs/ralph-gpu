/**
 * ASCII-art RGB triangle demo
 *
 * Renders an RGB triangle headlessly at 256×256 and outputs
 * colored ASCII art to the terminal using ANSI true-color escape codes
 * and Unicode half-block characters.
 *
 * Run:
 *   DISPLAY=:99 LIBGL_ALWAYS_SOFTWARE=1 XDG_RUNTIME_DIR=/tmp/xdg-runtime npx tsx triangle-ascii.ts
 */

// Must be first — registers navigator.gpu in Node.js
import 'webgpu';

import { gpu } from 'ralph-gpu';

const WIDTH = 256;
const HEIGHT = 256;

const COLS = 80;
const ROWS = 40; // each row = 2 pixel rows via half-block trick

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

/**
 * Average RGBA pixels in a rectangular block.
 * Returns [r, g, b] in 0–255 range.
 */
function averageBlock(
  pixels: Uint8Array,
  stride: number,
  x0: number, y0: number,
  blockW: number, blockH: number,
): [number, number, number] {
  let rSum = 0, gSum = 0, bSum = 0;
  let count = 0;
  for (let y = y0; y < y0 + blockH && y < HEIGHT; y++) {
    for (let x = x0; x < x0 + blockW && x < WIDTH; x++) {
      const idx = (y * stride + x) * 4;
      rSum += pixels[idx];
      gSum += pixels[idx + 1];
      bSum += pixels[idx + 2];
      count++;
    }
  }
  if (count === 0) return [0, 0, 0];
  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count),
  ];
}

async function main() {
  if (!gpu.isHeadlessSupported()) {
    throw new Error('WebGPU headless mode is not supported in this environment.');
  }

  const ctx = await gpu.initHeadless(WIDTH, HEIGHT);

  const triangle = ctx.material(WGSL, { vertexCount: 3 });
  ctx.clearColor = [0.05, 0.05, 0.05, 1.0];

  ctx.drawMaterial(triangle);
  const pixels = await ctx.readPixels() as Uint8Array;

  // Each terminal cell covers a block of pixels:
  //   blockW = WIDTH / COLS   pixels wide
  //   blockH = HEIGHT / ROWS  pixel-rows per half-block (top + bottom)
  // Since we use the half-block trick, each terminal row covers 2 * blockH pixel rows total.
  // Actually: total pixel rows = ROWS * 2 half-rows. Each half-row = HEIGHT / (ROWS * 2) pixel rows.
  const pixelsPerCol = WIDTH / COLS;
  const pixelsPerHalfRow = HEIGHT / (ROWS * 2);

  const HALF_BLOCK = '\u2580'; // ▀  upper half block
  const RESET = '\x1b[0m';

  let output = '';
  output += `${RESET}\n  🔺 ralph-gpu — RGB Triangle (ASCII art, ${COLS}×${ROWS})\n\n`;

  for (let row = 0; row < ROWS; row++) {
    output += '  '; // left margin
    for (let col = 0; col < COLS; col++) {
      const px = Math.floor(col * pixelsPerCol);
      const topPy = Math.floor(row * 2 * pixelsPerHalfRow);
      const botPy = Math.floor((row * 2 + 1) * pixelsPerHalfRow);

      const bw = Math.max(1, Math.round(pixelsPerCol));
      const bh = Math.max(1, Math.round(pixelsPerHalfRow));

      const [tr, tg, tb] = averageBlock(pixels, WIDTH, px, topPy, bw, bh);
      const [br, bg, bb] = averageBlock(pixels, WIDTH, px, botPy, bw, bh);

      // foreground = top half (▀ character), background = bottom half
      output += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m${HALF_BLOCK}`;
    }
    output += `${RESET}\n`;
  }

  output += `\n  Rendered ${WIDTH}×${HEIGHT} → ${COLS}×${ROWS} terminal cells\n${RESET}`;

  process.stdout.write(output);

  ctx.dispose();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
