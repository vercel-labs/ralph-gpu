/**
 * Custom error classes for ralph-gpu
 */

/**
 * Thrown when WebGPU is not supported in the current environment
 */
export class WebGPUNotSupportedError extends Error {
  constructor(message = "WebGPU is not supported in this browser") {
    super(message);
    this.name = "WebGPUNotSupportedError";
    Object.setPrototypeOf(this, WebGPUNotSupportedError.prototype);
  }
}

/**
 * Thrown when GPU device creation fails
 */
export class DeviceCreationError extends Error {
  constructor(message = "Failed to create GPU device") {
    super(message);
    this.name = "DeviceCreationError";
    Object.setPrototypeOf(this, DeviceCreationError.prototype);
  }
}

/**
 * Thrown when shader compilation fails
 */
export class ShaderCompileError extends Error {
  public readonly line: number;
  public readonly column: number;
  public readonly source: string;

  constructor(message: string, line: number, column: number, source: string) {
    super(message);
    this.name = "ShaderCompileError";
    this.line = line;
    this.column = column;
    this.source = source;
    Object.setPrototypeOf(this, ShaderCompileError.prototype);
  }
}
