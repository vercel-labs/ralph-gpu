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
import { generateEventId } from "./events"; // Import generateEventId
import type { ComputeEvent } from "./events"; // Import ComputeEvent type

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
  private storageBuffers = new Map<string, StorageBuffer>();
  private globalsBuffer: GPUBuffer;
  private workgroupSize: [number, number, number];
  private needsRebuild = true;
  private usesGlobals = false;
  private context?: import("./context").GPUContext; // Add context property

  constructor(
    device: GPUDevice,
    wgsl: string,
    globalsBuffer: GPUBuffer,
    context?: import("./context").GPUContext, // Add context parameter
    options: ComputeOptions = {}
  ) {
    this.device = device;
    this.wgsl = wgsl;
    this._uniforms = options.uniforms || {};
    this.globalsBuffer = globalsBuffer;
    this.context = context; // Store context

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

      // Create compute pipeline with auto layout
      this.pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: "main",
        },
      });

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
   * Create bind group with current texture/buffer bindings
   * Called each frame to ensure textures are up-to-date
   */
  private createBindGroup(): GPUBindGroup | null {
    if (!this.pipeline) return null;

    // Parse bindings from shader
    const bindings = parseBindGroup1Bindings(this.wgsl);
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

    // Create bind group if we have any entries
    if (bindGroupEntries.length > 0) {
      const userBindGroupLayout = this.pipeline.getBindGroupLayout(1);
      return this.device.createBindGroup({
        layout: userBindGroupLayout,
        entries: bindGroupEntries,
      });
    }

    return null;
  }

  /**
   * Dispatch compute shader
   */
  dispatch(x: number, y = 1, z = 1): void {
    // Emit compute:start event
    if (this.context) {
      const startEvent: ComputeEvent = {
        type: "compute",
        phase: "start",
        timestamp: performance.now(),
        id: generateEventId(),
        workgroups: [x, y, z],
        workgroupSize: this.workgroupSize,
        totalInvocations: x * y * z * this.workgroupSize[0] * this.workgroupSize[1] * this.workgroupSize[2],
      };
      this.context.emitEvent(startEvent);
    }

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

    // Create and bind user uniforms (group 1) with fresh texture views
    const bindGroup = this.createBindGroup();
    if (bindGroup) {
      passEncoder.setBindGroup(1, bindGroup);
    }

    // Dispatch
    passEncoder.dispatchWorkgroups(x, y, z);
    passEncoder.end();

    // Submit
    this.device.queue.submit([commandEncoder.finish()]);

    // Emit compute:end event
    if (this.context) {
      const endEvent: ComputeEvent = {
        type: "compute",
        phase: "end",
        timestamp: performance.now(),
        id: generateEventId(),
        workgroups: [x, y, z],
        workgroupSize: this.workgroupSize,
        totalInvocations: x * y * z * this.workgroupSize[0] * this.workgroupSize[1] * this.workgroupSize[2],
      };
      this.context.emitEvent(endEvent);
    }
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
