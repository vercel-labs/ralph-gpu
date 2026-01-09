/**
 * Material for custom geometry rendering
 */

import type { MaterialOptions, Uniforms } from "./types";
import { ShaderCompileError } from "./errors";
import {
  getGlobalsWGSL,
  calculateUniformBufferSize,
  updateUniformBuffer,
  getBlendState,
  collectTextureBindings,
} from "./uniforms";
import type { StorageBuffer } from "./storage";

/**
 * Material class
 */
export class Material {
  private device: GPUDevice;
  private wgsl: string;
  private _uniforms: Uniforms;
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBufferSize = 0;
  private bindGroup: GPUBindGroup | null = null;
  private storageBuffers = new Map<string, StorageBuffer>();
  private globalsBuffer: GPUBuffer;
  private blendMode: MaterialOptions["blend"];
  private vertexCount: number;
  private instances: number;
  private needsRebuild = true;
  private context: import("./context").GPUContext;

  constructor(
    device: GPUDevice,
    wgsl: string,
    globalsBuffer: GPUBuffer,
    context: import("./context").GPUContext,
    options: MaterialOptions = {}
  ) {
    this.device = device;
    this.wgsl = wgsl;
    this._uniforms = options.uniforms || {};
    this.globalsBuffer = globalsBuffer;
    this.blendMode = options.blend;
    this.vertexCount = options.vertexCount || 3;
    this.instances = options.instances || 1;
    this.context = context;

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
   * Build the render pipeline (lazy)
   */
  private buildPipeline(format: GPUTextureFormat): void {
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
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
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
          visibility: GPUShaderStage.FRAGMENT,
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
            visibility: GPUShaderStage.FRAGMENT,
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
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
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
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
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

      // Create render pipeline
      const blendState = getBlendState(this.blendMode);

      this.pipeline = this.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: "vs_main",
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [
            {
              format,
              blend: blendState,
            },
          ],
        },
        primitive: {
          topology: "triangle-list",
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
   * Simple draw method (user-facing API)
   */
  draw(): void {
    this.context.drawMaterial(this);
  }

  /**
   * Internal draw method used by context
   */
  drawInternal(
    commandEncoder: GPUCommandEncoder,
    renderPassDescriptor: GPURenderPassDescriptor,
    format: GPUTextureFormat
  ): void {
    // Build pipeline if needed
    if (!this.pipeline || this.needsRebuild) {
      this.buildPipeline(format);
    }

    if (!this.pipeline) {
      throw new Error("Failed to create pipeline");
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

    // Create render pass
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
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

    // Draw instances
    passEncoder.draw(this.vertexCount, this.instances, 0, 0);
    passEncoder.end();
  }

  /**
   * Dispose the material
   */
  dispose(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
  }
}
