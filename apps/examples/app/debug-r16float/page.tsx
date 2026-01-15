'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext, RenderTarget } from 'ralph-gpu';

interface DebugInfo {
  format: string;
  width: number;
  height: number;
  bytesPerPixel: number;
  readPixelsResult?: string;
  error?: string;
  rawData?: number[];
}

export default function DebugR16FloatPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [testFormat, setTestFormat] = useState<string>('r16float');
  const ctxRef = useRef<GPUContext | null>(null);
  const targetRef = useRef<RenderTarget | null>(null);

  async function runTest(format: string) {
    if (!ctxRef.current) return;
    
    const ctx = ctxRef.current;
    
    try {
      // Clean up previous target
      if (targetRef.current) {
        targetRef.current.dispose();
      }

      // Create target with selected format
      const target = ctx.target(16, 16, { format: format as any });
      targetRef.current = target;

      // Render a simple value to the target
      const pass = ctx.pass(/* wgsl */ `
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.5, 0.25, 0.125, 1.0);
        }
      `);

      ctx.setTarget(target);
      pass.draw();
      
      // Wait a frame
      await new Promise(r => requestAnimationFrame(r));

      // Calculate expected bytes per pixel
      const bytesPerPixelMap: Record<string, number> = {
        'r16float': 2,
        'rg16float': 4,
        'rgba16float': 8,
        'r32float': 4,
        'rgba8unorm': 4,
      };
      const bytesPerPixel = bytesPerPixelMap[format] || 4;

      // Try to read pixels
      let readPixelsResult = '';
      let error = '';
      let rawData: number[] = [];

      try {
        console.log(`Attempting readPixels on ${format} target (${target.width}x${target.height})`);
        const data = await target.readPixels(0, 0, 4, 4);
        console.log('readPixels returned:', data);
        readPixelsResult = `Success! Got ${data.length} values, type: ${data.constructor.name}`;
        rawData = Array.from(data.slice(0, 16)); // First 16 values
      } catch (e: any) {
        console.error('readPixels error:', e);
        error = e.message || String(e);
      }

      setDebugInfo({
        format: target.format,
        width: target.width,
        height: target.height,
        bytesPerPixel,
        readPixelsResult,
        error,
        rawData,
      });

      // Also render to screen for visualization
      ctx.setTarget(null);
      ctx.pass(/* wgsl */ `
        @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(0.1, 0.1, 0.15, 1.0);
        }
      `).draw();

    } catch (e: any) {
      console.error('Test error:', e);
      setDebugInfo({
        format: format,
        width: 0,
        height: 0,
        bytesPerPixel: 0,
        error: e.message || String(e),
      });
    }
  }

  useEffect(() => {
    let disposed = false;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        if (!gpu.isSupported()) {
          setDebugInfo({
            format: 'N/A',
            width: 0,
            height: 0,
            bytesPerPixel: 0,
            error: 'WebGPU is not supported in this browser',
          });
          return;
        }

        const ctx = await gpu.init(canvasRef.current, {
          dpr: 1,
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        ctxRef.current = ctx;
        
        // Run initial test
        await runTest(testFormat);
        
      } catch (error: any) {
        console.error('Failed to initialize WebGPU:', error);
        setDebugInfo({
          format: 'N/A',
          width: 0,
          height: 0,
          bytesPerPixel: 0,
          error: error.message || String(error),
        });
      }
    }

    init();

    return () => {
      disposed = true;
      if (targetRef.current) {
        targetRef.current.dispose();
      }
      if (ctxRef.current) {
        ctxRef.current.dispose();
      }
    };
  }, []);

  const formats = ['r16float', 'rg16float', 'rgba16float', 'r32float', 'rgba8unorm'];

  return (
    <div style={{ padding: '2rem', height: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: '1rem' }}>Debug: r16float readPixels Issue</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <label>Test Format: </label>
        <select 
          value={testFormat} 
          onChange={(e) => {
            setTestFormat(e.target.value);
            runTest(e.target.value);
          }}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        >
          {formats.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <button 
          onClick={() => runTest(testFormat)}
          style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        >
          Run Test
        </button>
      </div>

      <canvas 
        ref={canvasRef}
        style={{ 
          width: '200px', 
          height: '200px',
          border: '1px solid #ccc',
          display: 'block',
          marginBottom: '1rem',
        }}
        width={200}
        height={200}
      />

      {debugInfo && (
        <div style={{ 
          background: '#1a1a2e', 
          padding: '1rem', 
          borderRadius: '8px',
          color: '#fff',
          maxWidth: '600px',
        }}>
          <h3 style={{ marginTop: 0 }}>Debug Info</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem 0', color: '#888' }}>Format:</td>
                <td style={{ padding: '0.25rem 0' }}>{debugInfo.format}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: '#888' }}>Dimensions:</td>
                <td style={{ padding: '0.25rem 0' }}>{debugInfo.width} x {debugInfo.height}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: '#888' }}>Bytes/Pixel:</td>
                <td style={{ padding: '0.25rem 0' }}>{debugInfo.bytesPerPixel}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: '#888' }}>readPixels:</td>
                <td style={{ 
                  padding: '0.25rem 0',
                  color: debugInfo.error ? '#ff6b6b' : '#6bff6b'
                }}>
                  {debugInfo.readPixelsResult || debugInfo.error || 'N/A'}
                </td>
              </tr>
              {debugInfo.rawData && debugInfo.rawData.length > 0 && (
                <tr>
                  <td style={{ padding: '0.25rem 0', color: '#888', verticalAlign: 'top' }}>Raw Data:</td>
                  <td style={{ padding: '0.25rem 0', fontSize: '0.85rem' }}>
                    [{debugInfo.rawData.map(v => v.toFixed(4)).join(', ')}]
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem', color: '#666', maxWidth: '600px' }}>
        <h4>Expected Behavior:</h4>
        <ul>
          <li><strong>r16float</strong>: 2 bytes/pixel - potential alignment issue</li>
          <li><strong>rg16float</strong>: 4 bytes/pixel - should work</li>
          <li><strong>rgba16float</strong>: 8 bytes/pixel - should work</li>
          <li><strong>r32float</strong>: 4 bytes/pixel - should work</li>
          <li><strong>rgba8unorm</strong>: 4 bytes/pixel - should work</li>
        </ul>
        <p>WebGPU requires bytesPerRow to be a multiple of 256 for buffer copies. 
           Small textures with non-4-byte-aligned formats may fail.</p>
      </div>
    </div>
  );
}
