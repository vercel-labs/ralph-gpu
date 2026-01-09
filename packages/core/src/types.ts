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
 * Uniform value wrapper (Three.js style)
 */
export interface UniformValue<T = any> {
  value: T;
}

/**
 * Uniforms object
 */
export interface Uniforms {
  [key: string]: UniformValue<any>;
}

/**
 * Pass creation options
 */
export interface PassOptions {
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
