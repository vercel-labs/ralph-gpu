import { describe, it, expect, vi } from 'vitest';
import { PingPongTarget } from '../src/ping-pong';
import { RenderTarget } from '../src/target';

// Mock RenderTarget class
vi.mock('../src/target', () => ({
  RenderTarget: vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

const mockDevice = {} as GPUDevice;

describe('PingPongTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create two render targets', () => {
    const width = 256;
    const height = 128;
    const options = { format: 'rgba16float' as const };
    
    const pingPong = new PingPongTarget(mockDevice, width, height, options);
    
    expect(RenderTarget).toHaveBeenCalledTimes(2);
    expect(RenderTarget).toHaveBeenNthCalledWith(1, mockDevice, width, height, options);
    expect(RenderTarget).toHaveBeenNthCalledWith(2, mockDevice, width, height, options);
    
    expect(pingPong.read).toBeDefined();
    expect(pingPong.write).toBeDefined();
  });

  it('should swap read and write targets', () => {
    const pingPong = new PingPongTarget(mockDevice, 100, 100);
    
    const originalRead = pingPong.read;
    const originalWrite = pingPong.write;
    
    pingPong.swap();
    
    expect(pingPong.read).toBe(originalWrite);
    expect(pingPong.write).toBe(originalRead);
  });

  it('should resize both targets', () => {
    const pingPong = new PingPongTarget(mockDevice, 100, 100);
    const newWidth = 200;
    const newHeight = 150;
    
    pingPong.resize(newWidth, newHeight);
    
    expect(pingPong.read.resize).toHaveBeenCalledWith(newWidth, newHeight);
    expect(pingPong.write.resize).toHaveBeenCalledWith(newWidth, newHeight);
  });

  it('should dispose both targets', () => {
    const pingPong = new PingPongTarget(mockDevice, 100, 100);
    
    pingPong.dispose();
    
    expect(pingPong.read.dispose).toHaveBeenCalled();
    expect(pingPong.write.dispose).toHaveBeenCalled();
  });
});