/**
 * Uniform buffer management
 */

import type { Uniforms, GlobalUniforms, BlendMode, BlendConfig } from "./types";
import { RenderTarget } from "./target";

/**
 * Global uniforms structure size (in bytes)
 * vec2f (8) + f32 (4) + f32 (4) + u32 (4) + f32 (4) + padding (8) = 32 bytes
 */
export const GLOBALS_BUFFER_SIZE = 32;

/**
 * Create the global uniforms buffer
 */
export function createGlobalsBuffer(device: GPUDevice): GPUBuffer {
  return device.createBuffer({
    size: GLOBALS_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
}

/**
 * Update global uniforms
 */
export function updateGlobalsBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  globals: GlobalUniforms
): void {
  // Create typed array with proper alignment
  const data = new Float32Array(8);
  data[0] = globals.resolution[0]; // vec2f.x
  data[1] = globals.resolution[1]; // vec2f.y
  data[2] = globals.time;          // f32
  data[3] = globals.deltaTime;     // f32
  
  // Frame count needs to be u32, but we store in Float32Array
  const frameView = new Uint32Array(data.buffer, 16, 1);
  frameView[0] = globals.frame;
  
  data[5] = globals.aspect;        // f32
  // data[6] and data[7] are padding

  device.queue.writeBuffer(buffer, 0, data.buffer);
}

/**
 * Get WGSL code for global uniforms struct
 */
export function getGlobalsWGSL(): string {
  return `
struct Globals {
  resolution: vec2f,
  time: f32,
  deltaTime: f32,
  frame: u32,
  aspect: f32,
}
@group(0) @binding(0) var<uniform> globals: Globals;
`;
}

/**
 * Determine the size of a uniform value in bytes
 */
function getUniformSize(value: any): number {
  if (typeof value === "number") return 4; // f32
  if (typeof value === "boolean") return 4; // bool (stored as u32)
  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 2) return 8;  // vec2f
    if (len === 3) return 12; // vec3f (actual size is 12 bytes)
    if (len === 4) return 16; // vec4f
    if (len === 9) return 48; // mat3x3f (3 vec4s with padding)
    if (len === 16) return 64; // mat4x4f
  }
  return 0;
}

/**
 * Determine the alignment of a uniform value in bytes
 * WGSL alignment rules:
 * - f32/u32/i32/bool: 4 bytes
 * - vec2<T>: 8 bytes
 * - vec3<T>/vec4<T>: 16 bytes
 * - matNxM: 16 bytes (column-major, each column is vec4-aligned)
 */
function getUniformAlignment(value: any): number {
  if (typeof value === "number") return 4;  // f32
  if (typeof value === "boolean") return 4; // bool (stored as u32)
  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 2) return 8;   // vec2f - 8-byte alignment
    if (len === 3) return 16;  // vec3f - 16-byte alignment
    if (len === 4) return 16;  // vec4f - 16-byte alignment
    if (len === 9) return 16;  // mat3x3f
    if (len === 16) return 16; // mat4x4f
  }
  return 16; // default to max alignment for safety
}

/**
 * Calculate total uniform buffer size with proper WGSL alignment
 * Skips texture uniforms (they don't go in the uniform buffer)
 */
export function calculateUniformBufferSize(uniforms: Uniforms): number {
  let offset = 0;
  for (const key in uniforms) {
    const value = uniforms[key].value;
    
    // Skip textures and samplers (they have their own bindings)
    if (value && typeof value === "object") {
      if ("createView" in value || "texture" in value) {
        continue; // Skip texture uniforms
      }
    }
    
    const valueSize = getUniformSize(value);
    const alignment = getUniformAlignment(value);
    
    if (valueSize > 0) {
      // Align to the type's required alignment (not always 16!)
      offset = Math.ceil(offset / alignment) * alignment;
      offset += valueSize;
    }
  }
  // Final alignment to 16 bytes (minimum buffer size alignment)
  return offset > 0 ? Math.ceil(offset / 16) * 16 : 0;
}

/**
 * Write uniform data to a buffer
 * Returns the actual size of the data written (not including alignment padding)
 */
export function writeUniformData(
  data: Float32Array,
  offset: number,
  value: any
): number {
  if (typeof value === "number") {
    data[offset / 4] = value;
    return 4;
  }
  if (typeof value === "boolean") {
    const view = new Uint32Array(data.buffer, offset, 1);
    view[0] = value ? 1 : 0;
    return 4;
  }
  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 2) {
      data[offset / 4] = value[0];
      data[offset / 4 + 1] = value[1];
      return 8;
    }
    if (len === 3) {
      data[offset / 4] = value[0];
      data[offset / 4 + 1] = value[1];
      data[offset / 4 + 2] = value[2];
      return 12; // vec3f is 12 bytes (3 floats), alignment handled separately
    }
    if (len === 4) {
      data[offset / 4] = value[0];
      data[offset / 4 + 1] = value[1];
      data[offset / 4 + 2] = value[2];
      data[offset / 4 + 3] = value[3];
      return 16;
    }
  }
  return 0;
}

/**
 * Update uniform buffer from uniforms object with proper WGSL alignment
 * Skips texture uniforms (they don't go in the uniform buffer)
 */
export function updateUniformBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  uniforms: Uniforms,
  bufferSize: number
): void {
  if (bufferSize === 0) return; // No uniform buffer needed
  
  const data = new Float32Array(bufferSize / 4);
  let offset = 0;

  for (const key in uniforms) {
    const value = uniforms[key].value;
    
    // Skip textures and samplers (they have their own bindings)
    if (value && typeof value === "object") {
      if ("createView" in value || "texture" in value) {
        continue; // Skip texture uniforms
      }
    }
    
    const valueSize = getUniformSize(value);
    const alignment = getUniformAlignment(value);
    
    if (valueSize > 0) {
      // Align to the type's required alignment (not always 16!)
      offset = Math.ceil(offset / alignment) * alignment;
      const written = writeUniformData(data, offset, value);
      offset += written;
    }
  }

  device.queue.writeBuffer(buffer, 0, data.buffer);
}

/**
 * Get blend state from blend mode
 */
export function getBlendState(
  blend?: BlendMode | BlendConfig
): GPUBlendState | undefined {
  if (!blend || blend === "none") {
    return undefined;
  }

  if (typeof blend === "object" && "color" in blend) {
    return blend as GPUBlendState;
  }

  const presets: Record<string, GPUBlendState> = {
    alpha: {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
    },
    additive: {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one",
        operation: "add",
      },
    },
    multiply: {
      color: {
        srcFactor: "dst",
        dstFactor: "zero",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "zero",
        operation: "add",
      },
    },
    screen: {
      color: {
        srcFactor: "one",
        dstFactor: "one-minus-src",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
    },
  };

  return presets[blend as string];
}

/**
 * Collect texture and sampler bindings from uniforms
 */
export interface TextureBinding {
  texture: GPUTexture;
  sampler?: GPUSampler;
}

export function collectTextureBindings(uniforms: Uniforms): Map<string, TextureBinding> {
  const textures = new Map<string, TextureBinding>();
  
  for (const [key, uniform] of Object.entries(uniforms)) {
    const value = uniform.value;
    if (value && typeof value === "object") {
      // Check if it's a GPUTexture
      if ("createView" in value && typeof value.createView === "function") {
        textures.set(key, { texture: value as GPUTexture });
      }
      // Check if it's a RenderTarget or similar object with texture/sampler
      else if ("texture" in value) {
         // It might be a RenderTarget or PingPong buffer result
         const texture = value.texture;
         // It might have a sampler
         const sampler = "sampler" in value ? value.sampler : undefined;
         
         textures.set(key, {
           texture,
           sampler
         });
      }
    }
  }
  
  return textures;
}

/**
 * Parsed bindings from WGSL
 */
export interface WGSLBindings {
  uniformBuffer?: number;
  textures: Map<string, number>;
  samplers: Map<string, number>;
  storage: Map<string, number>;
}

/**
 * Parse bindings from WGSL code
 * Looks for @group(1) @binding(N) var...
 */
export function parseBindGroup1Bindings(wgsl: string): WGSLBindings {
  const bindings: WGSLBindings = {
    textures: new Map(),
    samplers: new Map(),
    storage: new Map(),
  };

  // Regex to match group 1 bindings
  // Matches: @group(1) @binding(N) var<type> name : type;
  // OR: @group(1) @binding(N) var name : type;
  const regex = /@group\(1\)\s+@binding\((\d+)\)\s+var(?:<([^>]+)>)?\s+(\w+)\s*:\s*([^;]+);/g;
  
  let match;
  while ((match = regex.exec(wgsl)) !== null) {
    const binding = parseInt(match[1]);
    const varModifier = match[2]; // 'uniform', 'storage', etc.
    const name = match[3];
    const type = match[4].trim();

    if (varModifier === 'uniform') {
      bindings.uniformBuffer = binding;
    } else if (varModifier === 'storage' || type.includes('array<')) {
      // Storage buffer
      bindings.storage.set(name, binding);
    } else if (type.includes('texture_')) {
      // Texture
      bindings.textures.set(name, binding);
    } else if (type.includes('sampler')) {
      // Sampler
      bindings.samplers.set(name, binding);
    }
  }

  return bindings;
}

// ============================================================================
// SIMPLIFIED API - Auto-generate WGSL declarations from uniforms
// ============================================================================

/**
 * Simple uniform types (without { value: T } wrapper)
 */
export type SimpleUniformValue = 
  | number 
  | boolean 
  | [number, number] 
  | [number, number, number] 
  | [number, number, number, number]
  | { texture: GPUTexture; sampler?: GPUSampler }  // RenderTarget-like
  | GPUTexture;

export interface SimpleUniforms {
  [key: string]: SimpleUniformValue;
}

/**
 * Check if shader already has @group(1) bindings (manual mode)
 */
export function hasManualBindings(wgsl: string): boolean {
  return /@group\(1\)\s+@binding/.test(wgsl);
}

/**
 * Infer WGSL type from a JS value
 */
export function inferWGSLType(value: SimpleUniformValue): string | null {
  if (typeof value === "number") return "f32";
  if (typeof value === "boolean") return "u32"; // bool stored as u32
  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 2) return "vec2f";
    if (len === 3) return "vec3f";
    if (len === 4) return "vec4f";
  }
  // Textures return null - they're handled separately
  return null;
}

/**
 * Check if a value is a texture (RenderTarget, PingPong read, or raw GPUTexture)
 */
export function isTextureValue(value: SimpleUniformValue): boolean {
  if (value && typeof value === "object") {
    // Raw GPUTexture
    if ("createView" in value && typeof (value as any).createView === "function") {
      return true;
    }
    // RenderTarget or PingPong read result
    if ("texture" in value) {
      return true;
    }
  }
  return false;
}

/**
 * Generated WGSL bindings info
 */
export interface GeneratedBindings {
  wgsl: string;
  bindings: WGSLBindings;
  scalarUniformNames: string[];
}

/**
 * Generate WGSL declarations from simple uniforms
 * 
 * Example input:
 *   { uTexture: someTarget, color: [1, 0, 0], radius: 0.5 }
 * 
 * Example output WGSL:
 *   @group(1) @binding(0) var uTexture: texture_2d<f32>;
 *   @group(1) @binding(1) var uTextureSampler: sampler;
 *   struct _Uniforms { color: vec3f, radius: f32, }
 *   @group(1) @binding(2) var<uniform> uniforms: _Uniforms;
 */
export function generateUniformsWGSL(simpleUniforms: SimpleUniforms): GeneratedBindings {
  const lines: string[] = [];
  const bindings: WGSLBindings = {
    textures: new Map(),
    samplers: new Map(),
    storage: new Map(),
  };
  const scalarFields: { name: string; type: string }[] = [];
  const scalarUniformNames: string[] = [];
  let bindingIndex = 0;

  // First pass: textures (they need to come before scalar uniforms in bindings)
  for (const [name, value] of Object.entries(simpleUniforms)) {
    if (isTextureValue(value)) {
      // Generate texture binding
      lines.push(`@group(1) @binding(${bindingIndex}) var ${name}: texture_2d<f32>;`);
      bindings.textures.set(name, bindingIndex);
      bindingIndex++;

      // Generate sampler binding
      const samplerName = `${name}Sampler`;
      lines.push(`@group(1) @binding(${bindingIndex}) var ${samplerName}: sampler;`);
      bindings.samplers.set(samplerName, bindingIndex);
      bindingIndex++;
    }
  }

  // Second pass: collect scalar uniforms
  for (const [name, value] of Object.entries(simpleUniforms)) {
    if (!isTextureValue(value)) {
      const wgslType = inferWGSLType(value);
      if (wgslType) {
        scalarFields.push({ name, type: wgslType });
        scalarUniformNames.push(name);
      }
    }
  }

  // Generate uniform struct if there are scalar uniforms
  if (scalarFields.length > 0) {
    lines.push("");
    lines.push("struct _Uniforms {");
    for (const field of scalarFields) {
      lines.push(`  ${field.name}: ${field.type},`);
    }
    lines.push("}");
    lines.push(`@group(1) @binding(${bindingIndex}) var<uniform> uniforms: _Uniforms;`);
    bindings.uniformBuffer = bindingIndex;
  }

  return {
    wgsl: lines.join("\n"),
    bindings,
    scalarUniformNames,
  };
}

/**
 * Convert simple uniforms to the internal Uniforms format (with { value: T } wrapper)
 */
export function convertToInternalUniforms(simpleUniforms: SimpleUniforms): Uniforms {
  const result: Uniforms = {};
  for (const [key, value] of Object.entries(simpleUniforms)) {
    result[key] = { value };
  }
  return result;
}

/**
 * Calculate uniform buffer size from simple uniforms (only scalar values)
 */
export function calculateSimpleUniformBufferSize(simpleUniforms: SimpleUniforms): number {
  let offset = 0;
  
  for (const value of Object.values(simpleUniforms)) {
    // Skip textures
    if (isTextureValue(value)) continue;
    
    const valueSize = getUniformSize(value);
    const alignment = getUniformAlignment(value);
    
    if (valueSize > 0) {
      offset = Math.ceil(offset / alignment) * alignment;
      offset += valueSize;
    }
  }
  
  return offset > 0 ? Math.ceil(offset / 16) * 16 : 0;
}

/**
 * Update uniform buffer from simple uniforms
 */
export function updateSimpleUniformBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  simpleUniforms: SimpleUniforms,
  bufferSize: number
): void {
  if (bufferSize === 0) return;
  
  const data = new Float32Array(bufferSize / 4);
  let offset = 0;

  for (const value of Object.values(simpleUniforms)) {
    // Skip textures
    if (isTextureValue(value)) continue;
    
    const valueSize = getUniformSize(value);
    const alignment = getUniformAlignment(value);
    
    if (valueSize > 0) {
      offset = Math.ceil(offset / alignment) * alignment;
      writeUniformData(data, offset, value);
      offset += valueSize;
    }
  }

  device.queue.writeBuffer(buffer, 0, data.buffer);
}

/**
 * Collect texture bindings from simple uniforms
 */
export function collectSimpleTextureBindings(simpleUniforms: SimpleUniforms): Map<string, TextureBinding> {
  const textures = new Map<string, TextureBinding>();
  
  for (const [key, value] of Object.entries(simpleUniforms)) {
    if (value && typeof value === "object") {
      // Check if it's a GPUTexture
      if ("createView" in value && typeof (value as any).createView === "function") {
        textures.set(key, { texture: value as GPUTexture });
      }
      // Check if it's a RenderTarget or similar object with texture/sampler
      else if ("texture" in value) {
        const texture = (value as any).texture;
        const sampler = "sampler" in value ? (value as any).sampler : undefined;
        textures.set(key, { texture, sampler });
      }
    }
  }
  
  return textures;
}
