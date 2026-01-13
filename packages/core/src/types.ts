/**
 * TypeScript type definitions for ralph-gpu
 */

import type { StorageBuffer } from "./storage";
import type { Sampler } from "./sampler";

/**
 * Texture format options
 */
export type TextureFormat =
  | "rgba8unorm"
  | "rgba16float"
  | "r16float"
  | "rg16float"
  | "r32float";

/**
 * Texture filtering mode
 */
export type FilterMode = "linear" | "nearest";

/**
 * Texture wrapping mode
 */
export type WrapMode = "clamp" | "repeat" | "mirror";

/**
 * Blend mode presets
 */
export type BlendMode = "none" | "alpha" | "additive" | "multiply" | "screen";

/**
 * WebGPU primitive topology for rendering
 */
export type PrimitiveTopology =
  | "triangle-list"
  | "triangle-strip"
  | "line-list"
  | "line-strip"
  | "point-list";

/**
 * Index buffer format
 */
export type IndexFormat = "uint16" | "uint32";

/**
 * Custom blend configuration
 */
export interface BlendConfig {
  color: {
    src: GPUBlendFactor;
    dst: GPUBlendFactor;
    operation: GPUBlendOperation;
  };
  alpha: {
    src: GPUBlendFactor;
    dst: GPUBlendFactor;
    operation: GPUBlendOperation;
  };
}

/**
 * Render target usage mode
 */
export type RenderTargetUsage = "render" | "storage" | "both";

/**
 * Render target options
 */
export interface RenderTargetOptions {
  format?: TextureFormat;
  filter?: FilterMode;
  wrap?: WrapMode;
  /** 
   * Texture usage mode
   * - "render": For rendering and sampling (default)
   * - "storage": For compute shader write operations
   * - "both": For both rendering and storage operations
   */
  usage?: RenderTargetUsage;
}

/**
 * GPU context initialization options
 */
export interface GPUContextOptions {
  /** 
   * Device pixel ratio for high-DPI displays
   * - number: Fixed DPR (overrides device DPR when autoResize enabled)
   * - [min, max]: Clamp device DPR to this range when autoResize enabled
   * - default: Math.min(devicePixelRatio, 2)
   */
  dpr?: number | [number, number];
  /** Enable debug mode with extra validation */
  debug?: boolean;
  /** Automatically resize canvas to match display size using ResizeObserver (default: false) */
  autoResize?: boolean;
}

/**
 * Uniform value wrapper with reactive updates - for manual binding mode
 */
export interface UniformValue<T = any> {
  value: T;
}

/**
 * Uniforms object - for manual binding mode
 */
export interface Uniforms {
  [key: string]: UniformValue<any>;
}

/**
 * Simple uniform value types - for auto-generation mode
 */
export type SimpleUniformValue = 
  | number 
  | boolean 
  | [number, number] 
  | [number, number, number] 
  | [number, number, number, number]
  | { texture: GPUTexture; sampler?: GPUSampler | Sampler }
  | GPUTexture
  | GPUSampler
  | Sampler;

/**
 * Simple uniforms object - for auto-generation mode
 * Just use plain values without { value: T } wrapper
 */
export interface SimpleUniforms {
  [key: string]: SimpleUniformValue;
}

/**
 * Pass creation options
 */
export interface PassOptions {
  /** 
   * Uniforms with { value: T } wrapper (manual binding mode)
   * Use this when you write your own @group(1) @binding() declarations in WGSL
   */
  uniforms?: Uniforms;
  blend?: BlendMode | BlendConfig;
}

/**
 * Material creation options
 */
export interface MaterialOptions {
  uniforms?: Uniforms;
  blend?: BlendMode | BlendConfig;
  vertexCount?: number;
  instances?: number;
  /** Primitive topology for rendering (default: "triangle-list") */
  topology?: PrimitiveTopology;
  /** Index buffer for indexed drawing */
  indexBuffer?: StorageBuffer;
  /** Index format (default: "uint32") */
  indexFormat?: IndexFormat;
  /** Number of indices to draw */
  indexCount?: number;
}

/**
 * Compute shader options
 */
export interface ComputeOptions {
  uniforms?: Uniforms;
  workgroupSize?: [number, number?, number?];
}

/**
 * Multiple render target outputs specification
 */
export interface MRTOutputs {
  [name: string]: RenderTargetOptions;
}

/**
 * Auto-injected global uniforms
 */
export interface GlobalUniforms {
  resolution: [number, number];
  time: number;
  deltaTime: number;
  frame: number;
  aspect: number;
}

/**
 * Particles helper options
 * User provides full shader control - no built-in colors, shapes, or assumptions about data layout
 */
export interface ParticlesOptions {
  /** Full WGSL shader with vertex and fragment functions. 
   * Built-in helpers available: quadOffset(vid), quadUV(vid) */
  shader: string;
  /** Size of the particle storage buffer in bytes */
  bufferSize: number;
  /** Blend mode (default: "alpha") */
  blend?: BlendMode | BlendConfig;
}
