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
export { RenderTarget, TextureReference } from "./target";
export { PingPongTarget } from "./ping-pong";
export { MultiRenderTarget } from "./mrt";
export { StorageBuffer } from "./storage";
export { Particles } from "./particles";
export { Sampler } from "./sampler";
export { Texture } from "./texture";
export { EventEmitter } from "./event-emitter";
export { Profiler } from "./profiler";

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
  ParticlesOptions,
  RenderTargetUsage,
} from "./types";

export type { SamplerDescriptor } from "./sampler";

export type { TextureOptions, RawTextureData } from "./texture";

export type {
  GPUEvent,
  DrawEvent,
  ComputeEvent,
  ShaderCompileEvent,
  MemoryEvent,
  TargetEvent,
  PipelineEvent,
  FrameEvent,
  GPUTimingEvent,
  RalphGPUEvent,
  EventType,
} from "./events";

export type {
  EventListener,
  EventEmitterOptions,
} from "./event-emitter";

export type {
  ProfilerRegion,
  RegionSummary,
  FrameProfile,
  FrameStats,
  ProfilerOptions,
} from "./profiler";

/**
 * Library version
 */
export const version = "0.1.0";
