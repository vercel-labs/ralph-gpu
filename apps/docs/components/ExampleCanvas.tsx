'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext, Pass } from 'ralph-gpu';

interface ExampleCanvasProps {
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
  onError?: (error: string | null) => void;
}

export function ExampleCanvas({ shader, uniforms, animated = true, onError }: ExampleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check support first
    if (!gpu.isSupported()) {
      setSupported(false);
      return;
    }
    setSupported(true);

    let ctx: GPUContext | null = null;
    let pass: Pass;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      try {
        setInternalError(null);
        onError?.(null);
        
        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        pass = ctx.pass(shader, uniforms ? { uniforms } : undefined);

        const onResize = () => {
          if (!ctx || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          ctx.resize(rect.width, rect.height);
        };

        window.addEventListener('resize', onResize);
        onResize();

        function frame() {
          if (disposed) return;
          pass.draw();
          if (animated) {
            animationId = requestAnimationFrame(frame);
          }
        }
        frame();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to initialize WebGPU';
        setInternalError(msg);
        onError?.(msg);
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      ctx?.dispose();
    };
  }, [shader, uniforms, animated, onError]);

  if (supported === false) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <div className="text-yellow-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-slate-100 font-semibold mb-2">WebGPU Not Supported</h3>
          <p className="text-slate-400 text-sm">
            Your browser doesn&apos;t support WebGPU. Try Chrome 113+, Edge 113+, or Safari 17+.
          </p>
        </div>
      </div>
    );
  }

  // Only show internal error if onError is not provided
  if (internalError && !onError) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center border-l border-red-900/30">
        <div className="text-center p-6 max-w-sm">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-slate-100 font-semibold mb-2">Compilation Error</h3>
          <pre className="text-red-400 text-xs text-left p-4 bg-red-950/30 rounded border border-red-900/50 overflow-auto max-h-48">
            {internalError}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
