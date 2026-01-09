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

    // Calculate uniform buffer size
    if (Object.keys(this._uniforms).length > 0) {
      this.uniformBufferSize = calculateUniformBufferSize(this._uniforms);
      this.uniformBuffer = device.createBuffer({
        size: this.uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
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

      // Create bind group layout
      const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [];
      const bindGroupEntries: GPUBindGroupEntry[] = [];

      let binding = 0;

      // Add uniform buffer if present
      if (this.uniformBuffer) {
        bindGroupLayoutEntries.push({
          binding: binding,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        });
        bindGroupEntries.push({
          binding: binding,
          resource: { buffer: this.uniformBuffer },
        });
        binding++;
      }

      // Add textures and samplers
      const textures = collectTextureBindings(this._uniforms);
      for (const [name, { texture, sampler }] of textures) {
        // Add texture binding
        bindGroupLayoutEntries.push({
          binding: binding,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" },
        });
        bindGroupEntries.push({
          binding: binding,
          resource: texture.createView(),
        });
        binding++;

        // Add sampler binding
        if (sampler) {
          bindGroupLayoutEntries.push({
            binding: binding,
            visibility: GPUShaderStage.COMPUTE,
            sampler: { type: "filtering" },
          });
          bindGroupEntries.push({
            binding: binding,
            resource: sampler,
          });
          binding++;
        }
      }

      // Add storage buffers
      for (const [name, buffer] of this.storageBuffers) {
        bindGroupLayoutEntries.push({
          binding: binding,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        });
        bindGroupEntries.push({
          binding: binding,
          resource: { buffer: buffer.gpuBuffer },
        });
        binding++;
      }

      // Create bind group layout for globals (group 0)
      const globalsBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" },
          },
        ],
      });

      // Create user bind group layout (group 1)
      const userBindGroupLayout = bindGroupLayoutEntries.length > 0
        ? this.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        : null;

      // Create user bind group
      if (userBindGroupLayout && bindGroupEntries.length > 0) {
        this.bindGroup = this.device.createBindGroup({
          layout: userBindGroupLayout,
          entries: bindGroupEntries,
        });
      }

      // Create pipeline layout
      const layouts = [globalsBindGroupLayout];
      if (userBindGroupLayout) {
        layouts.push(userBindGroupLayout);
      }

      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: layouts,
      });

      // Create compute pipeline
      this.pipeline = this.device.createComputePipeline({
        layout: pipelineLayout,
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
      throw new ShaderCompileError(
        (error as Error).message,
        0,
        0,
        fullWGSL
      );
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

    // Bind globals (group 0)
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

    // Bind user uniforms (group 1)
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
