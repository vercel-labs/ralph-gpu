"use client";

import { useEffect, useRef } from "react";
import { useControls } from "leva";
import {
  gpu,
  GPUContext,
  Pass,
  RenderTarget,
  ComputeShader,
} from "ralph-gpu";

/**
 * Example: Storage Texture with Compute Shader
 * 
 * Demonstrates:
 * - Creating render targets with usage: "storage"
 * - Writing to textures from compute shaders using textureStore()
 * - Reading from textures using textureSampleLevel()
 * - Image processing effects in compute shaders
 */

export default function StorageTexturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessRef = useRef(1.5);
  const blurRadiusRef = useRef(2.0);

  // Leva controls
  useControls({
    brightness: {
      value: 1.5,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      label: "Brightness",
      onChange: (v) => {
        brightnessRef.current = v;
      },
    },
    blurRadius: {
      value: 2.0,
      min: 0.0,
      max: 5.0,
      step: 0.5,
      label: "Blur Radius",
      onChange: (v) => {
        blurRadiusRef.current = v;
      },
    },
  });

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    // Resources
    let sourceTarget: RenderTarget;
    let processedTarget: RenderTarget;
    let sourcePass: Pass;
    let processCompute: ComputeShader;
    let displayPass: Pass;

    async function init() {
      if (!canvasRef.current) return;

      if (!gpu.isSupported()) {
        console.error("WebGPU is not supported");
        return;
      }

      ctx = await gpu.init(canvasRef.current, {
        autoResize: true,
      });

      if (disposed) {
        ctx.dispose();
        return;
      }

      // Create source texture (512x512)
      sourceTarget = ctx.target(512, 512, {
        format: "rgba16float",
      });

      // Create storage texture for compute shader writes
      processedTarget = ctx.target(512, 512, {
        format: "rgba16float",
        usage: "storage", // Enable textureStore() in compute shaders
      });

      // Create animated pattern on source texture
      sourcePass = ctx.pass(
        /* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          
          // Animated wave pattern
          let t = globals.time;
          let wave1 = sin(uv.x * 10.0 + t * 2.0) * 0.5 + 0.5;
          let wave2 = sin(uv.y * 10.0 - t * 1.5) * 0.5 + 0.5;
          let pattern = wave1 * wave2;
          
          // Rainbow color
          let hue = uv.x + t * 0.1;
          let color = vec3f(
            sin(hue * 6.28) * 0.5 + 0.5,
            sin((hue + 0.33) * 6.28) * 0.5 + 0.5,
            sin((hue + 0.66) * 6.28) * 0.5 + 0.5
          );
          
          return vec4f(color * pattern, 1.0);
        }
      `
      );

      // Compute shader that processes the texture
      const computeUniforms = {
        sourceTex: { value: sourceTarget },
        outputTex: { value: processedTarget },
        brightness: { value: brightnessRef.current },
        blurRadius: { value: blurRadiusRef.current },
      };

      processCompute = ctx.compute(
        /* wgsl */ `
        struct Params {
          brightness: f32,
          blurRadius: f32,
        }
        @group(1) @binding(0) var<uniform> u: Params;
        @group(1) @binding(1) var sourceTex: texture_2d<f32>;
        @group(1) @binding(2) var sourceSampler: sampler;
        @group(1) @binding(3) var outputTex: texture_storage_2d<rgba16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let resolution = vec2f(512.0, 512.0);
          let uv = vec2f(id.xy) / resolution;
          
          // Apply blur by sampling neighbors
          var color = vec4f(0.0);
          let radius = i32(u.blurRadius);
          var samples = 0.0;
          
          for (var x = -radius; x <= radius; x++) {
            for (var y = -radius; y <= radius; y++) {
              let offset = vec2f(f32(x), f32(y)) / resolution;
              color += textureSampleLevel(sourceTex, sourceSampler, uv + offset, 0.0);
              samples += 1.0;
            }
          }
          
          color /= samples;
          
          // Apply brightness
          color *= u.brightness;
          
          // Write to storage texture
          textureStore(outputTex, id.xy, color);
        }
      `,
        { uniforms: computeUniforms }
      );

      // Display the processed texture
      displayPass = ctx.pass(
        /* wgsl */ `
        @group(1) @binding(0) var displayTex: texture_2d<f32>;
        @group(1) @binding(1) var displaySampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return textureSample(displayTex, displaySampler, uv);
        }
      `,
        {
          uniforms: {
            displayTex: { value: processedTarget },
          },
        }
      );

      // Render loop
      function frame() {
        if (disposed || !ctx) return;

        // Update uniforms
        computeUniforms.brightness.value = brightnessRef.current;
        computeUniforms.blurRadius.value = blurRadiusRef.current;

        // Step 1: Render animated pattern to source texture
        ctx.setTarget(sourceTarget);
        sourcePass.draw();

        // Step 2: Process with compute shader (read from source, write to processed)
        processCompute.dispatch(512 / 8, 512 / 8);

        // Step 3: Display processed texture on screen
        ctx.setTarget(null);
        displayPass.draw();

        animationId = requestAnimationFrame(frame);
      }
      frame();
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      ctx?.dispose();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">
          Storage Texture Example
        </h1>
        <p className="text-gray-400 text-sm">
          Compute shader reads from a texture, applies blur and brightness, then writes to a storage texture.
        </p>
      </div>
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
