/**
 * Transpiler - WGSL to GLSL ES 3.0 converter
 * 
 * Converts WGSL shader code to GLSL ES 3.0 for WebGL 2.0 compatibility.
 * Uses regex-based parsing for common patterns to keep bundle size small.
 * 
 * NOTE: This is a basic transpiler for simple shaders.
 * Complex WGSL features may not be fully supported.
 * For complex shaders, consider writing GLSL directly.
 * 
 * Supported conversions:
 * - Type mappings (f32→float, vec3f→vec3, etc.)
 * - Entry points (@fragment/@vertex)
 * - Bind groups to uniforms
 * - Builtin variables (@builtin)
 * - Basic struct definitions
 */

/**
 * Result of transpilation
 */
export interface TranspileResult {
  /** Generated GLSL code */
  glsl: string
  
  /** Extracted uniform information */
  uniforms: UniformDeclaration[]
  
  /** Extracted attribute information (for vertex shaders) */
  attributes: AttributeDeclaration[]
  
  /** Any warnings generated during transpilation */
  warnings: string[]
}

export interface UniformDeclaration {
  name: string
  type: string
  group: number
  binding: number
}

export interface AttributeDeclaration {
  name: string
  type: string
  location: number
}

/**
 * Type mapping from WGSL to GLSL
 */
const TYPE_MAP: Record<string, string> = {
  'f32': 'float',
  'i32': 'int',
  'u32': 'uint',
  'bool': 'bool',
  'vec2f': 'vec2',
  'vec3f': 'vec3',
  'vec4f': 'vec4',
  'vec2i': 'ivec2',
  'vec3i': 'ivec3',
  'vec4i': 'ivec4',
  'vec2u': 'uvec2',
  'vec3u': 'uvec3',
  'vec4u': 'uvec4',
  'vec2<f32>': 'vec2',
  'vec3<f32>': 'vec3',
  'vec4<f32>': 'vec4',
  'mat2x2f': 'mat2',
  'mat3x3f': 'mat3',
  'mat4x4f': 'mat4',
  'mat2x2<f32>': 'mat2',
  'mat3x3<f32>': 'mat3',
  'mat4x4<f32>': 'mat4',
  'texture_2d<f32>': 'sampler2D',
  'sampler': '', // Handled separately
}

/**
 * Builtin variable mapping from WGSL to GLSL
 */
const BUILTIN_MAP: Record<string, string> = {
  'position': 'gl_Position',
  'vertex_index': 'gl_VertexID',
  'instance_index': 'gl_InstanceID',
  'frag_coord': 'gl_FragCoord',
  'front_facing': 'gl_FrontFacing',
}

/**
 * Transpile WGSL shader to GLSL ES 3.0
 * 
 * @param wgsl - WGSL shader source
 * @param type - Shader type ('vertex' or 'fragment')
 * @returns Transpiled GLSL and metadata
 */
export function transpileWGSL(wgsl: string, type: 'vertex' | 'fragment'): TranspileResult {
  const warnings: string[] = []
  const uniforms: UniformDeclaration[] = []
  const attributes: AttributeDeclaration[] = []
  
  let glsl = wgsl
  
  // TODO: Implement transpilation
  // 1. Convert types (f32 → float, etc.)
  // 2. Extract and convert @group/@binding declarations
  // 3. Convert @fragment/@vertex entry points
  // 4. Convert @builtin variables
  // 5. Convert struct definitions
  // 6. Add #version 300 es header
  // 7. Add precision qualifiers
  
  // For now, return a placeholder that compiles
  if (type === 'fragment') {
    glsl = `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta = WGSL not yet transpiled
}
`
  } else {
    glsl = `#version 300 es
precision highp float;

void main() {
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}
`
  }
  
  warnings.push('WGSL transpiler not yet implemented - using placeholder shader')
  
  return {
    glsl,
    uniforms,
    attributes,
    warnings,
  }
}

/**
 * Convert WGSL type to GLSL type
 */
export function convertType(wgslType: string): string {
  return TYPE_MAP[wgslType] ?? wgslType
}

/**
 * Convert builtin variable name
 */
export function convertBuiltin(wgslBuiltin: string): string {
  return BUILTIN_MAP[wgslBuiltin] ?? wgslBuiltin
}
