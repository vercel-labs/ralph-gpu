'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ExampleCanvas } from './ExampleCanvas';
import { Example } from '@/lib/examples';

const MonacoEditor = dynamic(() => import('./MonacoEditor').then(mod => mod.MonacoEditor), { ssr: false });

interface ShaderPlaygroundProps {
  initialExample: Example;
}

export function ShaderPlayground({ initialExample }: ShaderPlaygroundProps) {
  const [code, setCode] = useState(initialExample.code);
  const [activeCode, setActiveCode] = useState(initialExample.shader);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'mac' | 'other'>('other');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      if (navigator.platform.toLowerCase().includes('mac')) {
        setPlatform('mac');
      }
    }
  }, []);

  const handleRun = useCallback(() => {
    // Extract the shader from the full API code for rendering
    // We look for ctx.pass(`...`)
    const match = code.match(/ctx\.pass\(`([\s\S]*?)`\)/);
    if (match && match[1]) {
      setActiveCode(match[1]);
    } else {
      // Fallback: if we can't find the template literal, just use the whole code
      // though it will likely fail if it's TS code.
      setActiveCode(code);
    }
    setError(null);
  }, [code]);

  const handleError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const runLabel = platform === 'mac' ? 'Run ⌘↵' : 'Run Ctrl+↵';

  return (
    <div className="flex flex-col h-full min-h-[500px] border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Full API Editor
          </span>
        </div>
        <button 
          onClick={handleRun}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-sm font-bold transition-all shadow-lg shadow-primary-500/20 active:scale-95"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          {runLabel}
        </button>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 min-h-[300px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-slate-800">
          <MonacoEditor 
            code={code} 
            onChange={setCode} 
            onRun={handleRun}
            language="typescript"
          />
        </div>

        {/* Preview Pane */}
        <div className="flex-1 min-h-[300px] lg:min-h-0 relative bg-black">
          <ExampleCanvas 
            shader={activeCode} 
            uniforms={initialExample.uniforms}
            animated={initialExample.animated}
            onError={handleError}
          />
          
          {error && (
            <div className="absolute inset-x-0 bottom-0 p-6 bg-red-950/95 border-t border-red-500/50 text-red-200 text-sm font-mono overflow-auto max-h-[40%] backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 text-red-400 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Compilation Error
              </div>
              <div className="whitespace-pre-wrap pl-7 border-l-2 border-red-500/30">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
