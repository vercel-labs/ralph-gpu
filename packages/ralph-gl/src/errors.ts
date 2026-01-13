/**
 * Errors - Custom error classes
 * 
 * Provides specific error types for different failure modes.
 * Helps users diagnose and fix issues more easily.
 */

/**
 * Thrown when WebGL 2.0 is not supported
 */
export class WebGLNotSupportedError extends Error {
  name = 'WebGLNotSupportedError'
  
  constructor(message: string = 'WebGL 2.0 is not supported in this browser') {
    super(message)
    
    // Maintains proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebGLNotSupportedError)
    }
  }
}

/**
 * Thrown when shader compilation fails
 */
export class ShaderCompileError extends Error {
  name = 'ShaderCompileError'
  
  /** Line number where error occurred (if available) */
  line?: number
  
  /** Column number where error occurred (if available) */
  column?: number
  
  /** The shader source that failed to compile */
  source?: string
  
  /** Whether this is a vertex or fragment shader */
  shaderType?: 'vertex' | 'fragment'
  
  constructor(
    message: string,
    options?: {
      line?: number
      column?: number
      source?: string
      shaderType?: 'vertex' | 'fragment'
    }
  ) {
    super(message)
    
    this.line = options?.line
    this.column = options?.column
    this.source = options?.source
    this.shaderType = options?.shaderType
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ShaderCompileError)
    }
  }
}

/**
 * Thrown when framebuffer creation or validation fails
 */
export class FramebufferError extends Error {
  name = 'FramebufferError'
  
  /** WebGL framebuffer status code */
  status?: number
  
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FramebufferError)
    }
  }
  
  /**
   * Get a human-readable status message
   */
  static statusMessage(status: number): string {
    const messages: Record<number, string> = {
      0x8CD5: 'FRAMEBUFFER_COMPLETE',
      0x8CD6: 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT',
      0x8CD7: 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT',
      0x8CDD: 'FRAMEBUFFER_UNSUPPORTED',
      0x8D56: 'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE',
    }
    return messages[status] ?? `Unknown status: ${status}`
  }
}

/**
 * Thrown when a uniform is not found in the shader
 */
export class UniformNotFoundError extends Error {
  name = 'UniformNotFoundError'
  
  /** Name of the uniform that wasn't found */
  uniformName: string
  
  constructor(uniformName: string) {
    super(`Uniform '${uniformName}' not found in shader. Check spelling or ensure it's used in the shader.`)
    this.uniformName = uniformName
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UniformNotFoundError)
    }
  }
}

/**
 * Parse error line/column from WebGL shader info log
 */
export function parseShaderError(infoLog: string): { line?: number; column?: number; message: string } {
  // Common formats:
  // - "ERROR: 0:15: 'x' : undeclared identifier"
  // - "0(15) : error: syntax error"
  
  // Try format: ERROR: 0:LINE:
  const match1 = infoLog.match(/ERROR:\s*\d+:(\d+):\s*(.+)/i)
  if (match1) {
    return {
      line: parseInt(match1[1], 10),
      message: match1[2].trim(),
    }
  }
  
  // Try format: 0(LINE):
  const match2 = infoLog.match(/\d+\((\d+)\)\s*:\s*(.+)/i)
  if (match2) {
    return {
      line: parseInt(match2[1], 10),
      message: match2[2].trim(),
    }
  }
  
  return { message: infoLog.trim() }
}
