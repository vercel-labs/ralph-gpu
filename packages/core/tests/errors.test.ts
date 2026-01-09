import { describe, it, expect } from 'vitest';
import {
  WebGPUNotSupportedError,
  DeviceCreationError,
  ShaderCompileError,
} from '../src/errors';

describe('Custom Errors', () => {
  describe('WebGPUNotSupportedError', () => {
    it('should create with default message', () => {
      const error = new WebGPUNotSupportedError();
      expect(error.name).toBe('WebGPUNotSupportedError');
      expect(error.message).toBe('WebGPU is not supported in this browser');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof WebGPUNotSupportedError).toBe(true);
    });

    it('should create with custom message', () => {
      const customMessage = 'Custom WebGPU not supported message';
      const error = new WebGPUNotSupportedError(customMessage);
      expect(error.message).toBe(customMessage);
    });
  });

  describe('DeviceCreationError', () => {
    it('should create with default message', () => {
      const error = new DeviceCreationError();
      expect(error.name).toBe('DeviceCreationError');
      expect(error.message).toBe('Failed to create GPU device');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DeviceCreationError).toBe(true);
    });

    it('should create with custom message', () => {
      const customMessage = 'Custom device creation error';
      const error = new DeviceCreationError(customMessage);
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ShaderCompileError', () => {
    it('should create with all required properties', () => {
      const message = 'Unexpected token';
      const line = 10;
      const column = 5;
      const source = 'fn main() { invalid_code; }';
      
      const error = new ShaderCompileError(message, line, column, source);
      
      expect(error.name).toBe('ShaderCompileError');
      expect(error.message).toBe(message);
      expect(error.line).toBe(line);
      expect(error.column).toBe(column);
      expect(error.source).toBe(source);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ShaderCompileError).toBe(true);
    });
  });
});