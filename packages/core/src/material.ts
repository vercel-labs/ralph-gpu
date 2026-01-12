/**
 * Material for custom geometry rendering
 */

import type { MaterialOptions, Uniforms, PrimitiveTopology, IndexFormat } from "./types";
import { ShaderCompileError } from "./errors";
import {
  getGlobalsWGSL,
  calculateUniformBufferSize,
  updateUniformBuffer,
  getBlendState,
  collectTextureBindings,
  parseBindGroupBindings,
} from "./uniforms";
import type { StorageBuffer } from "./storage";

/**
 * Material class
 */
export class Material {
  private device: GPUDevice;
  private wgsl: string;
  private _uniforms: Uniforms;
  private pipelines = new Map<string, GPURenderPipeline>();
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBufferSize = 0;
  private storageBuffers = new Map<string, StorageBuffer>();
  private globalsBuffer: GPUBuffer;
  private blendMode: MaterialOptions["blend"];
  private vertexCount: number;
  private instances: number;
  private topology: PrimitiveTopology;
  private context: import("./context").GPUContext;
  private usesGlobals: boolean;
  
  // Index buffer support
  private indexBuffer: StorageBuffer | null = null;
  private indexFormat: GPUIndexFormat = "uint32";
  private indexCount: number = 0;

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
    this.topology = options.topology || "triangle-list";
    this.context = context;
    
    // Detect if shader uses globals (references globals. anywhere)
    this.usesGlobals = /\bglobals\.\w+/.test(wgsl);
    
    // Index buffer support
    if (options.indexBuffer) {
      this.indexBuffer = options.indexBuffer;
      this.indexFormat = options.indexFormat || "uint32";
      this.indexCount = options.indexCount || 0;
    }

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
   * Get or build pipeline for a specific format
   */
  private getPipeline(format: GPUTextureFormat): GPURenderPipeline {
    // Include topology in the cache key to ensure different topologies get different pipelines
    const cacheKey = `${format}:${this.topology}`;
    if (this.pipelines.has(cacheKey)) {
      return this.pipelines.get(cacheKey)!;
    }

    // Only prepend globals to shader if it uses them
    const fullWGSL = this.usesGlobals 
      ? `${getGlobalsWGSL()}\n${this.wgsl}`
      : this.wgsl;

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

      // Create render pipeline with auto layout
      const blendState = getBlendState(this.blendMode);
      
      const pipeline = this.device.createRenderPipeline({
        layout: 'auto',
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
          topology: this.topology,
        },
      });

      this.pipelines.set(cacheKey, pipeline);
      return pipeline;
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
    this.pipelines.clear(); // Rebuild pipelines
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
    const pipeline = this.getPipeline(format);

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
    passEncoder.setPipeline(pipeline);

    // Bind globals (group 0) only if shader uses them
    if (this.usesGlobals) {
      const globalsBindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.globalsBuffer },
          },
        ],
      });
      passEncoder.setBindGroup(0, globalsBindGroup);
    }

    // When usesGlobals is true, user bindings are at group 1
    // When usesGlobals is false, user bindings are at group 0
    const userBindGroupIndex = this.usesGlobals ? 1 : 0;
    
    // Parse bindings from the correct group in the WGSL
    const bindings = parseBindGroupBindings(this.wgsl, userBindGroupIndex);
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
      // Find texture binding
      const textureBinding = bindings.textures.get(name);
      if (textureBinding !== undefined) {
        bindGroupEntries.push({
          binding: textureBinding,
          resource: texture.createView(),
        });

        // Add sampler binding if present
        if (sampler) {
          // Try to find sampler binding by name convention
          let samplerBinding = bindings.samplers.get(`${name}Sampler`);
          if (samplerBinding === undefined) {
            samplerBinding = bindings.samplers.get(`${name}_sampler`);
          }
          if (samplerBinding === undefined && name.endsWith("Tex")) {
            samplerBinding = bindings.samplers.get(`${name.slice(0, -3)}Sampler`);
          }
          
          if (samplerBinding !== undefined) {
            bindGroupEntries.push({
              binding: samplerBinding,
              resource: sampler,
            });
          } else {
            console.warn(`Could not find sampler binding for texture '${name}'. Expected '${name}Sampler', '${name}_sampler', or similar.`);
          }
        }
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

    if (bindGroupEntries.length > 0) {
      const userBindGroupLayout = pipeline.getBindGroupLayout(userBindGroupIndex);
      const bindGroup = this.device.createBindGroup({
        layout: userBindGroupLayout,
        entries: bindGroupEntries,
      });
      passEncoder.setBindGroup(userBindGroupIndex, bindGroup);
    }

    // Draw - use indexed drawing if index buffer is present
    if (this.indexBuffer) {
      passEncoder.setIndexBuffer(this.indexBuffer.gpuBuffer, this.indexFormat);
      passEncoder.drawIndexed(this.indexCount, this.instances, 0, 0, 0);
    } else {
      passEncoder.draw(this.vertexCount, this.instances, 0, 0);
    }
    
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
