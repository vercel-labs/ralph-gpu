/**
 * ralph-gl - Minimal WebGL 2.0 shader library
 * 
 * Main entry point. Exports the public API for creating
 * WebGL contexts, passes, materials, render targets, and more.
 * 
 * @packageDocumentation
 */

// Export main factory
export { gl } from './context'

// Export classes
export { GLContext } from './context'
export { Pass } from './pass'
export { Material } from './material'
export { RenderTarget } from './target'
export { PingPongTarget } from './ping-pong'
export { StorageBuffer } from './storage'
export { ComputeShader } from './compute'

// Export types
export type {
  GLContextOptions,
  PassOptions,
  MaterialOptions,
  RenderTargetOptions,
  TextureFormat,
  BlendMode,
  BlendConfig,
  UniformValue,
  Topology,
} from './types'

// Export errors
export {
  WebGLNotSupportedError,
  ShaderCompileError,
  FramebufferError,
} from './errors'
