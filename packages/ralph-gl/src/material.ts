/**
 * Material - Custom geometry rendering
 * 
 * Renders custom geometry with vertex and fragment shaders.
 * Supports instanced rendering, different topologies, and storage buffers.
 * 
 * Equivalent to the Material class in ralph-gpu.
 */

import type { GLContext } from './context'
import type { MaterialOptions, UniformValue, Topology, BlendMode, BlendConfig } from './types'
import type { StorageBuffer } from './storage'
import type { RenderTarget } from './target'
import { applyBlend } from './blend'

/**
 * Storage binding for vertex attributes
 */
interface StorageBinding {
  buffer: StorageBuffer
  location: number
  size: number
  type: number
  normalized: boolean
  stride: number
  offset: number
  divisor: number
}

export class Material {
  /** Uniform values (Three.js style: { value: X }) */
  uniforms: Record<string, { value: UniformValue }> = {}
  
  /** Number of vertices to draw */
  vertexCount: number = 3
  
  /** Number of instances for instanced rendering */
  instances: number = 1
  
  /** Primitive topology (triangles, lines, points) */
  topology: Topology = 'triangles'
  
  /** Blend mode configuration */
  private _blend: BlendMode | BlendConfig | undefined
  
  private _ctx: GLContext
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram | null = null
  private _vao: WebGLVertexArrayObject | null = null
  private _uniformLocations: Map<string, WebGLUniformLocation | null> = new Map()
  private _storageBindings: StorageBinding[] = []
  private _textureUnit: number = 0
  
  constructor(ctx: GLContext, vertexGLSL: string, fragmentGLSL: string, options?: MaterialOptions) {
    this._ctx = ctx
    this._gl = ctx.gl
    this._blend = options?.blend
    
    // Compile shaders and create program
    this._program = this._createProgram(vertexGLSL, fragmentGLSL)
    
    // Create VAO
    this._vao = this._gl.createVertexArray()
    if (!this._vao) {
      throw new Error('Failed to create VAO')
    }
    
    // Apply options
    if (options?.uniforms) {
      this.uniforms = options.uniforms
    }
    
    if (options?.vertexCount !== undefined) {
      this.vertexCount = options.vertexCount
    }
    
    if (options?.instances !== undefined) {
      this.instances = options.instances
    }
    
    if (options?.topology) {
      this.topology = options.topology
    }
  }
  
  /**
   * Compile a shader
   */
  private _compileShader(type: number, source: string): WebGLShader {
    const gl = this._gl
    const shader = gl.createShader(type)
    
    if (!shader) {
      throw new Error('Failed to create shader')
    }
    
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'
      throw new Error(`${shaderType} shader compilation failed:\n${info}`)
    }
    
    return shader
  }
  
  /**
   * Create and link a shader program
   */
  private _createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this._gl
    
    const vertexShader = this._compileShader(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fragmentSource)
    
    const program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      throw new Error('Failed to create program')
    }
    
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    // Shaders can be deleted after linking
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Program linking failed:\n${info}`)
    }
    
    return program
  }
  
  /**
   * Get uniform location (cached)
   */
  private _getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this._program) return null
    
    if (!this._uniformLocations.has(name)) {
      const location = this._gl.getUniformLocation(this._program, name)
      this._uniformLocations.set(name, location)
    }
    
    return this._uniformLocations.get(name) ?? null
  }
  
  /**
   * Convert topology to WebGL mode
   */
  private _getGLMode(): number {
    const gl = this._gl
    
    switch (this.topology) {
      case 'triangles': return gl.TRIANGLES
      case 'triangle-strip': return gl.TRIANGLE_STRIP
      case 'triangle-fan': return gl.TRIANGLE_FAN
      case 'lines': return gl.LINES
      case 'line-strip': return gl.LINE_STRIP
      case 'line-loop': return gl.LINE_LOOP
      case 'points': return gl.POINTS
      default: return gl.TRIANGLES
    }
  }
  
  /**
   * Bind a storage buffer as a vertex attribute
   * @param name - Attribute name in the shader
   * @param buffer - StorageBuffer to bind
   * @param options - Attribute options
   */
  storage(
    name: string,
    buffer: StorageBuffer,
    options?: {
      size?: number        // Components per vertex (1-4, default: 4)
      type?: number        // GL type (default: FLOAT)
      normalized?: boolean // Normalize integers (default: false)
      stride?: number      // Bytes between vertices (default: 0)
      offset?: number      // Byte offset (default: 0)
      divisor?: number     // Instance divisor (default: 0)
    }
  ): this {
    const gl = this._gl
    
    if (!this._program || !this._vao) {
      throw new Error('Material not properly initialized')
    }
    
    // Get attribute location
    const location = gl.getAttribLocation(this._program, name)
    if (location === -1) {
      console.warn(`Attribute "${name}" not found in shader`)
      return this
    }
    
    // Store binding info
    this._storageBindings.push({
      buffer,
      location,
      size: options?.size ?? 4,
      type: options?.type ?? gl.FLOAT,
      normalized: options?.normalized ?? false,
      stride: options?.stride ?? 0,
      offset: options?.offset ?? 0,
      divisor: options?.divisor ?? 0
    })
    
    // Setup vertex attribute in VAO
    gl.bindVertexArray(this._vao)
    
    if (buffer.buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer as WebGLBuffer)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(
        location,
        options?.size ?? 4,
        options?.type ?? gl.FLOAT,
        options?.normalized ?? false,
        options?.stride ?? 0,
        options?.offset ?? 0
      )
      
      // Set divisor for instanced rendering
      if (options?.divisor !== undefined && options.divisor > 0) {
        gl.vertexAttribDivisor(location, options.divisor)
      }
    }
    
    gl.bindVertexArray(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    
    return this
  }
  
  /**
   * Set a uniform value
   */
  set(name: string, value: UniformValue): this {
    if (this.uniforms[name]) {
      this.uniforms[name].value = value
    } else {
      this.uniforms[name] = { value }
    }
    return this
  }
  
  /**
   * Set the blend mode
   * @param blend - Blend mode preset or custom config
   * @returns The Material instance for chaining
   */
  setBlend(blend: BlendMode | BlendConfig | undefined): this {
    this._blend = blend
    return this
  }
  
  /**
   * Apply all uniforms to the shader program
   */
  private _applyUniforms(): void {
    const gl = this._gl
    if (!this._program) return
    
    // Reset texture unit counter
    this._textureUnit = 0
    
    // Apply global uniforms
    const resolutionLoc = this._getUniformLocation('u_resolution')
    if (resolutionLoc) {
      gl.uniform2f(resolutionLoc, this._ctx.width, this._ctx.height)
    }
    
    const timeLoc = this._getUniformLocation('u_time')
    if (timeLoc) {
      gl.uniform1f(timeLoc, this._ctx.time)
    }
    
    const frameLoc = this._getUniformLocation('u_frame')
    if (frameLoc) {
      gl.uniform1i(frameLoc, this._ctx.frame)
    }
    
    const deltaTimeLoc = this._getUniformLocation('u_deltaTime')
    if (deltaTimeLoc) {
      gl.uniform1f(deltaTimeLoc, this._ctx.deltaTime)
    }
    
    // Apply custom uniforms
    for (const [name, uniform] of Object.entries(this.uniforms)) {
      const location = this._getUniformLocation(name)
      if (!location) continue
      
      const value = uniform.value
      
      // Check if it's a RenderTarget (texture)
      if (value && typeof value === 'object' && 'texture' in value) {
        const target = value as RenderTarget
        gl.activeTexture(gl.TEXTURE0 + this._textureUnit)
        gl.bindTexture(gl.TEXTURE_2D, target.texture)
        gl.uniform1i(location, this._textureUnit)
        this._textureUnit++
      } else if (typeof value === 'number') {
        gl.uniform1f(location, value)
      } else if (Array.isArray(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2f(location, value[0], value[1])
            break
          case 3:
            gl.uniform3f(location, value[0], value[1], value[2])
            break
          case 4:
            gl.uniform4f(location, value[0], value[1], value[2], value[3])
            break
        }
      } else if (value instanceof Float32Array) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(location, value)
            break
          case 3:
            gl.uniform3fv(location, value)
            break
          case 4:
            gl.uniform4fv(location, value)
            break
          case 9:
            gl.uniformMatrix3fv(location, false, value)
            break
          case 16:
            gl.uniformMatrix4fv(location, false, value)
            break
        }
      } else if (value instanceof Int32Array) {
        switch (value.length) {
          case 2:
            gl.uniform2iv(location, value)
            break
          case 3:
            gl.uniform3iv(location, value)
            break
          case 4:
            gl.uniform4iv(location, value)
            break
        }
      }
    }
  }
  
  /**
   * Draw the geometry
   */
  draw(): this {
    const gl = this._gl
    
    if (!this._program || !this._vao) {
      throw new Error('Material not properly initialized')
    }
    
    gl.useProgram(this._program)
    gl.bindVertexArray(this._vao)
    
    // Apply blend mode
    applyBlend(gl, this._blend)
    
    this._applyUniforms()
    
    const mode = this._getGLMode()
    
    if (this.instances > 1) {
      // Instanced rendering
      gl.drawArraysInstanced(mode, 0, this.vertexCount, this.instances)
    } else {
      // Regular rendering
      gl.drawArrays(mode, 0, this.vertexCount)
    }
    
    return this
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this._gl
    
    if (this._program) {
      gl.deleteProgram(this._program)
      this._program = null
    }
    
    if (this._vao) {
      gl.deleteVertexArray(this._vao)
      this._vao = null
    }
    
    this._uniformLocations.clear()
    this._storageBindings = []
  }
}
