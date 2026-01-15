'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

interface PreviewProps {
  shaderCode: string;
  onError?: (error: string | null) => void;
}

export function Preview({ shaderCode, onError }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<GPUContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.dispose();
      ctxRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    cleanup();

    const initWebGPU = async () => {
      if (!canvasRef.current) {
        setError("Canvas element not found.");
        onError?.("Canvas element not found.");
        setIsLoading(false);
        return;
      }

      if (!gpu.isSupported()) {
        setError("WebGPU is not supported in this browser.");
        onError?.("WebGPU is not supported in this browser.");
        setIsLoading(false);
        return;
      }

      try {
        const ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          autoResize: true
        });
        ctxRef.current = ctx;

        const pass = ctx.pass(shaderCode);

        const frame = () => {
          pass.draw();
          animationFrameIdRef.current = requestAnimationFrame(frame);
        };
        frame();
        setError(null);
        onError?.(null);
      } catch (e: any) {
        console.error("WebGPU initialization or shader compilation error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        onError?.(errorMessage);
        cleanup();
      } finally {
        setIsLoading(false);
      }
    };

    initWebGPU();

    return cleanup;
  }, [shaderCode, onError, cleanup]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0f'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          color: '#94a3b8',
          fontSize: '0.9rem'
        }}>
          Loading WebGPU...
        </div>
      )}
      {error && !isLoading && (
        <div style={{
          position: 'absolute',
          padding: '1rem',
          backgroundColor: '#7f1d1d',
          color: '#fff',
          borderRadius: '8px',
          maxWidth: '80%',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}
