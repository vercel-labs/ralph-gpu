/**
 * Fullscreen shader pass
 */

import type { PassOptions, Uniforms, SimpleUniforms, BlendMode, BlendConfig } from "./types";
import { ShaderCompileError } from "./errors";
import {
  getGlobalsWGSL,
  calculateUniformBufferSize,
  updateUniformBuffer,
  getBlendState,
  collectTextureBindings,
  parseBindGroup1Bindings,
  hasManualBindings,
  generateUniformsWGSL,
  calculateSimpleUniformBufferSize,
  updateSimpleUniformBuffer,
  collectSimpleTextureBindings,
  type GeneratedBindings,
  type WGSLBindings,
} from "./uniforms";
import type { StorageBuffer } from "./storage";
import { generateEventId } from "./events";
import type { DrawEvent } from "./events";
import { RenderTarget } from "./target";
import { MultiRenderTarget } from "./mrt";

/**
 * Fullscreen pass class
 * 
 * Supports two API modes:
 * 
 * 1. **Simple mode** (recommended): Just pass plain values, WGSL bindings auto-generated
 *    ```typescript
 *    ctx.pass(`@fragment fn main(...) { ... }`, {
 *      uTexture: someTarget,
 *      color: [1, 0, 0],
      radius: 0.5,
    });
 *    ```
 * 
 * 2. **Manual mode**: Write your own @group(1) @binding() declarations
 *    ```typescript
 *    ctx.pass(`
      @group(1) @binding(0) var uTexture: texture_2d<f32>;
      @group(1) @binding(1) var uTextureSampler: sampler;
      struct Params { color: vec3f, radius: f32, }
      @group(1) @binding(2) var<uniform> params: Params;
 *      @fragment fn main(...) { ... }
    `, { uniforms: { uTexture: { value: someTarget }, ... } });
 *    ```
 */
export class Pass {
  private device: GPUDevice;
  private userFragmentWGSL: string;   // Original user shader
  private fragmentWGSL: string;        // Final shader with generated bindings
  private _uniforms: Uniforms;         // Internal format with { value: T }
  private _simpleUniforms: SimpleUniforms | null = null; // Simple format for auto mode
  private useSimpleMode = false;
  private generatedBindings: GeneratedBindings | null = null;
  private pipelines = new Map<string, GPURenderPipeline>();
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBufferSize = 0;
  private storageBuffers = new Map<string, StorageBuffer>();
  private globalsBuffer: GPUBuffer;
  private blendMode: PassOptions["blend"];
  private context: import("./context").GPUContext;
  private usesGlobals: boolean;

  constructor(
    device: GPUDevice,
    fragmentWGSL: string,
    globalsBuffer: GPUBuffer,
    context: import("./context").GPUContext,
    options: PassOptions = {},
    simpleUniforms?: SimpleUniforms
  ) {
    this.device = device;
    this.userFragmentWGSL = fragmentWGSL;
    this.globalsBuffer = globalsBuffer;
    this.blendMode = options.blend;
    this.context = context;
    
    // Detect if shader uses globals (references globals. anywhere)
    this.usesGlobals = /\bglobals\.\w+/.test(fragmentWGSL);

    // Detect which mode to use
    if (simpleUniforms && !hasManualBindings(fragmentWGSL)) {
      // Simple mode: auto-generate WGSL bindings
      this.useSimpleMode = true;
      this._simpleUniforms = simpleUniforms;
      this.generatedBindings = generateUniformsWGSL(simpleUniforms);
      
      // Prepend generated declarations to user shader
      this.fragmentWGSL = this.generatedBindings.wgsl + "\n\n" + fragmentWGSL;
      
      // Convert to internal format for compatibility
      this._uniforms = {};
      for (const [key, value] of Object.entries(simpleUniforms)) {
        this._uniforms[key] = { value };
      }
      
      // Calculate buffer size from simple uniforms
      this.uniformBufferSize = calculateSimpleUniformBufferSize(simpleUniforms);
      if (this.uniformBufferSize > 0) {
        this.uniformBuffer = device.createBuffer({
          size: this.uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
      }
    } else {
      // Manual mode: user writes their own bindings
      this.useSimpleMode = false;
      this.fragmentWGSL = fragmentWGSL;
      this._uniforms = options.uniforms || {};

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
  }

  /**
   * Get the uniforms object (internal format with { value: T })
   * For simple mode, use pass.set() instead
   */
  get uniforms(): Uniforms {
    return this._uniforms;
  }

  /**
   * Set a uniform value (works in both modes)
   */
  set(name: string, value: any): void {
    if (this.useSimpleMode && this._simpleUniforms) {
      this._simpleUniforms[name] = value;
    }
    if (this._uniforms[name]) {
      this._uniforms[name].value = value;
    } else {
      this._uniforms[name] = { value };
    }
  }

  /**
   * Get or build pipeline for a specific format
   */
  private getPipeline(format: GPUTextureFormat): GPURenderPipeline {
    if (this.pipelines.has(format)) {
      return this.pipelines.get(format)!;
    }

    // Create fullscreen quad vertex shader
    // Only include globals if shader uses them to avoid WebGPU validation errors
    const globalsWGSL = this.usesGlobals ? getGlobalsWGSL() : '';
    const vertexWGSL = `
${globalsWGSL}

struct VertexOutput {
  @builtin(position) position: vec4f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
  );
  
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return output;
}
`;

    // Only prepend globals to fragment shader if used
    const fullFragmentWGSL = `
${globalsWGSL}
${this.fragmentWGSL}
`;

    try {
      // Create shader modules
      const vertexModule = this.device.createShaderModule({
        code: vertexWGSL,
      });

      const fragmentModule = this.device.createShaderModule({
        code: fullFragmentWGSL,
      });

      // Check for compilation errors
      const fragmentInfo = fragmentModule.getCompilationInfo();
      fragmentInfo.then((info) => {
        for (const message of info.messages) {
          if (message.type === "error") {
            throw new ShaderCompileError(
              message.message,
              message.lineNum,
              message.linePos,
              fullFragmentWGSL
            );
          }
        }
      });

      // Create render pipeline with auto layout
      const blendState = getBlendState(this.blendMode);
      
      const pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: vertexModule,
          entryPoint: "main",
        },
        fragment: {
          module: fragmentModule,
          entryPoint: "main",
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

      this.pipelines.set(format, pipeline);
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
    this.pipelines.clear(); // Rebuild pipelines as layout might change (storage buffers)
  }

  /**
   * Simple draw method (user-facing API)
   */
  draw(): void {
    this.context.drawPass(this);
  }

  /**
   * Internal draw method used by context
   */
  drawInternal(
    commandEncoder: GPUCommandEncoder,
    renderPassDescriptor: GPURenderPassDescriptor,
    format: GPUTextureFormat
  ): void {
    const currentTarget = this.context.getTarget();
    let targetType: "screen" | "texture" = "screen";
    let targetWidth = this.context.width;
    let targetHeight = this.context.height;

    if (currentTarget instanceof RenderTarget) {
      targetType = "texture";
      targetWidth = currentTarget.width;
      targetHeight = currentTarget.height;
    } else if (currentTarget instanceof MultiRenderTarget) {
      targetType = "texture";
      targetWidth = currentTarget.width;
      targetHeight = currentTarget.height;
    }

    // Emit draw start event
    const startEvent: DrawEvent = {
      type: "draw",
      phase: "start",
      timestamp: performance.now(),
      id: generateEventId(),
      source: "pass",
      vertexCount: 6,
      instanceCount: 1,
      topology: "triangle-list",
      target: targetType,
      targetSize: [targetWidth, targetHeight],
    };
    this.context.emitEvent(startEvent);

    const pipeline = this.getPipeline(format);

    // Update uniforms based on mode
    if (this.uniformBuffer && this.uniformBufferSize > 0) {
      if (this.useSimpleMode && this._simpleUniforms) {
        updateSimpleUniformBuffer(
          this.device,
          this.uniformBuffer,
          this._simpleUniforms,
          this.uniformBufferSize
        );
      } else {
        updateUniformBuffer(
          this.device,
          this.uniformBuffer,
          this._uniforms,
          this.uniformBufferSize
        );
      }
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

    // Bind user uniforms (group 1)
    // Use generated bindings for simple mode, parse for manual mode
    const bindings: WGSLBindings = this.useSimpleMode && this.generatedBindings 
      ? this.generatedBindings.bindings 
      : parseBindGroup1Bindings(this.fragmentWGSL);
    
    const bindGroupEntries: GPUBindGroupEntry[] = [];

    // Add uniform buffer if present and used
    if (this.uniformBuffer && bindings.uniformBuffer !== undefined) {
      bindGroupEntries.push({
        binding: bindings.uniformBuffer,
        resource: { buffer: this.uniformBuffer },
      });
    }

    // Add textures and samplers
    const textures = this.useSimpleMode && this._simpleUniforms
      ? collectSimpleTextureBindings(this._simpleUniforms)
      : collectTextureBindings(this._uniforms);
    
    for (const [name, { texture, sampler }] of textures) {
      // Check for storage texture first (for write operations)
      const storageBinding = bindings.storageTextures.get(name);
      if (storageBinding !== undefined) {
        // Storage textures don't use samplers
        bindGroupEntries.push({
          binding: storageBinding,
          resource: texture.createView(),
        });
        continue;
      }
      
      // Find regular texture binding
      const textureBinding = bindings.textures.get(name);
      if (textureBinding !== undefined) {
        bindGroupEntries.push({
          binding: textureBinding,
          resource: texture.createView(),
        });

        // Add sampler binding if present (optional for textureLoad)
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
            console.warn(`[ralph-gpu] Sampler provided for texture '${name}' but could not find matching sampler binding in shader.`);
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
      const userBindGroupLayout = pipeline.getBindGroupLayout(1);
      const bindGroup = this.device.createBindGroup({
        layout: userBindGroupLayout,
        entries: bindGroupEntries,
      });
      passEncoder.setBindGroup(1, bindGroup);
    }

    // Draw fullscreen quad
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();

    // Emit draw end event
    const endEvent: DrawEvent = {
      type: "draw",
      phase: "end",
      timestamp: performance.now(),
      id: generateEventId(),
      source: "pass",
      vertexCount: 6,
      instanceCount: 1,
      topology: "triangle-list",
      target: targetType,
      targetSize: [targetWidth, targetHeight],
    };
    this.context.emitEvent(endEvent);
  }

  /**
   * Dispose the pass
   */
  dispose(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
  }
}
