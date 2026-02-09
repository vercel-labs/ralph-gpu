"use client";

import { useEffect, useRef, useState } from "react";
import { useControls } from "leva";
import { gpu, GPUContext, Pass, Texture } from "ralph-gpu";

/**
 * Canvas Texture: render a 2D canvas as a live GPU texture (manual uniforms).
 *
 * Demonstrates ctx.texture(canvas) + tex.update(canvas) for per-frame uploads.
 */

const SIZE = 256;

export default function CanvasTexturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const speedRef = useRef(1);
  const radiusRef = useRef(0.3);

  useControls({
    speed: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Speed",
      onChange: (v: number) => { speedRef.current = v; },
    },
    radius: {
      value: 0.3,
      min: 0.05,
      max: 0.5,
      step: 0.01,
      label: "Circle Radius",
      onChange: (v: number) => { radiusRef.current = v; },
    },
  });

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;
    let tex: Texture | null = null;

    async function init() {
      if (!canvasRef.current) return;

      if (!gpu.isSupported()) {
        setError("WebGPU is not supported");
        return;
      }

      try {
        ctx = await gpu.init(canvasRef.current, { autoResize: true });
        if (disposed) { ctx.dispose(); return; }

        // Create an OffscreenCanvas for 2D drawing
        const offscreen = new OffscreenCanvas(SIZE, SIZE);
        const ctx2d = offscreen.getContext("2d")!;

        // Create the texture (sync from canvas)
        ctx2d.fillStyle = "#000";
        ctx2d.fillRect(0, 0, SIZE, SIZE);
        tex = ctx.texture(offscreen, { filter: "linear" });

        const displayPass = ctx.pass(
          /* wgsl */ `
          @group(1) @binding(0) var uTex: texture_2d<f32>;
          @group(1) @binding(1) var uTexSampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            return textureSample(uTex, uTexSampler, uv);
          }
        `,
          { uniforms: { uTex: { value: tex } } },
        );

        let t = 0;

        function frame() {
          if (disposed || !ctx || !tex) return;

          t += (1 / 60) * speedRef.current;

          // Draw animated graphics on the 2D canvas
          ctx2d.fillStyle = "rgba(0, 0, 0, 0.15)";
          ctx2d.fillRect(0, 0, SIZE, SIZE);

          const cx = SIZE / 2 + Math.cos(t * 2) * SIZE * 0.25;
          const cy = SIZE / 2 + Math.sin(t * 3) * SIZE * 0.25;
          const r = radiusRef.current * SIZE;

          // Rainbow color from time
          const hue = (t * 60) % 360;
          ctx2d.fillStyle = `hsl(${hue}, 80%, 60%)`;
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
          ctx2d.fill();

          // Second circle opposite
          const cx2 = SIZE / 2 - Math.cos(t * 2) * SIZE * 0.25;
          const cy2 = SIZE / 2 - Math.sin(t * 3) * SIZE * 0.25;
          ctx2d.fillStyle = `hsl(${(hue + 180) % 360}, 80%, 60%)`;
          ctx2d.beginPath();
          ctx2d.arc(cx2, cy2, r * 0.7, 0, Math.PI * 2);
          ctx2d.fill();

          // Text
          ctx2d.fillStyle = "white";
          ctx2d.font = "bold 16px monospace";
          ctx2d.fillText(`t=${t.toFixed(1)}`, 10, 20);

          // Upload the new canvas content to the GPU
          tex!.update(offscreen);
          displayPass.draw();
          animationId = requestAnimationFrame(frame);
        }
        frame();
      } catch (e) {
        console.error("Canvas texture error:", e);
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      tex?.dispose();
      ctx?.dispose();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">
          Canvas Texture (Live)
        </h1>
        <p className="text-gray-400 text-sm">
          A 2D <code>OffscreenCanvas</code> is drawn every frame and uploaded via{" "}
          <code>tex.update(canvas)</code>. Manual uniforms mode.
        </p>
      </div>
      <div className="flex-1 relative">
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
