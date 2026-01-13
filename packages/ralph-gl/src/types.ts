/**
 * Types - TypeScript type definitions
 * 
 * Contains all public types used by ralph-gl.
 * Mirrors the types from ralph-gpu where applicable.
 */

/**
 * Options for GLContext initialization
 */
export interface GLContextOptions {
  /** Enable alpha channel (default: true) */
  alpha?: boolean
  
  /** Enable antialiasing (default: false) */
  antialias?: boolean
  
  /** Enable depth buffer (default: false) */
  depth?: boolean
  
  /** Enable stencil buffer (default: false) */
  stencil?: boolean
  
  /** Use premultiplied alpha (default: true) */
  premultipliedAlpha?: boolean
  
  /** Preserve drawing buffer (default: false) */
  preserveDrawingBuffer?: boolean
  
  /** Power preference hint (default: 'high-performance') */
  powerPreference?: 'default' | 'high-performance' | 'low-power'
  
  /** Device pixel ratio (default: window.devicePixelRatio) */
  dpr?: number
  
  /** Whether to auto-resize with the canvas (default: true) */
  autoResize?: boolean
}

/**
 * Uniform wrapper (Three.js style)
 */
export interface Uniform<T = UniformValue> {
  value: T
}

/**
 * Uniforms record type
 */
export type Uniforms = Record<string, Uniform>

/**
 * Options for Pass creation
 */
export interface PassOptions<U extends Uniforms = Uniforms> {
  /** Custom vertex shader (optional, uses fullscreen quad by default) */
  vertexShader?: string
  
  /** Initial uniform values */
  uniforms?: U
  
  /** Enable alpha transparency (sugar for blend: 'alpha') */
  transparent?: boolean
  
  /** Blend mode preset or custom config (overrides transparent) */
  blend?: BlendMode | BlendConfig
  
  /** Output texture format (default: 'rgba8') */
  format?: TextureFormat
}

/**
 * Options for Material creation
 */
export interface MaterialOptions<U extends Uniforms = Uniforms> {
  /** Initial uniform values */
  uniforms?: U
  
  /** Number of vertices to render */
  vertexCount?: number
  
  /** Number of instances for instanced rendering */
  instances?: number
  
  /** Primitive topology (default: 'triangles') */
  topology?: Topology
  
  /** Enable alpha transparency (sugar for blend: 'alpha') */
  transparent?: boolean
  
  /** Blend mode preset or custom config (overrides transparent) */
  blend?: BlendMode | BlendConfig
}

/**
 * Options for RenderTarget creation
 */
export interface RenderTargetOptions {
  /** Texture format (default: 'rgba8') */
  format?: TextureFormat
  
  /** Filter mode (default: 'linear') */
  filter?: 'nearest' | 'linear'
  
  /** Wrap mode (default: 'clamp') */
  wrap?: 'clamp' | 'repeat' | 'mirror'
  
  /** Initial data to upload to texture */
  data?: Float32Array | Uint8Array | Uint16Array | Uint32Array
}

/**
 * Supported texture formats
 * 
 * Maps to WebGL internal formats:
 * - rgba8: RGBA8 (8-bit unsigned normalized)
 * - rgba16f: RGBA16F (16-bit float)
 * - rgba32f: RGBA32F (32-bit float)
 */
export type TextureFormat = 'rgba8' | 'rgba16f' | 'rgba32f'

/**
 * Blend mode presets
 */
export type BlendMode = 'alpha' | 'additive' | 'multiply' | 'screen' | 'none'

/**
 * Custom blend configuration
 */
export interface BlendConfig {
  color: {
    src: number // GLenum
    dst: number
    operation: number
  }
  alpha: {
    src: number
    dst: number
    operation: number
  }
}

/**
 * Uniform value types
 * 
 * Supported:
 * - number (float)
 * - [n, n] (vec2)
 * - [n, n, n] (vec3)
 * - [n, n, n, n] (vec4)
 * - Float32Array (mat4 if length 16, vec* otherwise)
 * - Int32Array (ivec*)
 * - Uint32Array (uvec*)
 * - WebGLTexture (sampler2D)
 */
export type UniformValue =
  | number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | Float32Array
  | Int32Array
  | Uint32Array
  | WebGLTexture

/**
 * Primitive topology for drawing
 */
export type Topology = 'triangles' | 'triangle-strip' | 'triangle-fan' | 'lines' | 'line-strip' | 'line-loop' | 'points'
