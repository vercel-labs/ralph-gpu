"use client";

import { useEffect, useRef } from "react";
import { useControls } from "leva";
import {
  gpu,
  GPUContext,
  Pass,
  RenderTarget,
  Sampler,
} from "ralph-gpu";

/**
 * Example: Texture Sampling with Custom Samplers
 * 
 * Demonstrates:
 * - Creating custom samplers with ctx.createSampler()
 * - Passing textures and samplers separately to shaders
 * - Different filtering modes (linear vs nearest)
 * - Different wrapping modes (clamp vs repeat vs mirror)
 * - Render target usage
 */

export default function TextureSamplingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterModeRef = useRef<"linear" | "nearest">("linear");
  const wrapModeRef = useRef<"clamp" | "repeat" | "mirror">("repeat");

  // Leva controls
  useControls({
    filterMode: {
      value: "linear",
      options: ["linear", "nearest"],
      label: "Filter Mode",
      onChange: (v) => {
        filterModeRef.current = v as "linear" | "nearest";
      },
    },
    wrapMode: {
      value: "repeat",
      options: ["clamp", "repeat", "mirror"],
      label: "Wrap Mode",
      onChange: (v) => {
        wrapModeRef.current = v as "clamp" | "repeat" | "mirror";
      },
    },
  });

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    // Resources
    let sourceTarget: RenderTarget;
    let displayPass: Pass;
    let patternPass: Pass;
    let linearClampSampler: Sampler;
    let nearestRepeatSampler: Sampler;
    let linearRepeatSampler: Sampler;
    let linearMirrorSampler: Sampler;

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

      // Create custom samplers
      linearClampSampler = ctx.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      nearestRepeatSampler = ctx.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        addressModeU: "repeat",
        addressModeV: "repeat",
      });

      linearRepeatSampler = ctx.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
      });

      linearMirrorSampler = ctx.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "mirror-repeat",
        addressModeV: "mirror-repeat",
      });

      // Create source texture (256x256) with a pattern
      sourceTarget = ctx.target(256, 256, {
        format: "rgba8unorm",
      });

      // Generate pattern on source texture
      patternPass = ctx.pass(
        /* wgsl */ `
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          
          // Create a checkerboard + circle pattern
          let gridSize = 8.0;
          let cellX = floor(uv.x * gridSize);
          let cellY = floor(uv.y * gridSize);
          // WGSL uses % for integers, fract for floats
          let sum = cellX + cellY;
          let checker = fract(sum * 0.5) * 2.0; // 0 or 1
          
          // Add a circle in the center
          let center = length(uv - 0.5);
          let circle = smoothstep(0.3, 0.28, center);
          
          // Combine
          let pattern = mix(checker * 0.3, 1.0, circle);
          
          return vec4f(vec3f(pattern), 1.0);
        }
      `
      );

      // Display pass that samples from the source texture
      const displayUniforms = {
        sourceTex: { value: sourceTarget.texture },
        sourceSampler: { value: linearClampSampler },
      };

      displayPass = ctx.pass(
        /* wgsl */ `
        @group(1) @binding(0) var sourceTex: texture_2d<f32>;
        @group(1) @binding(1) var sourceSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          
          // Scale UV to see tiling/clamping behavior
          let scaledUV = (uv - 0.5) * 3.0 + 0.5;
          
          // Sample with custom sampler
          let color = textureSample(sourceTex, sourceSampler, scaledUV);
          
          // Add grid overlay to show UV space
          let gridWidth = 0.005;
          let grid = step(fract(scaledUV.x * 3.0), gridWidth) + 
                     step(fract(scaledUV.y * 3.0), gridWidth);
          let gridColor = vec3f(0.0, 1.0, 0.5);
          
          return vec4f(mix(color.rgb, gridColor, clamp(grid, 0.0, 1.0) * 0.5), 1.0);
        }
      `,
        { uniforms: displayUniforms }
      );

      // Render loop
      function frame() {
        if (disposed || !ctx) return;

        // Update sampler based on controls
        const filterMode = filterModeRef.current;
        const wrapMode = wrapModeRef.current;

        // Select appropriate sampler
        let selectedSampler: Sampler;
        if (filterMode === "linear" && wrapMode === "clamp") {
          selectedSampler = linearClampSampler;
        } else if (filterMode === "nearest" && wrapMode === "repeat") {
          selectedSampler = nearestRepeatSampler;
        } else if (filterMode === "linear" && wrapMode === "repeat") {
          selectedSampler = linearRepeatSampler;
        } else if (filterMode === "linear" && wrapMode === "mirror") {
          selectedSampler = linearMirrorSampler;
        } else {
          // Fallback
          selectedSampler = linearClampSampler;
        }

        displayUniforms.sourceSampler.value = selectedSampler;

        // Render pattern to source texture
        ctx.setTarget(sourceTarget);
        patternPass.draw();

        // Display with sampling
        ctx.setTarget(null);
        ctx.clear(null, [0, 0, 0, 1]);
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
          Texture Sampling with Custom Samplers
        </h1>
        <p className="text-gray-400 text-sm">
          Use Leva controls to change filter and wrap modes. The green grid shows UV space (3x scaled).
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
