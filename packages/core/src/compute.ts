/**
 * Compute shader support
 */

import type { ComputeOptions, Uniforms } from "./types";
import { ShaderCompileError } from "./errors";
import {
  getGlobalsWGSL,
  calculateUniformBufferSize,
  updateUniformBuffer,
  collectTextureBindings,
  parseBindGroup1Bindings,
  validateBindings,
} from "./uniforms";
import type { StorageBuffer } from "./storage";

/**
 * Compute shader class
 */
export class ComputeShader {
  private device: GPUDevice;
  private wgsl: string;
  private _uniforms: Uniforms;
  private pipeline: GPUComputePipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBufferSize = 0;
  private bindGroup: GPUBindGroup | null = null;
  private storageBuffers = new Map<string, StorageBuffer>();
  private globalsBuffer: GPUBuffer;
  private workgroupSize: [number, number, number];
  private needsRebuild = true;
  private usesGlobals = false;

  constructor(
    device: GPUDevice,
    wgsl: string,
    globalsBuffer: GPUBuffer,
    options: ComputeOptions = {}
  ) {
    this.device = device;
    this.wgsl = wgsl;
    this._uniforms = options.uniforms || {};
    this.globalsBuffer = globalsBuffer;
    
    const wg = options.workgroupSize || [1];
    this.workgroupSize = [
      wg[0] || 1,
      wg[1] || 1,
      wg[2] || 1,
    ];

    // Calculate uniform buffer size (excluding textures)
    if (Object.keys(this._uniforms).length > 0) {
      this.uniformBufferSize = calculateUniformBufferSize(this._uniforms);
      if (this.uniformBufferSize > 0) {
        this.uniformBuffer = device.createBuffer({
          size: this.uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
      }
    }
  }

  /**
   * Get the uniforms object
   */
  get uniforms(): Uniforms {
    return this._uniforms;
  }

  /**
   * Build the compute pipeline (lazy)
   */
  private buildPipeline(): void {
    // Check if shader uses globals (references globals. anywhere)
    this.usesGlobals = /\bglobals\.\w+/.test(this.wgsl);
    
    // Prepend globals to shader
    const fullWGSL = `
${getGlobalsWGSL()}
${this.wgsl}
`;

    try {
      // Create shader module
      const shaderModule = this.device.createShaderModule({
        code: fullWGSL,
      });

      // Check for compilation errors
      const shaderInfo = shaderModule.getCompilationInfo();
      shaderInfo.then((info) => {
        for (const message of info.messages) {
          if (message.type === "error") {
            throw new ShaderCompileError(
              message.message,
              message.lineNum,
              message.linePos,
              fullWGSL
            );
          }
        }
      });

      // Parse bindings from WGSL to match layout: 'auto'
      const bindings = parseBindGroup1Bindings(this.wgsl);
      
      // Validate bindings and provide helpful error message if there's a mismatch
      const validationError = validateBindings(
        "compute",
        bindings,
        this._uniforms,
        this.storageBuffers
      );
      if (validationError) {
        console.error(validationError);
        // Continue anyway - WebGPU will provide its own error if bindings are actually wrong
      }
      
      const bindGroupEntries: GPUBindGroupEntry[] = [];

      // Add uniform buffer if present and used
      if (this.uniformBuffer && bindings.uniformBuffer !== undefined) {
        bindGroupEntries.push({
          binding: bindings.uniformBuffer,
          resource: { buffer: this.uniformBuffer },
        });
      }

      // Add textures and samplers
      const textures = collectTextureBindings(this._uniforms);
      for (const [name, { texture, sampler }] of textures) {
        // Check for storage texture first (for write operations)
        const storageBinding = bindings.storageTextures.get(name);
        if (storageBinding !== undefined) {
          // Storage textures don't use samplers
          bindGroupEntries.push({
            binding: storageBinding,
            resource: texture.createView(),
          });
          continue; // Successfully bound as storage texture
        }
        
        // Find regular texture binding
        const textureBinding = bindings.textures.get(name);
        if (textureBinding !== undefined) {
          bindGroupEntries.push({
            binding: textureBinding,
            resource: texture.createView(),
          });

          // Add sampler binding if present
          // Note: sampler is optional - textureLoad() doesn't require one
          if (sampler) {
            // Try to find sampler binding by name convention
            let samplerBinding = bindings.samplers.get(`${name}Sampler`);
            if (samplerBinding === undefined) {
              samplerBinding = bindings.samplers.get(`${name}_sampler`);
            }
            if (samplerBinding === undefined && name.endsWith("Tex")) {
              samplerBinding = bindings.samplers.get(`${name.slice(0, -3)}Sampler`);
            }
            if (samplerBinding === undefined && name.endsWith("Texture")) {
              samplerBinding = bindings.samplers.get(`${name.slice(0, -7)}Sampler`);
            }
            
            if (samplerBinding !== undefined) {
              bindGroupEntries.push({
                binding: samplerBinding,
                resource: sampler,
              });
            }
            // Only warn if shader actually declares the sampler binding
            else if (bindings.samplers.size > 0) {
              console.warn(`[ralph-gpu] Sampler provided for texture '${name}' but could not find matching sampler binding in shader. Expected '${name}Sampler', '${name}_sampler', or similar.`);
            }
          }
        } else {
          // Only warn if not bound as storage texture
          console.warn(`[ralph-gpu] Texture '${name}' provided in uniforms but not found in shader bindings.`);
        }
      }

      // Add storage buffers
      for (const [name, buffer] of this.storageBuffers) {
        const storageBinding = bindings.storage.get(name);
        if (storageBinding !== undefined) {
          bindGroupEntries.push({
            binding: storageBinding,
            resource: { buffer: buffer.gpuBuffer },
          });
        }
      }

      // Add storage textures (for write operations)
      // Storage textures use the same collection as regular textures but bind differently
      for (const [name, { texture }] of textures) {
        const storageBinding = bindings.storageTextures.get(name);
        if (storageBinding !== undefined) {
          // Storage textures don't use samplers
          bindGroupEntries.push({
            binding: storageBinding,
            resource: texture.createView(),
          });
        }
      }

      // Create compute pipeline with auto layout
      this.pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: "main",
        },
      });

      // Create bind groups using auto-generated layouts
      // Group 0: Globals
      
      // Group 1: User uniforms (if any bindings exist)
      if (bindGroupEntries.length > 0) {
        const userBindGroupLayout = this.pipeline.getBindGroupLayout(1);
        this.bindGroup = this.device.createBindGroup({
          layout: userBindGroupLayout,
          entries: bindGroupEntries,
        });
      }

      this.needsRebuild = false;
    } catch (error) {
      if (error instanceof ShaderCompileError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Bind a storage buffer
   */
  storage(name: string, buffer: StorageBuffer): void {
    this.storageBuffers.set(name, buffer);
    this.needsRebuild = true;
  }

  /**
   * Dispatch compute shader
   */
  dispatch(x: number, y = 1, z = 1): void {
    // Build pipeline if needed
    if (!this.pipeline || this.needsRebuild) {
      this.buildPipeline();
    }

    if (!this.pipeline) {
      throw new Error("Failed to create compute pipeline");
    }

    // Update uniforms
    if (this.uniformBuffer && this.uniformBufferSize > 0) {
      updateUniformBuffer(
        this.device,
        this.uniformBuffer,
        this._uniforms,
        this.uniformBufferSize
      );
    }

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(this.pipeline);

    // Bind globals (group 0) only if shader uses them
    if (this.usesGlobals) {
      const globalsBindGroup = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.globalsBuffer },
          },
        ],
      });
      passEncoder.setBindGroup(0, globalsBindGroup);
    }

    // Bind user uniforms (always group 1 since shader uses @group(1))
    if (this.bindGroup) {
      passEncoder.setBindGroup(1, this.bindGroup);
    }

    // Dispatch
    passEncoder.dispatchWorkgroups(x, y, z);
    passEncoder.end();

    // Submit
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Dispose the compute shader
   */
  dispose(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
  }
}
