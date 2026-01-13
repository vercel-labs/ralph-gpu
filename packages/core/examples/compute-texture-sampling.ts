/**
 * Example: Compute Shader with Texture Sampling
 * 
 * Demonstrates:
 * - Sampling from textures in compute shaders
 * - Custom sampler creation
 * - Storage texture write operations
 * - textureLoad without samplers
 */

import { gpu } from "../src/index";

async function init() {
  const canvas = document.querySelector("canvas")!;
  const ctx = await gpu.init(canvas, { autoResize: true });

  // Create custom samplers for different effects
  const linearClamp = ctx.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const nearestRepeat = ctx.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
    addressModeU: "repeat",
    addressModeV: "repeat",
  });

  // Create input texture (render something to it first)
  const inputTarget = ctx.target(512, 512, {
    format: "rgba16float",
    filter: "linear",
  });

  // Create storage texture for compute write operations
  const outputTarget = ctx.target(512, 512, {
    format: "rgba16float",
    usage: "storage", // Enable write operations in compute shaders
  });

  // Example 1: Compute shader with texture sampling
  const blurCompute = ctx.compute(
    /* wgsl */ `
    @group(1) @binding(0) var inputTex: texture_2d<f32>;
    @group(1) @binding(1) var inputSampler: sampler;
    @group(1) @binding(2) var output: texture_storage_2d<rgba16float, write>;
    
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let resolution = vec2f(512.0, 512.0);
      let uv = vec2f(id.xy) / resolution;
      
      // Sample with blur offset
      let offset = 1.0 / resolution;
      var color = vec4f(0.0);
      
      // 3x3 box blur
      for (var x = -1; x <= 1; x++) {
        for (var y = -1; y <= 1; y++) {
          let sampleUV = uv + vec2f(f32(x), f32(y)) * offset;
          color += textureSampleLevel(inputTex, inputSampler, sampleUV, 0.0);
        }
      }
      color /= 9.0;
      
      // Write to storage texture
      textureStore(output, id.xy, color);
    }
  `,
    {
      uniforms: {
        inputTex: { value: inputTarget },
        inputSampler: { value: linearClamp }, // Use custom sampler
        output: { value: outputTarget },
      },
    }
  );

  // Example 2: textureLoad without sampler (direct pixel access)
  const copyCompute = ctx.compute(
    /* wgsl */ `
    @group(1) @binding(0) var sourceTex: texture_2d<f32>;
    @group(1) @binding(1) var destTex: texture_storage_2d<rgba16float, write>;
    
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      // textureLoad doesn't need a sampler - direct pixel access
      let color = textureLoad(sourceTex, vec2i(id.xy), 0);
      textureStore(destTex, id.xy, color);
    }
  `,
    {
      uniforms: {
        sourceTex: { value: inputTarget.texture }, // Just texture, no sampler
        destTex: { value: outputTarget },
      },
    }
  );

  // Example 3: Multiple textures with different samplers
  const multiTextureTarget = ctx.target(512, 512, { usage: "storage" });
  
  const combineCompute = ctx.compute(
    /* wgsl */ `
    @group(1) @binding(0) var tex1: texture_2d<f32>;
    @group(1) @binding(1) var tex1Sampler: sampler;
    @group(1) @binding(2) var tex2: texture_2d<f32>;
    @group(1) @binding(3) var tex2Sampler: sampler;
    @group(1) @binding(4) var output: texture_storage_2d<rgba16float, write>;
    
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let uv = vec2f(id.xy) / 512.0;
      
      // Sample both textures with different filtering
      let color1 = textureSampleLevel(tex1, tex1Sampler, uv, 0.0);
      let color2 = textureSampleLevel(tex2, tex2Sampler, uv, 0.0);
      
      // Combine
      let result = mix(color1, color2, 0.5);
      textureStore(output, id.xy, result);
    }
  `,
    {
      uniforms: {
        tex1: { value: inputTarget.texture },
        tex1Sampler: { value: linearClamp },
        tex2: { value: outputTarget.texture },
        tex2Sampler: { value: nearestRepeat },
        output: { value: multiTextureTarget },
      },
    }
  );

  // Dispatch compute shaders
  function frame() {
    // Run blur
    blurCompute.dispatch(512 / 8, 512 / 8);

    // Copy result
    copyCompute.dispatch(512 / 8, 512 / 8);

    // Combine
    combineCompute.dispatch(512 / 8, 512 / 8);

    requestAnimationFrame(frame);
  }

  frame();
}

init();
