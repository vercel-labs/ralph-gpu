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

    // Create GPU buffer
    this.buffer = device.createBuffer({
      size: byteSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
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
    const arrayBuffer = data instanceof ArrayBuffer ? data : data.buffer;
    this.device.queue.writeBuffer(this.buffer, offset, arrayBuffer);
  }

  /**
   * Dispose the buffer
   */
  dispose(): void {
    this.buffer.destroy();
  }
}
