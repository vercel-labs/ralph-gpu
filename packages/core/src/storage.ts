/**
 * Storage buffer for GPU compute operations
 */

/**
 * Storage buffer class
 */
export class StorageBuffer {
  private device: GPUDevice;
  private buffer: GPUBuffer;
  private _byteSize: number;

  constructor(device: GPUDevice, byteSize: number) {
    this.device = device;
    this._byteSize = byteSize;

    // Create GPU buffer with INDEX usage to support index buffer operations
    this.buffer = device.createBuffer({
      size: byteSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.INDEX,
    });
  }

  /**
   * Get the underlying GPUBuffer
   */
  get gpuBuffer(): GPUBuffer {
    return this.buffer;
  }

  /**
   * Get the buffer size in bytes
   */
  get byteSize(): number {
    return this._byteSize;
  }

  /**
   * Write data to the buffer
   */
  write(data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    // For ArrayBufferView (Float32Array, etc.), pass the underlying buffer with correct offset/length
    if (data instanceof ArrayBuffer) {
      this.device.queue.writeBuffer(this.buffer, offset, data);
    } else {
      // Pass view's buffer with byteOffset and byteLength to handle views correctly
      this.device.queue.writeBuffer(
        this.buffer, 
        offset, 
        data.buffer as ArrayBuffer, 
        data.byteOffset, 
        data.byteLength
      );
    }
  }

  /**
   * Dispose the buffer
   */
  dispose(): void {
    this.buffer.destroy();
  }
}
