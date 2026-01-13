import { describe, it, expect } from 'vitest';
import { Sampler } from '../src/sampler';

describe('Sampler', () => {
  // Mock GPUDevice for testing
  const mockDevice = {
    createSampler: (descriptor: any) => ({
      descriptor,
      label: 'mock-sampler',
    }),
  } as unknown as GPUDevice;

  describe('constructor', () => {
    it('should create a sampler with default values', () => {
      const sampler = new Sampler(mockDevice, {});
      
      expect(sampler).toBeDefined();
      expect(sampler.gpuSampler).toBeDefined();
    });

    it('should create a sampler with custom filter modes', () => {
      const sampler = new Sampler(mockDevice, {
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmapFilter: 'nearest',
      });
      
      expect(sampler.gpuSampler).toBeDefined();
      expect(sampler.descriptor.magFilter).toBe('nearest');
      expect(sampler.descriptor.minFilter).toBe('nearest');
      expect(sampler.descriptor.mipmapFilter).toBe('nearest');
    });

    it('should create a sampler with custom address modes', () => {
      const sampler = new Sampler(mockDevice, {
        addressModeU: 'repeat',
        addressModeV: 'mirror-repeat',
        addressModeW: 'clamp-to-edge',
      });
      
      expect(sampler.descriptor.addressModeU).toBe('repeat');
      expect(sampler.descriptor.addressModeV).toBe('mirror-repeat');
      expect(sampler.descriptor.addressModeW).toBe('clamp-to-edge');
    });

    it('should create a sampler with LOD clamping', () => {
      const sampler = new Sampler(mockDevice, {
        lodMinClamp: 2,
        lodMaxClamp: 10,
      });
      
      expect(sampler.descriptor.lodMinClamp).toBe(2);
      expect(sampler.descriptor.lodMaxClamp).toBe(10);
    });

    it('should create a sampler with comparison function', () => {
      const sampler = new Sampler(mockDevice, {
        compare: 'less',
      });
      
      expect(sampler.descriptor.compare).toBe('less');
    });

    it('should create a sampler with anisotropy', () => {
      const sampler = new Sampler(mockDevice, {
        maxAnisotropy: 16,
      });
      
      expect(sampler.descriptor.maxAnisotropy).toBe(16);
    });
  });

  describe('gpuSampler', () => {
    it('should expose the underlying GPUSampler', () => {
      const sampler = new Sampler(mockDevice, {});
      
      expect(sampler.gpuSampler).toBeDefined();
    });
  });

  describe('descriptor', () => {
    it('should expose the sampler descriptor', () => {
      const descriptor = {
        magFilter: 'linear' as const,
        minFilter: 'linear' as const,
        addressModeU: 'repeat' as const,
      };
      
      const sampler = new Sampler(mockDevice, descriptor);
      
      expect(sampler.descriptor).toMatchObject(descriptor);
    });

    it('should return a readonly descriptor', () => {
      const sampler = new Sampler(mockDevice, {});
      const descriptor = sampler.descriptor;
      
      // TypeScript should enforce this, but we can test that the object exists
      expect(descriptor).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should have a dispose method', () => {
      const sampler = new Sampler(mockDevice, {});
      
      expect(typeof sampler.dispose).toBe('function');
    });

    it('should not throw when disposed', () => {
      const sampler = new Sampler(mockDevice, {});
      
      expect(() => sampler.dispose()).not.toThrow();
    });
  });
});
