'use client';

import { ReactNode, useState } from 'react';
import { ChevronUp, Code2, X } from 'lucide-react';

interface FullscreenExampleProps {
  title: string;
  description: string;
  canvas: ReactNode;
  codeBlock: ReactNode;
  info?: ReactNode;
}

export function FullscreenExample({
  title,
  description,
  canvas,
  codeBlock,
  info,
}: FullscreenExampleProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Canvas - fullscreen */}
      {canvas}

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-60 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Expandable Content */}
          {showInfo && (
            <div className="bg-black/90 backdrop-blur border-t border-zinc-800 max-h-[70vh] overflow-y-auto">
              <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
                    <p className="text-zinc-400 text-sm">{description}</p>
                  </div>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {info && (
                  <div className="mb-6">
                    {info}
                  </div>
                )}
                
                <div>
                  <h2 className="text-lg font-semibold text-white mb-3">Code</h2>
                  {codeBlock}
                </div>
              </div>
            </div>
          )}

          {/* Minimalist Toggle Bar */}
          <div className="bg-black/80 backdrop-blur-sm border-t border-zinc-800">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-white">{title}</h2>
                <span className="text-zinc-600">•</span>
                <p className="text-xs text-zinc-500 hidden sm:block">{description}</p>
              </div>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                <Code2 className="w-4 h-4" />
                <span className="hidden sm:inline">{showInfo ? 'Hide' : 'View'} Code</span>
                <ChevronUp className={`w-4 h-4 transition-transform ${showInfo ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
