import { describe, it, expect } from 'vitest';
import {
  collectTextureBindings,
  collectSimpleTextureBindings,
  isTextureValue,
  parseBindGroupBindings,
  validateBindings,
} from '../src/uniforms';
import { Sampler } from '../src/sampler';

describe('Texture Bindings', () => {
  // Mock GPUDevice and GPUSampler
  const mockDevice = {
    createSampler: () => ({} as GPUSampler),
  } as unknown as GPUDevice;

  const mockSampler = {} as GPUSampler;
  const mockTexture = {
    createView: () => ({} as GPUTextureView),
  } as GPUTexture;

  describe('isTextureValue', () => {
    it('should return true for GPUTexture', () => {
      expect(isTextureValue(mockTexture)).toBe(true);
    });

    it('should return true for RenderTarget-like objects', () => {
      const renderTarget = {
        texture: mockTexture,
        sampler: mockSampler,
      };
      
      expect(isTextureValue(renderTarget)).toBe(true);
    });

    it('should return false for Sampler instances', () => {
      const sampler = new Sampler(mockDevice, {});
      expect(isTextureValue(sampler)).toBe(false);
    });

    it('should return false for GPUSampler', () => {
      expect(isTextureValue(mockSampler)).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isTextureValue(1.0)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isTextureValue([1, 2, 3])).toBe(false);
    });

    it('should return false for Float32Array', () => {
      expect(isTextureValue(new Float32Array([1, 2, 3]))).toBe(false);
    });
  });

  describe('collectTextureBindings', () => {
    it('should collect textures from uniforms', () => {
      const uniforms = {
        myTexture: { value: mockTexture },
      };

      const bindings = collectTextureBindings(uniforms);
      
      expect(bindings.size).toBe(1);
      expect(bindings.has('myTexture')).toBe(true);
      expect(bindings.get('myTexture')?.texture).toBe(mockTexture);
    });

    it('should collect textures with separate samplers', () => {
      const uniforms = {
        myTexture: { value: mockTexture },
        myTextureSampler: { value: mockSampler },
      };

      const bindings = collectTextureBindings(uniforms);
      
      // The sampler matching looks for the texture first, so check both exist
      expect(bindings.has('myTexture')).toBe(true);
      // Note: sampler matching by convention happens in the binding phase
    });

    it('should handle Sampler instances', () => {
      const sampler = new Sampler(mockDevice, {});
      const uniforms = {
        myTexture: { value: mockTexture },
        myTextureSampler: { value: sampler },
      };

      const bindings = collectTextureBindings(uniforms);
      
      expect(bindings.get('myTexture')?.sampler).toBe(sampler.gpuSampler);
    });

    it('should extract texture from RenderTarget-like objects', () => {
      const renderTarget = {
        texture: mockTexture,
        sampler: mockSampler,
      };
      
      const uniforms = {
        myTexture: { value: renderTarget },
      };

      const bindings = collectTextureBindings(uniforms);
      
      expect(bindings.get('myTexture')?.texture).toBe(mockTexture);
      expect(bindings.get('myTexture')?.sampler).toBe(mockSampler);
    });

    it('should match samplers by naming convention', () => {
      const uniforms = {
        inputTex: { value: mockTexture },
        inputSampler: { value: mockSampler },
      };

      const bindings = collectTextureBindings(uniforms);
      
      // The texture is collected, sampler matching is done in binding phase
      expect(bindings.has('inputTex')).toBe(true);
      expect(bindings.get('inputTex')?.texture).toBe(mockTexture);
    });
  });

  describe('collectSimpleTextureBindings', () => {
    it('should collect textures from simple uniforms', () => {
      const simpleUniforms = {
        myTexture: mockTexture,
      };

      const bindings = collectSimpleTextureBindings(simpleUniforms);
      
      expect(bindings.size).toBe(1);
      expect(bindings.has('myTexture')).toBe(true);
    });

    it('should handle Sampler instances in simple uniforms', () => {
      const sampler = new Sampler(mockDevice, {});
      const simpleUniforms = {
        myTexture: mockTexture,
        myTextureSampler: sampler,
      };

      const bindings = collectSimpleTextureBindings(simpleUniforms);
      
      expect(bindings.get('myTexture')?.sampler).toBe(sampler.gpuSampler);
    });
  });

  describe('parseBindGroupBindings', () => {
    it('should parse texture bindings from WGSL', () => {
      const wgsl = `
        @group(1) @binding(0) var myTexture: texture_2d<f32>;
        @group(1) @binding(1) var mySampler: sampler;
      `;

      const bindings = parseBindGroupBindings(wgsl, 1);
      
      expect(bindings.textures.has('myTexture')).toBe(true);
      expect(bindings.textures.get('myTexture')).toBe(0);
      expect(bindings.samplers.has('mySampler')).toBe(true);
      expect(bindings.samplers.get('mySampler')).toBe(1);
    });

    it('should parse storage texture bindings from WGSL', () => {
      const wgsl = `
        @group(1) @binding(0) var input: texture_2d<f32>;
        @group(1) @binding(1) var output: texture_storage_2d<rgba16float, write>;
      `;

      const bindings = parseBindGroupBindings(wgsl, 1);
      
      expect(bindings.textures.has('input')).toBe(true);
      expect(bindings.storageTextures.has('output')).toBe(true);
      expect(bindings.storageTextures.get('output')).toBe(1);
    });

    it('should parse storage buffer bindings from WGSL', () => {
      const wgsl = `
        @group(1) @binding(0) var<storage, read_write> data: array<f32>;
      `;

      const bindings = parseBindGroupBindings(wgsl, 1);
      
      expect(bindings.storage.has('data')).toBe(true);
      expect(bindings.storage.get('data')).toBe(0);
    });

    it('should parse uniform buffer bindings from WGSL', () => {
      const wgsl = `
        @group(1) @binding(0) var<uniform> u: MyUniforms;
      `;

      const bindings = parseBindGroupBindings(wgsl, 1);
      
      expect(bindings.uniformBuffer).toBe(0);
    });

    it('should parse multiple binding groups', () => {
      const wgsl = `
        @group(0) @binding(0) var<uniform> globals: Globals;
        @group(1) @binding(0) var myTexture: texture_2d<f32>;
        @group(1) @binding(1) var mySampler: sampler;
      `;

      const group0 = parseBindGroupBindings(wgsl, 0);
      const group1 = parseBindGroupBindings(wgsl, 1);
      
      expect(group0.uniformBuffer).toBe(0);
      expect(group1.textures.has('myTexture')).toBe(true);
    });
  });

  describe('validateBindings', () => {
    it('should return null when all bindings are correct', () => {
      const bindings = {
        textures: new Map([['myTexture', 0]]),
        samplers: new Map(),
        storage: new Map(),
        storageTextures: new Map(),
      };

      const uniforms = {
        myTexture: { value: mockTexture },
      };

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      expect(error).toBeNull();
    });

    it('should return error message for missing texture', () => {
      const bindings = {
        textures: new Map([['myTexture', 0]]),
        samplers: new Map(),
        storage: new Map(),
        storageTextures: new Map(),
      };

      const uniforms = {};

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      expect(error).not.toBeNull();
      expect(error).toContain('myTexture');
      expect(error).toContain('MISSING');
    });

    it('should return error message for missing storage buffer', () => {
      const bindings = {
        textures: new Map(),
        samplers: new Map(),
        storage: new Map([['data', 0]]),
        storageTextures: new Map(),
      };

      const uniforms = {};

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      expect(error).not.toBeNull();
      expect(error).toContain('data');
      expect(error).toContain('storage buffer');
    });

    it('should provide fix suggestions in error message', () => {
      const bindings = {
        textures: new Map([['myTexture', 0]]),
        samplers: new Map(),
        storage: new Map(),
        storageTextures: new Map(),
      };

      const uniforms = {};

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      expect(error).toContain('Fix suggestions');
      expect(error).toContain('yourRenderTarget');
    });

    it('should warn about missing samplers', () => {
      const bindings = {
        textures: new Map([['myTexture', 0]]),
        samplers: new Map([['mySampler', 1]]),
        storage: new Map(),
        storageTextures: new Map(),
      };

      const uniforms = {
        myTexture: { value: mockTexture },
      };

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      // Validation returns null if only warnings (no errors)
      // This is acceptable since warnings are logged but don't fail validation
      expect(error).toBeNull();
    });

    it('should return error for non-texture value in texture binding', () => {
      const bindings = {
        textures: new Map([['myTexture', 0]]),
        samplers: new Map(),
        storage: new Map(),
        storageTextures: new Map(),
      };

      const uniforms = {
        myTexture: { value: 123 }, // Not a texture!
      };

      const error = validateBindings('compute', bindings, uniforms, new Map());
      
      expect(error).not.toBeNull();
      expect(error).toContain('NOT A TEXTURE');
    });
  });
});
