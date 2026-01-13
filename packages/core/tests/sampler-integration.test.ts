import { describe, it, expect } from 'vitest';
import type { SimpleUniformValue } from '../src/types';
import { Sampler } from '../src/sampler';

describe('Sampler Integration', () => {
  const mockDevice = {
    createSampler: () => ({} as GPUSampler),
  } as unknown as GPUDevice;

  describe('SimpleUniformValue type', () => {
    it('should accept Sampler instances', () => {
      const sampler = new Sampler(mockDevice, {});
      const value: SimpleUniformValue = sampler;
      
      expect(value).toBe(sampler);
    });

    it('should accept GPUSampler', () => {
      const gpuSampler = {} as GPUSampler;
      const value: SimpleUniformValue = gpuSampler;
      
      expect(value).toBe(gpuSampler);
    });

    it('should accept GPUTexture', () => {
      const texture = {
        createView: () => ({} as GPUTextureView),
      } as GPUTexture;
      
      const value: SimpleUniformValue = texture;
      
      expect(value).toBe(texture);
    });

    it('should accept RenderTarget-like objects with Sampler', () => {
      const sampler = new Sampler(mockDevice, {});
      const renderTarget = {
        texture: {} as GPUTexture,
        sampler: sampler,
      };
      
      const value: SimpleUniformValue = renderTarget;
      
      expect(value).toBe(renderTarget);
    });

    it('should accept numbers', () => {
      const value: SimpleUniformValue = 1.0;
      expect(value).toBe(1.0);
    });

    it('should accept vec2 arrays', () => {
      const value: SimpleUniformValue = [1, 2];
      expect(value).toEqual([1, 2]);
    });

    it('should accept vec3 arrays', () => {
      const value: SimpleUniformValue = [1, 2, 3];
      expect(value).toEqual([1, 2, 3]);
    });

    it('should accept vec4 arrays', () => {
      const value: SimpleUniformValue = [1, 2, 3, 4];
      expect(value).toEqual([1, 2, 3, 4]);
    });

    it('should accept booleans', () => {
      const value: SimpleUniformValue = true;
      expect(value).toBe(true);
    });

    it('should accept Float32Array', () => {
      const arr = new Float32Array([1, 2, 3]);
      const value: SimpleUniformValue = arr;
      expect(value).toBe(arr);
    });
  });

  describe('Sampler in uniform collections', () => {
    it('should work in uniforms object', () => {
      const sampler = new Sampler(mockDevice, {});
      
      const uniforms = {
        myTexture: { value: {} as GPUTexture },
        mySampler: { value: sampler },
      };

      expect(uniforms.mySampler.value).toBe(sampler);
    });

    it('should work in simple uniforms object', () => {
      const sampler = new Sampler(mockDevice, {});
      
      const simpleUniforms = {
        myTexture: {} as GPUTexture,
        mySampler: sampler,
      };

      expect(simpleUniforms.mySampler).toBe(sampler);
    });

    it('should allow multiple samplers with different configs', () => {
      const linearSampler = new Sampler(mockDevice, {
        magFilter: 'linear',
        minFilter: 'linear',
      });
      
      const nearestSampler = new Sampler(mockDevice, {
        magFilter: 'nearest',
        minFilter: 'nearest',
      });

      const uniforms = {
        linearSampler: { value: linearSampler },
        nearestSampler: { value: nearestSampler },
      };

      expect(uniforms.linearSampler.value.descriptor.magFilter).toBe('linear');
      expect(uniforms.nearestSampler.value.descriptor.magFilter).toBe('nearest');
    });
  });

  describe('Sampler creation patterns', () => {
    it('should support linear clamp pattern', () => {
      const sampler = new Sampler(mockDevice, {
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      const desc = sampler.descriptor;
      expect(desc.magFilter).toBe('linear');
      expect(desc.addressModeU).toBe('clamp-to-edge');
    });

    it('should support nearest repeat pattern', () => {
      const sampler = new Sampler(mockDevice, {
        magFilter: 'nearest',
        minFilter: 'nearest',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
      });

      const desc = sampler.descriptor;
      expect(desc.magFilter).toBe('nearest');
      expect(desc.addressModeU).toBe('repeat');
    });

    it('should support mirror pattern', () => {
      const sampler = new Sampler(mockDevice, {
        addressModeU: 'mirror-repeat',
        addressModeV: 'mirror-repeat',
      });

      const desc = sampler.descriptor;
      expect(desc.addressModeU).toBe('mirror-repeat');
    });
  });
});
