/**
 * ralph-gpu - Minimal WebGPU shader library
 * 
 * @packageDocumentation
 */

// Main API
export { gpu, GPUContext } from "./context";

// Classes
export { Pass } from "./pass";
export { Material } from "./material";
export { ComputeShader } from "./compute";
export { RenderTarget } from "./target";
export { PingPongTarget } from "./ping-pong";
export { MultiRenderTarget } from "./mrt";
export { StorageBuffer } from "./storage";

// Errors
export {
  WebGPUNotSupportedError,
  DeviceCreationError,
  ShaderCompileError,
} from "./errors";

// Types
export type {
  GPUContextOptions,
  PassOptions,
  MaterialOptions,
  ComputeOptions,
  RenderTargetOptions,
  MRTOutputs,
  Uniforms,
  UniformValue,
  SimpleUniforms,
  SimpleUniformValue,
  BlendMode,
  BlendConfig,
  TextureFormat,
  FilterMode,
  WrapMode,
  GlobalUniforms,
  PrimitiveTopology,
  IndexFormat,
} from "./types";

/**
 * Library version
 */
export const version = "0.1.0";
