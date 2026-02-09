"use client";

import { useEffect, useRef, useState } from "react";
import { useControls } from "leva";
import { gpu, GPUContext, Pass, Texture } from "ralph-gpu";

/**
 * Data Texture: procedural raw pixel data as a GPU texture (manual uniforms).
 *
 * Generates a checkerboard pattern from a Uint8Array.
 */

function generateCheckerboard(
  width: number,
  height: number,
  tileSize: number,
  color1: [number, number, number],
  color2: [number, number, number],
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const checker =
        (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      const c = checker ? color1 : color2;
      data[idx] = c[0];
      data[idx + 1] = c[1];
      data[idx + 2] = c[2];
      data[idx + 3] = 255;
    }
  }
  return data;
}

const TEX_SIZE = 256;

export default function DataTexturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const tileSizeRef = useRef(16);
  const color1Ref = useRef<[number, number, number]>([30, 30, 30]);
  const color2Ref = useRef<[number, number, number]>([220, 180, 50]);

  // Store references for live updates
  const texRef = useRef<Texture | null>(null);

  useControls({
    tileSize: {
      value: 16,
      min: 2,
      max: 64,
      step: 2,
      label: "Tile Size",
      onChange: (v: number) => { tileSizeRef.current = v; regenerate(); },
    },
    color1: {
      value: "#1e1e1e",
      label: "Color A",
      onChange: (v: string) => {
        color1Ref.current = hexToRgb(v);
        regenerate();
      },
    },
    color2: {
      value: "#dcb432",
      label: "Color B",
      onChange: (v: string) => {
        color2Ref.current = hexToRgb(v);
        regenerate();
      },
    },
  });

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  // Regenerate data texture from current control values
  function regenerate() {
    const tex = texRef.current;
    if (!tex) return;

    const data = generateCheckerboard(
      TEX_SIZE,
      TEX_SIZE,
      tileSizeRef.current,
      color1Ref.current,
      color2Ref.current,
    );
    // Create an ImageBitmap from the raw data for update()
    const imageData = new ImageData(new Uint8ClampedArray(data.buffer as ArrayBuffer), TEX_SIZE, TEX_SIZE);
    createImageBitmap(imageData).then((bitmap) => {
      tex.update(bitmap);
      bitmap.close();
    });
  }

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      if (!gpu.isSupported()) {
        setError("WebGPU is not supported");
        return;
      }

      try {
        ctx = await gpu.init(canvasRef.current, { autoResize: true });
        if (disposed) { ctx.dispose(); return; }

        const initialData = generateCheckerboard(
          TEX_SIZE,
          TEX_SIZE,
          tileSizeRef.current,
          color1Ref.current,
          color2Ref.current,
        );

        const tex = ctx.texture(initialData, {
          width: TEX_SIZE,
          height: TEX_SIZE,
          filter: "nearest",
          wrap: "repeat",
        });
        texRef.current = tex;

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

        function frame() {
          if (disposed || !ctx) return;
          displayPass.draw();
          animationId = requestAnimationFrame(frame);
        }
        frame();
      } catch (e) {
        console.error("Data texture error:", e);
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      texRef.current?.dispose();
      texRef.current = null;
      ctx?.dispose();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">
          Data Texture (Procedural)
        </h1>
        <p className="text-gray-400 text-sm">
          Checkerboard generated from <code>Uint8Array</code> via{" "}
          <code>ctx.texture(data, {"{"}width, height{"}"})</code>. Manual
          uniforms mode. Use Leva to change tile size & colors.
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
