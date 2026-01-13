/**
 * Uniform handling for Ralph GL
 * 
 * Provides utilities for parsing, injecting, and setting shader uniforms
 * with Three.js-style { value: X } pattern support.
 */

/**
 * RenderTarget interface (forward declaration for sampler2D support)
 * This will be fully implemented in a future task
 */
export interface RenderTarget {
  texture: WebGLTexture | null;
  width: number;
  height: number;
}

/**
 * Supported GLSL uniform types
 */
export type GLSLType = 
  | 'float' 
  | 'int' 
  | 'vec2' 
  | 'vec3' 
  | 'vec4' 
  | 'ivec2' 
  | 'ivec3' 
  | 'ivec4'
  | 'mat2'
  | 'mat3' 
  | 'mat4' 
  | 'sampler2D';

/**
 * Parsed uniform descriptor
 */
export interface UniformDescriptor {
  name: string;
  type: GLSLType;
  arraySize?: number; // For array uniforms
}

/**
 * Three.js-style uniform value wrapper
 */
export interface UniformObject<T = UniformRawValue> {
  value: T;
}

/**
 * Vector types for uniforms
 */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

/**
 * Raw uniform value types (without the { value: X } wrapper)
 */
export type UniformRawValue = 
  | number 
  | Vec2
  | Vec3
  | Vec4
  | Float32Array
  | Int32Array
  | RenderTarget;

/**
 * Uniform value - can be raw value or wrapped in { value: X }
 */
export type UniformValue = UniformRawValue | UniformObject;

/**
 * Dictionary of uniforms with { value: X } pattern
 */
export interface UniformDict {
  [name: string]: UniformObject;
}

/**
 * Global uniforms that are auto-injected
 */
const GLOBAL_UNIFORMS: UniformDescriptor[] = [
  { name: 'u_resolution', type: 'vec2' },
  { name: 'u_time', type: 'float' },
  { name: 'u_deltaTime', type: 'float' },
  { name: 'u_frame', type: 'int' },
  { name: 'u_mouse', type: 'vec4' },
];

/**
 * GLSL type to declaration mapping
 */
const TYPE_DECLARATIONS: Record<GLSLType, string> = {
  'float': 'uniform float',
  'int': 'uniform int',
  'vec2': 'uniform vec2',
  'vec3': 'uniform vec3',
  'vec4': 'uniform vec4',
  'ivec2': 'uniform ivec2',
  'ivec3': 'uniform ivec3',
  'ivec4': 'uniform ivec4',
  'mat2': 'uniform mat2',
  'mat3': 'uniform mat3',
  'mat4': 'uniform mat4',
  'sampler2D': 'uniform sampler2D',
};

/**
 * Extract uniform declarations from GLSL shader source
 * 
 * @param shaderSource - GLSL shader source code
 * @returns Array of parsed uniform descriptors
 */
export function extractUniforms(shaderSource: string): UniformDescriptor[] {
  const uniforms: UniformDescriptor[] = [];
  
  // Regex to match uniform declarations
  // Matches: uniform <type> <name>[<arraySize>];
  // Handles comments, multiple uniforms on separate lines
  const uniformRegex = /uniform\s+(float|int|vec[234]|ivec[234]|mat[234]|sampler2D)\s+(\w+)(?:\[(\d+)\])?/g;
  
  let match;
  while ((match = uniformRegex.exec(shaderSource)) !== null) {
    const [, type, name, arraySize] = match;
    const descriptor: UniformDescriptor = {
      name,
      type: type as GLSLType,
    };
    if (arraySize) {
      descriptor.arraySize = parseInt(arraySize, 10);
    }
    uniforms.push(descriptor);
  }
  
  return uniforms;
}

/**
 * Check if a uniform is already declared in the shader source
 */
function hasUniformDeclaration(source: string, name: string): boolean {
  // Match uniform declaration with this name
  const regex = new RegExp(`uniform\\s+\\w+\\s+${name}\\b`);
  return regex.test(source);
}

/**
 * Auto-inject global uniform declarations into shader source
 * Only injects uniforms that are used in the shader but not declared
 * 
 * @param shaderSource - GLSL shader source code
 * @returns Modified shader source with injected uniform declarations
 */
export function injectGlobalUniforms(shaderSource: string): string {
  const injections: string[] = [];
  
  for (const uniform of GLOBAL_UNIFORMS) {
    // Check if uniform is used in shader but not declared
    const usageRegex = new RegExp(`\\b${uniform.name}\\b`);
    const isUsed = usageRegex.test(shaderSource);
    const isDeclared = hasUniformDeclaration(shaderSource, uniform.name);
    
    if (isUsed && !isDeclared) {
      injections.push(`${TYPE_DECLARATIONS[uniform.type]} ${uniform.name};`);
    }
  }
  
  if (injections.length === 0) {
    return shaderSource;
  }
  
  // Find insertion point: after #version and precision directives
  const lines = shaderSource.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#version') || 
        line.startsWith('precision') ||
        line === '' ||
        line.startsWith('//')) {
      insertIndex = i + 1;
    } else if (!line.startsWith('//') && line.length > 0) {
      // Stop at first non-directive, non-comment, non-empty line
      break;
    }
  }
  
  // Insert uniform declarations
  const injectionBlock = '\n// Auto-injected global uniforms\n' + injections.join('\n') + '\n';
  lines.splice(insertIndex, 0, injectionBlock);
  
  return lines.join('\n');
}

/**
 * Unwrap uniform value from { value: X } pattern if needed
 */
export function unwrapUniformValue(value: UniformValue): UniformRawValue {
  if (value !== null && typeof value === 'object' && 'value' in value) {
    return value.value;
  }
  return value as UniformRawValue;
}

/**
 * Check if a value is a RenderTarget
 */
function isRenderTarget(value: unknown): value is RenderTarget {
  return value !== null && 
         typeof value === 'object' && 
         'texture' in value &&
         'width' in value &&
         'height' in value;
}

/**
 * Detect the GLSL type from a JavaScript value
 * 
 * @param value - The uniform value
 * @returns The detected GLSL type
 */
export function detectUniformType(value: UniformRawValue): GLSLType {
  if (typeof value === 'number') {
    return 'float';
  }
  
  if (isRenderTarget(value)) {
    return 'sampler2D';
  }
  
  if (Array.isArray(value)) {
    // TypeScript knows these are fixed-length tuples
    const len = value.length;
    if (len === 2) return 'vec2';
    if (len === 3) return 'vec3';
    if (len === 4) return 'vec4';
    // Shouldn't reach here with proper typing, but handle gracefully
    throw new Error(`Unsupported array length: ${len}`);
  }
  
  if (value instanceof Float32Array) {
    const len = value.length;
    if (len === 2) return 'vec2';
    if (len === 3) return 'vec3';
    if (len === 4) return 'vec4';
    if (len === 9) return 'mat3';
    if (len === 16) return 'mat4';
    throw new Error(`Unsupported Float32Array length: ${len}`);
  }
  
  if (value instanceof Int32Array) {
    const len = value.length;
    if (len === 2) return 'ivec2';
    if (len === 3) return 'ivec3';
    if (len === 4) return 'ivec4';
    throw new Error(`Unsupported Int32Array length: ${len}`);
  }
  
  throw new Error(`Cannot detect uniform type for value: ${value}`);
}

/**
 * Set a uniform value on a WebGL program
 * Automatically detects the type and calls the appropriate gl.uniform* function
 * 
 * @param gl - WebGL 2.0 rendering context
 * @param location - Uniform location
 * @param value - Value to set (raw or wrapped)
 * @param textureUnit - Texture unit to use for sampler2D (optional)
 * @returns The texture unit used (for sampler2D) or -1
 */
export function setUniform(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  value: UniformValue,
  textureUnit: number = 0
): number {
  if (!location) return -1;
  
  // Unwrap { value: X } pattern
  const rawValue = unwrapUniformValue(value);
  
  // Handle RenderTarget (sampler2D)
  if (isRenderTarget(rawValue)) {
    if (rawValue.texture) {
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, rawValue.texture);
      gl.uniform1i(location, textureUnit);
      return textureUnit;
    }
    return -1;
  }
  
  // Handle number (float)
  if (typeof rawValue === 'number') {
    gl.uniform1f(location, rawValue);
    return -1;
  }
  
  // Handle arrays (vec2/3/4)
  if (Array.isArray(rawValue)) {
    const len = rawValue.length;
    if (len === 2) {
      gl.uniform2f(location, rawValue[0], rawValue[1]);
    } else if (len === 3) {
      gl.uniform3f(location, rawValue[0], rawValue[1], rawValue[2]);
    } else if (len === 4) {
      gl.uniform4f(location, rawValue[0], rawValue[1], rawValue[2], rawValue[3]);
    }
    return -1;
  }
  
  // Handle Float32Array (vec2/3/4, mat3/4)
  if (rawValue instanceof Float32Array) {
    const len = rawValue.length;
    if (len === 2) {
      gl.uniform2fv(location, rawValue);
    } else if (len === 3) {
      gl.uniform3fv(location, rawValue);
    } else if (len === 4) {
      gl.uniform4fv(location, rawValue);
    } else if (len === 9) {
      gl.uniformMatrix3fv(location, false, rawValue);
    } else if (len === 16) {
      gl.uniformMatrix4fv(location, false, rawValue);
    }
    return -1;
  }
  
  // Handle Int32Array (ivec2/3/4)
  if (rawValue instanceof Int32Array) {
    const len = rawValue.length;
    if (len === 2) {
      gl.uniform2iv(location, rawValue);
    } else if (len === 3) {
      gl.uniform3iv(location, rawValue);
    } else if (len === 4) {
      gl.uniform4iv(location, rawValue);
    }
    return -1;
  }
  
  return -1;
}

/**
 * Generate GLSL uniform declaration for a given name and value
 * 
 * @param name - Uniform name
 * @param value - Uniform value
 * @returns GLSL uniform declaration string
 */
export function generateUniformDeclaration(name: string, value: UniformRawValue): string {
  const type = detectUniformType(value);
  return `${TYPE_DECLARATIONS[type]} ${name};`;
}

/**
 * Inject custom uniform declarations into shader source
 * 
 * @param shaderSource - GLSL shader source code
 * @param uniforms - Dictionary of uniforms to inject
 * @returns Modified shader source
 */
export function injectCustomUniforms(
  shaderSource: string, 
  uniforms: Record<string, UniformValue>
): string {
  const injections: string[] = [];
  
  for (const [name, value] of Object.entries(uniforms)) {
    // Skip if already declared
    if (hasUniformDeclaration(shaderSource, name)) {
      continue;
    }
    
    // Check if uniform is used in shader
    const usageRegex = new RegExp(`\\b${name}\\b`);
    if (!usageRegex.test(shaderSource)) {
      continue;
    }
    
    const rawValue = unwrapUniformValue(value);
    injections.push(generateUniformDeclaration(name, rawValue));
  }
  
  if (injections.length === 0) {
    return shaderSource;
  }
  
  // Find insertion point
  const lines = shaderSource.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#version') || 
        line.startsWith('precision') ||
        line === '' ||
        line.startsWith('//')) {
      insertIndex = i + 1;
    } else if (!line.startsWith('//') && line.length > 0) {
      break;
    }
  }
  
  const injectionBlock = '\n// Auto-injected custom uniforms\n' + injections.join('\n') + '\n';
  lines.splice(insertIndex, 0, injectionBlock);
  
  return lines.join('\n');
}
