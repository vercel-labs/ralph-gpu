import { describe, it, expect } from 'vitest';
import {
  gpu,
  GPUContext,
  Pass,
  Material,
  ComputeShader,
  RenderTarget,
  PingPongTarget,
  MultiRenderTarget,
  StorageBuffer,
  WebGPUNotSupportedError,
  DeviceCreationError,
  ShaderCompileError,
  version,
} from '../src/index';

describe('API Exports', () => {
  it('should export gpu object with correct methods', () => {
    expect(gpu).toBeDefined();
    expect(typeof gpu.isSupported).toBe('function');
    expect(typeof gpu.init).toBe('function');
  });

  it('should export GPUContext class', () => {
    expect(GPUContext).toBeDefined();
    expect(typeof GPUContext).toBe('function');
  });

  it('should export Pass class', () => {
    expect(Pass).toBeDefined();
    expect(typeof Pass).toBe('function');
  });

  it('should export Material class', () => {
    expect(Material).toBeDefined();
    expect(typeof Material).toBe('function');
  });

  it('should export ComputeShader class', () => {
    expect(ComputeShader).toBeDefined();
    expect(typeof ComputeShader).toBe('function');
  });

  it('should export RenderTarget class', () => {
    expect(RenderTarget).toBeDefined();
    expect(typeof RenderTarget).toBe('function');
  });

  it('should export PingPongTarget class', () => {
    expect(PingPongTarget).toBeDefined();
    expect(typeof PingPongTarget).toBe('function');
  });

  it('should export MultiRenderTarget class', () => {
    expect(MultiRenderTarget).toBeDefined();
    expect(typeof MultiRenderTarget).toBe('function');
  });

  it('should export StorageBuffer class', () => {
    expect(StorageBuffer).toBeDefined();
    expect(typeof StorageBuffer).toBe('function');
  });

  it('should export custom error classes', () => {
    expect(WebGPUNotSupportedError).toBeDefined();
    expect(typeof WebGPUNotSupportedError).toBe('function');
    expect(DeviceCreationError).toBeDefined();
    expect(typeof DeviceCreationError).toBe('function');
    expect(ShaderCompileError).toBeDefined();
    expect(typeof ShaderCompileError).toBe('function');
  });

  it('should export version string', () => {
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).toBe('0.1.0');
  });

  it('should have error classes properly extending Error', () => {
    expect(WebGPUNotSupportedError.prototype instanceof Error).toBe(true);
    expect(DeviceCreationError.prototype instanceof Error).toBe(true);
    expect(ShaderCompileError.prototype instanceof Error).toBe(true);
  });
});

// Test key API signatures match DX_EXAMPLES.md specification
describe('API Signatures', () => {
  it('gpu.isSupported should return boolean', () => {
    const result = gpu.isSupported();
    expect(typeof result).toBe('boolean');
  });

  it('gpu.init should be async function', () => {
    expect(gpu.init.constructor.name).toBe('AsyncFunction');
  });

  it('error classes should have correct constructors', () => {
    const webgpuError = new WebGPUNotSupportedError();
    expect(webgpuError.name).toBe('WebGPUNotSupportedError');

    const deviceError = new DeviceCreationError();
    expect(deviceError.name).toBe('DeviceCreationError');

    const shaderError = new ShaderCompileError('test', 1, 1, 'code');
    expect(shaderError.name).toBe('ShaderCompileError');
    expect(shaderError.line).toBe(1);
    expect(shaderError.column).toBe(1);
    expect(shaderError.source).toBe('code');
  });
});