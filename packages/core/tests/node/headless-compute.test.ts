/**
 * Node.js headless mode — compute shader tests
 *
 * Tests that compute shaders work in headless (Node.js) mode.
 * The "should be a function" test FAILS now (TDD red phase).
 * GPU tests are skipped until gpu.isHeadlessSupported() returns true.
 */

import { describe, it, expect } from 'vitest';
import { gpu } from '../../src/index';

function isHeadlessSupported(): boolean {
  try {
    return typeof (gpu as any).isHeadlessSupported === 'function'
      ? (gpu as any).isHeadlessSupported()
      : false;
  } catch {
    return false;
  }
}

describe('gpu headless compute (Node.js)', () => {
  // --- Always-running test (TDD red failure) ---

  it('gpu.isHeadlessSupported should be a function', () => {
    expect(typeof (gpu as any).isHeadlessSupported).toBe('function');
  });

  // --- GPU-hardware tests (skipped until headless support is available) ---

  it.skipIf(!isHeadlessSupported())(
    'initHeadless works with minimal size (1x1)',
    async () => {
      const ctx = await (gpu as any).initHeadless(1, 1);
      expect(ctx).toBeDefined();
      expect(ctx.width).toBe(1);
      expect(ctx.height).toBe(1);
      ctx.dispose();
    }
  );

  it.skipIf(!isHeadlessSupported())(
    'compute shader doubles values in a StorageBuffer',
    async () => {
      const ctx = await (gpu as any).initHeadless(1, 1);

      // 8 f32 values = 32 bytes
      const count = 8;
      const byteSize = count * 4;
      const storage = ctx.storage(byteSize);

      // Write initial values [1, 2, 3, 4, 5, 6, 7, 8]
      const inputData = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
      storage.write(inputData);

      // Compute shader that doubles each element
      // Use group(1) for user storage buffers (group(0) is reserved for globals)
      const compute = ctx.compute(`
        @group(1) @binding(0) var<storage, read_write> data: array<f32>;

        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) gid: vec3u) {
          let i = gid.x;
          data[i] = data[i] * 2.0;
        }
      `);

      // Bind the storage buffer before dispatching
      compute.storage('data', storage);
      compute.dispatch(count);

      // Read back the buffer via a staging buffer
      const device = (ctx as any).device as GPUDevice;
      const stagingBuffer = device.createBuffer({
        size: byteSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(storage.gpuBuffer, 0, stagingBuffer, 0, byteSize);
      device.queue.submit([encoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(stagingBuffer.getMappedRange().slice(0));
      stagingBuffer.unmap();
      stagingBuffer.destroy();

      // Values should be doubled
      expect(Array.from(result)).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);

      storage.dispose();
      ctx.dispose();
    }
  );
});
