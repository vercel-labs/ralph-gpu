/**
 * TypeScript type definitions for ralph-gpu
 */

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
 * Render target options
 */
export interface RenderTargetOptions {
  format?: TextureFormat;
  filter?: FilterMode;
  wrap?: WrapMode;
}

/**
 * GPU context initialization options
 */
export interface GPUContextOptions {
  /** Device pixel ratio for high-DPI displays */
  dpr?: number;
  /** Enable debug mode with extra validation */
  debug?: boolean;
}

/**
 * Uniform value wrapper (Three.js style) - for manual binding mode
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
  | { texture: GPUTexture; sampler?: GPUSampler }
  | GPUTexture;

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
