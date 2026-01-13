/**
 * Ralph GL - WebGL 2.0 rendering library
 * 
 * @packageDocumentation
 */

export { GLContext, type GLContextOptions, type Color } from './context.js';
export { Pass, type PassOptions, type UniformValue, type UniformObject, type UniformRawValue, type RenderTarget } from './pass.js';
export { 
  extractUniforms, 
  setUniform, 
  injectGlobalUniforms,
  injectCustomUniforms,
  detectUniformType,
  generateUniformDeclaration,
  unwrapUniformValue,
  type UniformDescriptor,
  type UniformDict,
  type GLSLType
} from './uniforms.js';
