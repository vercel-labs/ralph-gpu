'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function TransparentCanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [alphaMode, setAlphaMode] = useState<'premultiplied' | 'opaque'>('premultiplied');
  const ctxRef = useRef<GPUContext | null>(null);

  useEffect(() => {
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      // Dispose previous context if it exists
      if (ctxRef.current) {
        ctxRef.current.dispose();
        ctxRef.current = null;
      }

      try {
        // Check WebGPU support
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        // Initialize context with configurable alpha mode
        const ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          alphaMode: alphaMode,
        });

        ctxRef.current = ctx;

        // Check if we were disposed during async init
        if (disposed) {
          ctx.dispose();
          return;
        }

        // Set transparent clear color
        ctx.clearColor = [0, 0, 0, 0];

        // Create shader with transparent animated circle
        const pass = ctx.pass(
          /* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = (pos.xy - 0.5 * globals.resolution) / min(globals.resolution.x, globals.resolution.y);

            // Create animated circle
            let center = vec2f(0.0, 0.0);
            let dist = length(uv - center);
            let radius = 0.3 + sin(globals.time * 2.0) * 0.1;

            // Smooth circle edge
            let circle = smoothstep(radius + 0.02, radius - 0.02, dist);

            // Animated color (HSV-like rainbow)
            let hue = globals.time * 0.3;
            let color = vec3f(
              0.5 + 0.5 * cos(hue),
              0.5 + 0.5 * cos(hue + 2.094),
              0.5 + 0.5 * cos(hue + 4.189)
            );

            // Pulsing alpha
            let alpha = circle * (0.7 + 0.3 * sin(globals.time * 3.0));

            // IMPORTANT: Premultiply RGB by alpha for correct transparency
            return vec4f(color * alpha, alpha);
          }
        `,
          { blend: 'alpha' }
        );

        function frame() {
          if (disposed) return;
          pass.draw();
          animationId = requestAnimationFrame(frame);
        }

        frame();
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (ctxRef.current) {
        ctxRef.current.dispose();
        ctxRef.current = null;
      }
    };
  }, [alphaMode]); // Re-initialize when alpha mode changes

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      // Gradient background to show transparency effect
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{
          marginBottom: '1rem',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1a202c'
        }}>
          Transparent Canvas
        </h1>

        <p style={{
          marginBottom: '1.5rem',
          color: '#4a5568',
          lineHeight: '1.6'
        }}>
          This example demonstrates transparent canvas rendering using premultiplied alpha mode.
          The animated circle blends with the page&apos;s gradient background. Toggle between modes to see the difference!
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
            fontWeight: '500',
            color: '#2d3748'
          }}>
            <span>Alpha Mode:</span>
            <select
              value={alphaMode}
              onChange={(e) => setAlphaMode(e.target.value as 'premultiplied' | 'opaque')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '2px solid #e2e8f0',
                backgroundColor: 'white',
                fontSize: '0.95rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              <option value="premultiplied">Premultiplied (Transparent)</option>
              <option value="opaque">Opaque (No Transparency)</option>
            </select>
          </label>

          <div style={{
            marginTop: '0.75rem',
            padding: '1rem',
            backgroundColor: '#edf2f7',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#4a5568',
            lineHeight: '1.5'
          }}>
            {alphaMode === 'premultiplied' ? (
              <>
                <strong>Premultiplied mode:</strong> The canvas background is transparent,
                and the circle blends with the page gradient. Note that RGB values must be
                premultiplied by alpha in the shader for correct rendering.
              </>
            ) : (
              <>
                <strong>Opaque mode:</strong> The canvas background is fully opaque (black),
                hiding the page gradient. This mode is more performant when transparency isn&apos;t needed.
              </>
            )}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '500px',
            borderRadius: '8px',
            display: 'block',
            // Checkerboard pattern to visualize transparency
            backgroundImage: `
              linear-gradient(45deg, #ddd 25%, transparent 25%),
              linear-gradient(-45deg, #ddd 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ddd 75%),
              linear-gradient(-45deg, transparent 75%, #ddd 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
          width={800}
          height={500}
        />

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
            color: '#2d3748'
          }}>
            Key Implementation Details
          </h3>

          <ul style={{
            marginLeft: '1.5rem',
            color: '#4a5568',
            lineHeight: '1.8',
            fontSize: '0.9rem'
          }}>
            <li>
              <strong>Premultiplied Alpha:</strong> RGB values are multiplied by alpha in the shader:
              <code style={{
                backgroundColor: '#edf2f7',
                padding: '2px 6px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                vec4f(color * alpha, alpha)
              </code>
            </li>
            <li>
              <strong>Blend Mode:</strong> Uses <code style={{
                backgroundColor: '#edf2f7',
                padding: '2px 6px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>blend: &apos;alpha&apos;</code> for proper alpha blending
            </li>
            <li>
              <strong>Clear Color:</strong> Set to transparent: <code style={{
                backgroundColor: '#edf2f7',
                padding: '2px 6px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>[0, 0, 0, 0]</code>
            </li>
            <li>
              <strong>Alpha Mode:</strong> Configured during initialization:
              <code style={{
                backgroundColor: '#edf2f7',
                padding: '2px 6px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                alphaMode: &apos;{alphaMode}&apos;
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
