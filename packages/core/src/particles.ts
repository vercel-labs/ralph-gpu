/**
 * Particles helper - instanced quads with full shader control
 */

import type { ParticlesOptions } from "./types";
import type { GPUContext } from "./context";
import type { Material } from "./material";
import type { StorageBuffer } from "./storage";

/**
 * Quad helper functions injected into shader
 * - quadOffset(vid): returns quad corner position (-0.5 to 0.5)
 * - quadUV(vid): returns UV coordinates (0 to 1)
 */
const QUAD_HELPERS = /* wgsl */ `
fn quadOffset(vid: u32) -> vec2f {
  // 2 triangles: 0,1,2 and 3,4,5
  // Positions: BL, BR, TL, TL, BR, TR
  let x = select(-0.5, 0.5, vid == 1u || vid == 4u || vid == 5u);
  let y = select(-0.5, 0.5, vid == 2u || vid == 3u || vid == 5u);
  return vec2f(x, y);
}

fn quadUV(vid: u32) -> vec2f {
  let x = select(0.0, 1.0, vid == 1u || vid == 4u || vid == 5u);
  let y = select(0.0, 1.0, vid == 2u || vid == 3u || vid == 5u);
  return vec2f(x, y);
}
`;

/**
 * Particles class - minimal instanced quad rendering with full shader control
 * 
 * User provides:
 * - Particle struct layout (any data they want)
 * - Vertex shader (position, size, rotation, etc.)
 * - Fragment shader (shape via SDF, color, effects, etc.)
 * 
 * Helper provides:
 * - Quad vertex generation (6 vertices per instance)
 * - Built-in quadOffset() and quadUV() functions
 * - Storage buffer at @group(1) @binding(0)
 * - Instancing setup
 */
export class Particles {
  private material: Material;
  private buffer: StorageBuffer;

  constructor(
    ctx: GPUContext,
    count: number,
    options: ParticlesOptions
  ) {
    // Create storage buffer for particle data
    this.buffer = ctx.storage(options.bufferSize);

    // Inject quad helpers before user shader
    const fullShader = QUAD_HELPERS + "\n" + options.shader;

    // Create material with instancing (6 vertices = 2 triangles per quad)
    this.material = ctx.material(fullShader, {
      vertexCount: 6,
      instances: count,
      blend: options.blend ?? "alpha",
    });

    // Bind storage buffer - user declares it as @group(1) @binding(0) var<storage, read> particles
    this.material.storage("particles", this.buffer);
  }

  /**
   * Write particle data to the storage buffer
   */
  write(data: Float32Array | Uint32Array): void {
    this.buffer.write(data);
  }

  /**
   * Draw all particles
   */
  draw(): void {
    this.material.draw();
  }

  /**
   * Get the underlying storage buffer (for compute shader updates)
   */
  get storageBuffer(): StorageBuffer {
    return this.buffer;
  }

  /**
   * Get the underlying material (for advanced usage)
   */
  get underlyingMaterial(): Material {
    return this.material;
  }
}
