'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext, Pass } from 'ralph-gpu';

interface ExampleCanvasProps {
  // Legacy: single shader string (for simple examples)
  shader?: string;
  uniforms?: Record<string, { value: number | number[] }>;
  // New: full executable code
  code?: string;
  animated?: boolean;
  onError?: (error: string | null) => void;
}

// Execute user code with gpu and canvas in scope
async function executeCode(
  code: string,
  canvas: HTMLCanvasElement,
  signal: { disposed: boolean; visible: boolean }
): Promise<{ cleanup: () => void }> {
  // Track all contexts created during execution for cleanup
  const contexts: GPUContext[] = [];
  let animationId: number | null = null;
  
  // Create a wrapped gpu object that intercepts init() to track contexts
  const wrappedGpu = {
    ...gpu,
    init: async (...args: Parameters<typeof gpu.init>) => {
      const ctx = await gpu.init(...args);
      contexts.push(ctx);
      return ctx;
    },
  };
  
  // Save originals
  const origGetById = document.getElementById.bind(document);
  const origRAF = window.requestAnimationFrame.bind(window);
  
  // Override document.getElementById to return our canvas
  document.getElementById = (id) => {
    if (id === 'canvas') return canvas;
    return origGetById(id);
  };
  
  // Wrap requestAnimationFrame to track and check disposed/visible
  window.requestAnimationFrame = (cb) => {
    if (signal.disposed) return 0;
    animationId = origRAF((t) => {
      if (signal.disposed) return;
      // Skip frame if not visible (but keep the loop alive)
      if (!signal.visible) {
        animationId = origRAF(cb);
        return;
      }
      cb(t);
    });
    return animationId;
  };
  
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('gpu', 'canvas', 'signal', `
      return (async () => {
        ${code}
      })();
    `);
    await fn(wrappedGpu, canvas, signal);
  } finally {
    // Restore originals
    document.getElementById = origGetById;
    window.requestAnimationFrame = origRAF;
  }
  
  return {
    cleanup: () => {
      if (animationId) cancelAnimationFrame(animationId);
      // Dispose ALL contexts that were created
      for (const ctx of contexts) {
        if (typeof ctx.dispose === 'function') {
          ctx.dispose();
        }
      }
    }
  };
}

export function ExampleCanvas({ shader, uniforms, code, animated = true, onError }: ExampleCanvasProps) {
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
    let codeCleanup: (() => void) | null = null;
    let resizeHandler: (() => void) | null = null;
    const signal = { disposed: false, visible: true };
    let observer: IntersectionObserver | null = null;

    async function init() {
      if (!canvasRef.current) return;

      // Set up visibility observer to pause rendering when off-screen
      observer = new IntersectionObserver(
        (entries) => {
          signal.visible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0 }
      );
      observer.observe(canvasRef.current);

      try {
        setInternalError(null);
        onError?.(null);
        
        // If full code is provided, execute it
        if (code) {
          try {
            const result = await executeCode(code, canvasRef.current, signal);
            // Only store cleanup if we haven't been disposed during init
            if (!signal.disposed) {
              codeCleanup = result.cleanup;
            } else {
              // Already disposed, clean up immediately
              result.cleanup();
            }
          } catch (e) {
            if (!signal.disposed) {
              throw e;
            }
          }
          return;
        }
        
        // Legacy: simple shader mode
        if (!shader) {
          throw new Error('Either shader or code must be provided');
        }
        
        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
        });

        if (signal.disposed) {
          ctx.dispose();
          return;
        }

        pass = ctx.pass(shader, uniforms ? { uniforms } : undefined);

        resizeHandler = () => {
          if (!ctx || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          ctx.resize(rect.width, rect.height);
        };

        window.addEventListener('resize', resizeHandler);
        resizeHandler();

        function frame() {
          if (signal.disposed) return;
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
      signal.disposed = true;
      cancelAnimationFrame(animationId);
      observer?.disconnect();
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      codeCleanup?.();
      ctx?.dispose();
    };
  }, [shader, uniforms, code, animated, onError]);

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
