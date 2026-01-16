'use client';

import { useState, useCallback, useEffect } from 'react';
import { getExampleBySlug } from '../../../lib/examples';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MonacoEditor } from '../../../components/MonacoEditor';
import { Preview } from '../../../components/Preview';

export default function PlaygroundPage({ params }: { params: { slug: string } }) {
  const example = getExampleBySlug(params.slug);
  if (!example) notFound();

  const [code, setCode] = useState(example.shaderCode);
  const [activeCode, setActiveCode] = useState(example.shaderCode);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    setActiveCode(code);
    setError(null);
  }, [code]);

  const handleEditorChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handlePreviewError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white">
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Gallery
        </Link>
        <h1 className="text-xl font-semibold">{example.title} Playground</h1>
        <button
          onClick={handleRun}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium"
        >
          Run (Cmd/Ctrl+Enter)
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 h-1/2 md:h-full relative">
          <MonacoEditor
            value={code}
            onChange={handleEditorChange}
            onRun={handleRun}
            language="typescript"
          />
        </div>
        <div className="w-full md:w-1/2 h-1/2 md:h-full relative flex items-center justify-center">
          {error && (
            <div className="absolute z-10 p-4 m-4 bg-red-800 text-white rounded-md max-w-full overflow-auto text-sm" style={{ whiteSpace: 'pre-wrap' }}>
              Shader Error: {error}
            </div>
          )}
          <Preview shaderCode={activeCode} onError={handlePreviewError} />
        </div>
      </div>
    </div>
  );
}
