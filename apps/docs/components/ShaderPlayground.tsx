'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PreviewFrame } from './PreviewFrame';
import { Example } from '@/lib/examples';

const MonacoEditor = dynamic(() => import('./MonacoEditor').then(mod => mod.MonacoEditor), { ssr: false });

interface ShaderPlaygroundProps {
  initialExample: Example;
}

type UniformValue = number | number[];
type Uniforms = Record<string, { value: UniformValue }>;

// Try to parse uniform values from the code
// Looks for patterns like: amplitude: 0.3, or color: [0.2, 0.8, 1.0]
function extractUniformsFromCode(code: string): Uniforms | null {
  try {
    // Look for const params = { ... } or similar object literal with uniform values
    const paramsMatch = code.match(/const\s+params\s*=\s*\{([^}]+)\}/);
    if (!paramsMatch) return null;

    const paramsContent = paramsMatch[1];
    const uniforms: Uniforms = {};

    // Match key: value pairs (numbers or arrays)
    const propertyRegex = /(\w+)\s*:\s*(\[[^\]]+\]|[\d.]+)/g;
    let match;
    
    while ((match = propertyRegex.exec(paramsContent)) !== null) {
      const key = match[1];
      const valueStr = match[2];
      
      let value: UniformValue;
      if (valueStr.startsWith('[')) {
        // Parse array: [0.2, 0.8, 1.0]
        value = JSON.parse(valueStr);
      } else {
        // Parse number
        value = parseFloat(valueStr);
      }
      
      uniforms[key] = { value };
    }

    return Object.keys(uniforms).length > 0 ? uniforms : null;
  } catch {
    return null;
  }
}

// Generate runtime code for legacy shader examples
function generateRuntimeCode(shader: string, uniforms?: Uniforms, animated?: boolean): string {
  const uniformsStr = uniforms ? JSON.stringify(uniforms) : 'undefined';
  return `
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas, { dpr: Math.min(devicePixelRatio, 2) });

const pass = ctx.pass(\`${shader.replace(/`/g, '\\`')}\`${uniforms ? `, { uniforms: ${uniformsStr} }` : ''});

const onResize = () => {
  const rect = canvas.getBoundingClientRect();
  ctx.resize(rect.width, rect.height);
};
window.addEventListener('resize', onResize);
onResize();

function frame() {
  pass.draw();
  ${animated ? 'requestAnimationFrame(frame);' : ''}
}
frame();
`;
}

// v0 prompt for React conversion
const V0_PROMPT = `Convert this ralph-gpu shader code to a React component.

Follow this pattern:

\`\`\`tsx
"use client";

import { useEffect, useRef } from "react";
import { gpu, GPUContext } from "ralph-gpu";

export default function ShaderComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;
      if (!gpu.isSupported()) {
        console.error("WebGPU is not supported");
        return;
      }

      ctx = await gpu.init(canvasRef.current, { autoResize: true });
      if (disposed) { ctx.dispose(); return; }

      // --- SHADER CODE GOES HERE ---

      function frame() {
        if (disposed) return;
        // draw calls here
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

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
\`\`\`

Keep the shader logic intact. Adapt the initialization and render loop to fit inside the useEffect.`;

// Generate v0 URL with code and React conversion prompt
function generateV0Url(code: string): string {
  const base64Content = btoa(code);
  const target = "components/shader.tsx";

  return `https://v0.app/chat/api/open?prompt=${encodeURIComponent(
    V0_PROMPT
  )}&content=${encodeURIComponent(base64Content)}&target=${encodeURIComponent(
    target
  )}`;
}

export function ShaderPlayground({ initialExample }: ShaderPlaygroundProps) {
  const [code, setCode] = useState(initialExample.code);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'mac' | 'other'>('other');

  // Run initial code on mount
  useEffect(() => {
    setActiveCode(initialExample.code);
  }, [initialExample.code]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      if (navigator.platform.toLowerCase().includes('mac')) {
        setPlatform('mac');
      }
    }
  }, []);

  const handleRun = useCallback(() => {
    setError(null);
    setRunKey(k => k + 1); // Reset iframe on each run
    setActiveCode(code); // Just run the code directly
  }, [code]);

  const handleError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const runLabel = platform === 'mac' ? 'Run ⌘↵' : 'Run Ctrl+↵';

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Minimal Vercel-style toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#333] shrink-0">
        <span className="text-[11px] font-normal text-[#666] tracking-wide">
          index.ts
        </span>
        <div className="flex items-center gap-2">
          <a
            href={generateV0Url(code)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://v0.app/chat-static/button.svg"
              alt="Open in v0"
              width={99}
              height={32}
              className="h-7"
            />
          </a>
          <button 
            onClick={handleRun}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#e5e5e5] text-black rounded-md text-[11px] font-medium transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
            {runLabel}
          </button>
        </div>
      </div>
      
      {/* Editor and Preview side by side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Editor Pane */}
        <div className="h-[40vh] lg:h-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[#333]">
          <MonacoEditor 
            code={code} 
            onChange={setCode} 
            onRun={handleRun}
            language="typescript"
          />
        </div>

        {/* Preview Pane - isolated iframe execution */}
        <div className="flex-1 lg:w-1/2 relative bg-black">
          <PreviewFrame 
            key={runKey}
            code={activeCode}
            onError={handleError}
          />
          
          {error && (
            <div className="absolute inset-x-0 bottom-0 p-3 bg-[#1a0000] border-t border-[#ee0000]/30 text-[#ff6666] text-xs font-mono overflow-auto max-h-[30%]">
              <div className="flex items-center gap-1.5 mb-1 text-[#ee0000] font-medium text-xs">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5a1 1 0 112 0v3a1 1 0 11-2 0V5zm1 7a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                Error
              </div>
              <div className="whitespace-pre-wrap pl-4 border-l border-[#ee0000]/20 text-[#a1a1a1]">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
