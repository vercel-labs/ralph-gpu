import { describe, it, expect } from 'vitest';
import type {
  TextureFormat,
  FilterMode,
  WrapMode,
  BlendMode,
  GPUContextOptions,
  RenderTargetOptions,
  PassOptions,
  MaterialOptions,
  ComputeOptions,
  UniformValue,
  Uniforms,
  GlobalUniforms,
} from '../src/types';

describe('Type Definitions', () => {
  it('should have correct TextureFormat union', () => {
    const formats: TextureFormat[] = [
      'rgba8unorm',
      'rgba16float',
      'r16float',
      'rg16float',
      'r32float',
    ];
    
    // This test ensures the types compile correctly
    expect(formats.length).toBe(5);
  });

  it('should have correct FilterMode union', () => {
    const modes: FilterMode[] = ['linear', 'nearest'];
    expect(modes.length).toBe(2);
  });

  it('should have correct WrapMode union', () => {
    const modes: WrapMode[] = ['clamp', 'repeat', 'mirror'];
    expect(modes.length).toBe(3);
  });

  it('should have correct BlendMode union', () => {
    const modes: BlendMode[] = ['none', 'alpha', 'additive', 'multiply', 'screen'];
    expect(modes.length).toBe(5);
  });

  it('should create valid UniformValue', () => {
    const numberUniform: UniformValue<number> = { value: 42 };
    const arrayUniform: UniformValue<number[]> = { value: [1, 2, 3] };
    
    expect(numberUniform.value).toBe(42);
    expect(arrayUniform.value).toEqual([1, 2, 3]);
  });

  it('should create valid Uniforms object', () => {
    const uniforms: Uniforms = {
      time: { value: 0.5 },
      color: { value: [1, 0, 0] },
      amplitude: { value: 0.2 },
    };
    
    expect(uniforms.time.value).toBe(0.5);
    expect(uniforms.color.value).toEqual([1, 0, 0]);
    expect(uniforms.amplitude.value).toBe(0.2);
  });

  it('should create valid GPUContextOptions', () => {
    const options: GPUContextOptions = {
      dpr: 2,
      debug: true,
    };
    
    expect(options.dpr).toBe(2);
    expect(options.debug).toBe(true);
  });

  it('should create valid RenderTargetOptions', () => {
    const options: RenderTargetOptions = {
      format: 'rgba16float',
      filter: 'linear',
      wrap: 'repeat',
    };
    
    expect(options.format).toBe('rgba16float');
    expect(options.filter).toBe('linear');
    expect(options.wrap).toBe('repeat');
  });

  it('should create valid PassOptions', () => {
    const options: PassOptions = {
      uniforms: {
        time: { value: 1.0 },
      },
      blend: 'additive',
    };
    
    expect(options.uniforms?.time.value).toBe(1.0);
    expect(options.blend).toBe('additive');
  });

  it('should create valid MaterialOptions', () => {
    const options: MaterialOptions = {
      uniforms: {
        color: { value: [1, 1, 1] },
      },
      blend: 'alpha',
      vertexCount: 3,
      instances: 1000,
    };
    
    expect(options.uniforms?.color.value).toEqual([1, 1, 1]);
    expect(options.blend).toBe('alpha');
    expect(options.vertexCount).toBe(3);
    expect(options.instances).toBe(1000);
  });

  it('should create valid ComputeOptions', () => {
    const options: ComputeOptions = {
      uniforms: {
        numParticles: { value: 1000 },
      },
      workgroupSize: [64, 1, 1],
    };
    
    expect(options.uniforms?.numParticles.value).toBe(1000);
    expect(options.workgroupSize).toEqual([64, 1, 1]);
  });

  it('should create valid GlobalUniforms', () => {
    const globals: GlobalUniforms = {
      resolution: [800, 600],
      time: 1.5,
      deltaTime: 0.016,
      frame: 60,
      aspect: 800 / 600,
    };
    
    expect(globals.resolution).toEqual([800, 600]);
    expect(globals.time).toBe(1.5);
    expect(globals.deltaTime).toBe(0.016);
    expect(globals.frame).toBe(60);
    expect(globals.aspect).toBeCloseTo(1.333, 3);
  });
});