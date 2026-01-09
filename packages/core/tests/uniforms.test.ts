import { describe, it, expect, vi } from 'vitest';
import { 
  createGlobalsBuffer,
  updateGlobalsBuffer,
  GLOBALS_BUFFER_SIZE,
} from '../src/uniforms';
import type { GlobalUniforms } from '../src/types';

// Mock GPU constants for testing
const mockGPUBufferUsage = {
  UNIFORM: 0x40,
  COPY_DST: 0x8,
};

// Mock GPUBufferUsage global
Object.defineProperty(globalThis, 'GPUBufferUsage', {
  value: mockGPUBufferUsage,
  configurable: true,
});

// Mock GPU device and buffer
const mockBuffer = {};
const mockDevice = {
  createBuffer: vi.fn().mockReturnValue(mockBuffer),
  queue: {
    writeBuffer: vi.fn(),
  },
} as any;

describe('Uniforms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGlobalsBuffer', () => {
    it('should create buffer with correct size and usage', () => {
      const buffer = createGlobalsBuffer(mockDevice);
      
      expect(mockDevice.createBuffer).toHaveBeenCalledWith({
        size: GLOBALS_BUFFER_SIZE,
        usage: mockGPUBufferUsage.UNIFORM | mockGPUBufferUsage.COPY_DST,
      });
      
      expect(buffer).toBe(mockBuffer);
    });
  });

  describe('updateGlobalsBuffer', () => {
    it('should update buffer with global uniforms data', () => {
      const globals: GlobalUniforms = {
        resolution: [800, 600],
        time: 1.5,
        deltaTime: 0.016,
        frame: 100,
        aspect: 800 / 600,
      };
      
      updateGlobalsBuffer(mockDevice, mockBuffer as GPUBuffer, globals);
      
      expect(mockDevice.queue.writeBuffer).toHaveBeenCalledWith(
        mockBuffer,
        0,
        expect.any(ArrayBuffer)
      );
      
      // Verify the data structure
      const call = mockDevice.queue.writeBuffer.mock.calls[0];
      const buffer = call[2] as ArrayBuffer;
      const float32View = new Float32Array(buffer);
      const uint32View = new Uint32Array(buffer);
      
      expect(float32View[0]).toBe(800); // resolution.x
      expect(float32View[1]).toBe(600); // resolution.y
      expect(float32View[2]).toBe(1.5); // time
      expect(float32View[3]).toBeCloseTo(0.016); // deltaTime (use toBeCloseTo for float precision)
      expect(uint32View[4]).toBe(100); // frame (as u32)
      expect(float32View[5]).toBeCloseTo(800 / 600); // aspect
    });

    it('should handle zero values correctly', () => {
      const globals: GlobalUniforms = {
        resolution: [0, 0],
        time: 0,
        deltaTime: 0,
        frame: 0,
        aspect: 0,
      };
      
      updateGlobalsBuffer(mockDevice, mockBuffer as GPUBuffer, globals);
      
      const call = mockDevice.queue.writeBuffer.mock.calls[0];
      const buffer = call[2] as ArrayBuffer;
      const float32View = new Float32Array(buffer);
      const uint32View = new Uint32Array(buffer);
      
      expect(float32View[0]).toBe(0);
      expect(float32View[1]).toBe(0);
      expect(float32View[2]).toBe(0);
      expect(float32View[3]).toBe(0);
      expect(uint32View[4]).toBe(0);
      expect(float32View[5]).toBe(0);
    });
  });

  describe('GLOBALS_BUFFER_SIZE', () => {
    it('should be 32 bytes for proper alignment', () => {
      expect(GLOBALS_BUFFER_SIZE).toBe(32);
    });
  });
});