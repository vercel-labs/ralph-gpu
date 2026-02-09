"use client";

import { useEffect, useRef, useState } from "react";
import { useControls } from "leva";
import { gpu, GPUContext, Pass, Texture } from "ralph-gpu";

/**
 * Load external image as a GPU texture using ctx.texture() (manual uniforms).
 */

const IMAGE_URL = "/textures/test-image.png";

export default function ImageTexturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    ctx: GPUContext | null;
    tex: Texture | null;
    animId: number;
  }>({ ctx: null, tex: null, animId: 0 });
  const initedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Packed as Float32Array(4): [scrollX, scrollY, scaleX, scaleY]
  const paramsRef = useRef(new Float32Array([0, 0, 1, 1]));

  useControls({
    uvScrollX: {
      value: 0, min: -1, max: 1, step: 0.01, label: "UV Scroll X",
      onChange: (v: number) => { paramsRef.current[0] = v; },
    },
    uvScrollY: {
      value: 0, min: -1, max: 1, step: 0.01, label: "UV Scroll Y",
      onChange: (v: number) => { paramsRef.current[1] = v; },
    },
    uvScaleX: {
      value: 1, min: 0.1, max: 3, step: 0.01, label: "UV Scale X",
      onChange: (v: number) => { paramsRef.current[2] = v; },
    },
    uvScaleY: {
      value: 1, min: 0.1, max: 3, step: 0.01, label: "UV Scale Y",
      onChange: (v: number) => { paramsRef.current[3] = v; },
    },
  });

  useEffect(() => {
    // Prevent double-init in React StrictMode (refs survive remount)
    if (initedRef.current) return;
    initedRef.current = true;

    async function init() {
      if (!canvasRef.current) return;

      if (!gpu.isSupported()) {
        setError("WebGPU is not supported");
        setLoading(false);
        return;
      }

      try {
        const ctx = await gpu.init(canvasRef.current, { autoResize: true });
        stateRef.current.ctx = ctx;

        const tex = await ctx.texture(IMAGE_URL, { wrap: "repeat" });
        stateRef.current.tex = tex;

        const displayPass = ctx.pass(
          /* wgsl */ `
          @group(1) @binding(0) var uTex: texture_2d<f32>;
          @group(1) @binding(1) var uTexSampler: sampler;

          struct Params {
            uvScroll: vec2f,
            uvScale: vec2f,
          }
          @group(1) @binding(2) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            var uv = pos.xy / globals.resolution;
            uv = uv * params.uvScale + params.uvScroll;
            return textureSample(uTex, uTexSampler, uv);
          }
        `,
          {
            uniforms: {
              uTex: { value: tex },
              params: { value: paramsRef.current },
            },
          },
        );

        setLoading(false);

        function frame() {
          if (!stateRef.current.ctx) return;
          displayPass.draw();
          stateRef.current.animId = requestAnimationFrame(frame);
        }
        frame();
      } catch (e) {
        console.error("Image texture error:", e);
        setError(e instanceof Error ? e.message : "Failed to load texture");
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      stateRef.current.tex?.dispose();
      stateRef.current.ctx?.dispose();
      stateRef.current = { ctx: null, tex: null, animId: 0 };
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">
          Image Texture (ctx.texture)
        </h1>
        <p className="text-gray-400 text-sm">
          Loaded via <code>ctx.texture(url)</code> with manual uniforms mode.
          Use Leva to adjust UV scroll and scale.
        </p>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white z-10">
            <p>Loading texture...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 z-10">
            <p>{error}</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
