/**
 * Uniform buffer management
 */

import type { Uniforms, GlobalUniforms, BlendMode, BlendConfig } from "./types";

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
    if (len === 3) return 16; // vec3f (aligned to 16 bytes)
    if (len === 4) return 16; // vec4f
    if (len === 9) return 48; // mat3x3f (3 vec4s with padding)
    if (len === 16) return 64; // mat4x4f
  }
  return 0;
}

/**
 * Calculate total uniform buffer size with alignment
 */
export function calculateUniformBufferSize(uniforms: Uniforms): number {
  let size = 0;
  for (const key in uniforms) {
    const value = uniforms[key].value;
    const valueSize = getUniformSize(value);
    // Align to 16 bytes for struct members
    size = Math.ceil(size / 16) * 16;
    size += valueSize;
  }
  // Final alignment to 16 bytes
  return Math.ceil(size / 16) * 16;
}

/**
 * Write uniform data to a buffer
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
      return 16; // vec3 aligned to 16 bytes
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
 * Update uniform buffer from uniforms object
 */
export function updateUniformBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  uniforms: Uniforms,
  bufferSize: number
): void {
  const data = new Float32Array(bufferSize / 4);
  let offset = 0;

  for (const key in uniforms) {
    const value = uniforms[key].value;
    // Align to 16 bytes
    offset = Math.ceil(offset / 16) * 16;
    const written = writeUniformData(data, offset, value);
    offset += written;
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
      // Check if it's a RenderTarget
      else if ("texture" in value && "sampler" in value) {
        textures.set(key, {
          texture: value.texture,
          sampler: value.sampler,
        });
      }
    }
  }
  
  return textures;
}
