import { GLContext } from './context.js';
import { applyBlend } from './blend';
import type { PassOptions, Uniforms, BlendMode, BlendConfig } from './types';

/**
 * Built-in fullscreen quad vertex shader
 * Uses a single triangle that covers the entire screen
 * No vertex buffer needed - generates vertices using gl_VertexID
 */
const FULLSCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;

out vec2 v_uv;

void main() {
  // Generate fullscreen triangle using gl_VertexID
  // Vertex 0: (-1, -1), Vertex 1: (3, -1), Vertex 2: (-1, 3)
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  v_uv = vec2(x, y) * 0.5 + 0.5;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

/**
 * Pass - Fullscreen fragment shader rendering
 * 
 * Renders a fullscreen quad using a fragment shader.
 * Automatically injects global uniforms (u_resolution, u_time, u_frame).
 */
export class Pass<U extends Uniforms = Uniforms> {
  /** Reference to the GLContext */
  private ctx: GLContext;
  
  /** WebGL shader program */
  private program: WebGLProgram | null = null;
  
  /** Vertex Array Object */
  private vao: WebGLVertexArrayObject | null = null;
  
  /** Cached uniform locations */
  private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
  
  /** Custom uniform values (Three.js style) */
  public uniforms: U;
  
  /** Blend mode configuration */
  private blend: BlendMode | BlendConfig | undefined;
  
  /** Texture unit counter */
  private textureUnit: number = 0;

  /**
   * Create a new Pass
   * @param ctx - The GLContext to render with
   * @param fragmentShader - Fragment shader source code
   * @param options - Optional configuration
   */
  constructor(
    ctx: GLContext,
    fragmentShader: string,
    options: PassOptions<U> = {}
  ) {
    this.ctx = ctx;
    
    // Handle transparent sugar syntax (Three.js style)
    if (options.blend !== undefined) {
      this.blend = options.blend;
    } else if (options.transparent === true) {
      this.blend = 'alpha';
    } else {
      this.blend = options.blend;
    }
    
    if (!ctx.gl) {
      throw new Error('GLContext not initialized. Call init() first.');
    }
    
    const gl = ctx.gl;
    const vertexShader = options.vertexShader ?? FULLSCREEN_VERTEX_SHADER;
    
    // Compile shaders and create program
    this.program = this.createProgram(gl, vertexShader, fragmentShader);
    
    // Create VAO (empty, but required for WebGL 2.0)
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO');
    }
    
    // Initialize uniforms from options (reference, not copy)
    this.uniforms = (options.uniforms ?? {}) as U;
  }

  /**
   * Compile a shader
   */
  private compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
      throw new Error(`${shaderType} shader compilation failed:\n${info}`);
    }
    
    return shader;
  }

  /**
   * Create and link a shader program
   */
  private createProgram(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram {
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error('Failed to create program');
    }
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // Shaders can be deleted after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking failed:\n${info}`);
    }
    
    return program;
  }

  /**
   * Get uniform location (cached)
   */
  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.ctx.gl || !this.program) return null;
    
    if (!this.uniformLocations.has(name)) {
      const location = this.ctx.gl.getUniformLocation(this.program, name);
      this.uniformLocations.set(name, location);
    }
    
    return this.uniformLocations.get(name) ?? null;
  }

  /**
   * Set the blend mode
   * @param blend - Blend mode preset or custom config
   * @returns The Pass instance for chaining
   */
  setBlend(blend: BlendMode | BlendConfig | undefined): this {
    this.blend = blend;
    return this;
  }

  /**
   * Apply all uniforms to the shader program
   */
  private applyUniforms(): void {
    const gl = this.ctx.gl;
    if (!gl || !this.program) return;
    
    // Reset texture unit counter
    this.textureUnit = 0;
    
    // Apply global uniforms
    const resolutionLoc = this.getUniformLocation('u_resolution');
    if (resolutionLoc) {
      gl.uniform2f(resolutionLoc, this.ctx.width, this.ctx.height);
    }
    
    const timeLoc = this.getUniformLocation('u_time');
    if (timeLoc) {
      gl.uniform1f(timeLoc, this.ctx.time);
    }
    
    const frameLoc = this.getUniformLocation('u_frame');
    if (frameLoc) {
      gl.uniform1i(frameLoc, this.ctx.frame);
    }
    
    const deltaTimeLoc = this.getUniformLocation('u_deltaTime');
    if (deltaTimeLoc) {
      gl.uniform1f(deltaTimeLoc, this.ctx.deltaTime);
    }
    
    // Apply custom uniforms - iterate over object entries
    for (const [name, uniform] of Object.entries(this.uniforms)) {
      const location = this.getUniformLocation(name);
      if (!location) continue;
      
      const value = uniform.value;
      
      // Check if it's a WebGLTexture
      if (value instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, value);
        gl.uniform1i(location, this.textureUnit);
        this.textureUnit++;
      } else if (typeof value === 'number') {
        gl.uniform1f(location, value);
      } else if (Array.isArray(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2f(location, value[0], value[1]);
            break;
          case 3:
            gl.uniform3f(location, value[0], value[1], value[2]);
            break;
          case 4:
            gl.uniform4f(location, value[0], value[1], value[2], value[3]);
            break;
        }
      } else if (value instanceof Float32Array) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(location, value);
            break;
          case 3:
            gl.uniform3fv(location, value);
            break;
          case 4:
            gl.uniform4fv(location, value);
            break;
          case 9:
            gl.uniformMatrix3fv(location, false, value);
            break;
          case 16:
            gl.uniformMatrix4fv(location, false, value);
            break;
        }
      } else if (value instanceof Int32Array) {
        switch (value.length) {
          case 2:
            gl.uniform2iv(location, value);
            break;
          case 3:
            gl.uniform3iv(location, value);
            break;
          case 4:
            gl.uniform4iv(location, value);
            break;
        }
      }
    }
  }

  /**
   * Draw the fullscreen quad
   * @returns The Pass instance for chaining
   */
  draw(): this {
    const gl = this.ctx.gl;
    if (!gl || !this.program || !this.vao) {
      throw new Error('Pass not properly initialized');
    }
    
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    
    // Apply blend mode
    applyBlend(gl, this.blend);
    
    this.applyUniforms();
    
    // Draw fullscreen triangle (3 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    return this;
  }

  /**
   * Destroy the pass and clean up resources
   */
  destroy(): void {
    const gl = this.ctx.gl;
    if (gl) {
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      if (this.vao) {
        gl.deleteVertexArray(this.vao);
      }
    }
    
    this.program = null;
    this.vao = null;
    this.uniformLocations.clear();
  }
}
