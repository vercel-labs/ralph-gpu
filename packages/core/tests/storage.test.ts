import { describe, it, expect, vi } from 'vitest';
import { StorageBuffer } from '../src/storage';

// Mock GPU constants for testing
const mockGPUBufferUsage = {
  STORAGE: 0x80,
  COPY_DST: 0x8,
  COPY_SRC: 0x4,
};

// Mock GPUBufferUsage global
Object.defineProperty(globalThis, 'GPUBufferUsage', {
  value: mockGPUBufferUsage,
  configurable: true,
});

// Mock GPU device
const mockBuffer = {
  destroy: vi.fn(),
};

const mockDevice = {
  createBuffer: vi.fn().mockReturnValue(mockBuffer),
  queue: {
    writeBuffer: vi.fn(),
  },
} as any;

describe('StorageBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create buffer with correct size', () => {
    const byteSize = 1024;
    const storage = new StorageBuffer(mockDevice, byteSize);
    
    expect(mockDevice.createBuffer).toHaveBeenCalledWith({
      size: byteSize,
      usage: mockGPUBufferUsage.STORAGE | mockGPUBufferUsage.COPY_DST | mockGPUBufferUsage.COPY_SRC,
    });
    
    expect(storage.byteSize).toBe(byteSize);
    expect(storage.gpuBuffer).toBe(mockBuffer);
  });

  it('should write ArrayBuffer data to buffer', () => {
    const storage = new StorageBuffer(mockDevice, 256);
    const data = new ArrayBuffer(64);
    
    storage.write(data);
    
    expect(mockDevice.queue.writeBuffer).toHaveBeenCalledWith(
      mockBuffer,
      0,
      data
    );
  });

  it('should write ArrayBufferView data to buffer', () => {
    const storage = new StorageBuffer(mockDevice, 256);
    const data = new Float32Array([1, 2, 3, 4]);
    
    storage.write(data);
    
    // ArrayBufferView uses 5-argument form with byteOffset and byteLength
    expect(mockDevice.queue.writeBuffer).toHaveBeenCalledWith(
      mockBuffer,
      0,
      data.buffer,
      data.byteOffset,
      data.byteLength
    );
  });

  it('should write data with offset', () => {
    const storage = new StorageBuffer(mockDevice, 256);
    const data = new ArrayBuffer(32);
    const offset = 64;
    
    storage.write(data, offset);
    
    expect(mockDevice.queue.writeBuffer).toHaveBeenCalledWith(
      mockBuffer,
      offset,
      data
    );
  });

  it('should dispose buffer correctly', () => {
    const storage = new StorageBuffer(mockDevice, 256);
    
    storage.dispose();
    
    expect(mockBuffer.destroy).toHaveBeenCalled();
  });
});