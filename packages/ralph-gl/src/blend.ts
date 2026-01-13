/**
 * Blend mode utilities
 * 
 * Provides blend mode presets and application for WebGL rendering.
 */

import type { BlendMode, BlendConfig } from './types'

/**
 * Get WebGL blend function constants for a preset blend mode
 */
export function getBlendPreset(gl: WebGL2RenderingContext, mode: BlendMode): BlendConfig | null {
  switch (mode) {
    case 'alpha':
      return {
        color: { src: gl.SRC_ALPHA, dst: gl.ONE_MINUS_SRC_ALPHA, operation: gl.FUNC_ADD },
        alpha: { src: gl.ONE, dst: gl.ONE_MINUS_SRC_ALPHA, operation: gl.FUNC_ADD }
      }
    case 'additive':
      return {
        color: { src: gl.ONE, dst: gl.ONE, operation: gl.FUNC_ADD },
        alpha: { src: gl.ONE, dst: gl.ONE, operation: gl.FUNC_ADD }
      }
    case 'multiply':
      return {
        color: { src: gl.DST_COLOR, dst: gl.ZERO, operation: gl.FUNC_ADD },
        alpha: { src: gl.DST_ALPHA, dst: gl.ZERO, operation: gl.FUNC_ADD }
      }
    case 'screen':
      return {
        color: { src: gl.ONE, dst: gl.ONE_MINUS_SRC_COLOR, operation: gl.FUNC_ADD },
        alpha: { src: gl.ONE, dst: gl.ONE_MINUS_SRC_ALPHA, operation: gl.FUNC_ADD }
      }
    case 'none':
    default:
      return null
  }
}

/**
 * Apply blend mode to WebGL context
 */
export function applyBlend(
  gl: WebGL2RenderingContext,
  blend: BlendMode | BlendConfig | undefined
): void {
  if (blend === undefined || blend === 'none') {
    gl.disable(gl.BLEND)
    return
  }
  
  // Get blend config from preset or use custom config
  const config = typeof blend === 'string' ? getBlendPreset(gl, blend) : blend
  
  if (!config) {
    gl.disable(gl.BLEND)
    return
  }
  
  gl.enable(gl.BLEND)
  gl.blendEquationSeparate(config.color.operation, config.alpha.operation)
  gl.blendFuncSeparate(
    config.color.src,
    config.color.dst,
    config.alpha.src,
    config.alpha.dst
  )
}
