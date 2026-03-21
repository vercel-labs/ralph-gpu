/**
 * Node.js headless compute shader example
 *
 * Runs a compute shader that doubles values in a storage buffer.
 *
 * Prerequisites:
 *   npm install ralph-gpu webgpu
 *
 * Run:
 *   npx tsx packages/core/examples/node-compute.ts
 */

import 'webgpu';

import { gpu } from '../src/index';

async function main() {
  if (!gpu.isHeadlessSupported()) {
    console.error('WebGPU not available. Install the webgpu package.');
    process.exit(1);
  }

  console.log('Initializing ralph-gpu headless (1x1)...');
  const ctx = await gpu.initHeadless(1, 1);

  // Create a storage buffer with initial values [1, 2, 3, 4, 5, 6, 7, 8]
  const initialData = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const storage = ctx.storage(initialData.byteLength);
  storage.write(initialData);

  // Compute shader that doubles each value
  const compute = ctx.compute(`
    @group(1) @binding(0) var<storage, read_write> data: array<f32>;

    @compute @workgroup_size(8)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      let i = id.x;
      data[i] = data[i] * 2.0;
    }
  `, {
    workgroupSize: [8, 1, 1],
  });

  // Bind storage and dispatch
  compute.setStorageBuffer('data', storage);
  compute.dispatch(1); // 1 workgroup of 8 threads

  // Read back the results
  const result = await storage.read() as Float32Array;
  console.log('Input:  [1, 2, 3, 4, 5, 6, 7, 8]');
  console.log('Output:', Array.from(result));

  const expected = [2, 4, 6, 8, 10, 12, 14, 16];
  const correct = expected.every((v, i) => Math.abs(result[i] - v) < 0.001);
  console.log(correct ? '✅ Compute results correct!' : '❌ Compute results wrong!');

  ctx.dispose();
}

main().catch(console.error);
