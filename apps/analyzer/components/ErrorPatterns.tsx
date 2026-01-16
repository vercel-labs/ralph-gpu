'use client';

import { TraceEvent, ToolErrorEvent, StuckDetectedEvent } from '@/lib/types';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface ErrorPatternsProps {
  events: TraceEvent[];
}

export function ErrorPatterns({ events }: ErrorPatternsProps) {
  const errors = events.filter(e => e.type === 'tool_error') as ToolErrorEvent[];
  const stuckEvents = events.filter(e => e.type === 'stuck_detected') as StuckDetectedEvent[];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-12">Errors & Issues</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-9" />
            <span className="text-sm text-gray-11">Tool Errors</span>
          </div>
          <div className="text-3xl font-bold text-red-9">{errors.length}</div>
        </div>
        
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-9" />
            <span className="text-sm text-gray-11">Stuck Detections</span>
          </div>
          <div className="text-3xl font-bold text-amber-9">{stuckEvents.length}</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tool Errors
          </h3>
          <div className="space-y-2">
            {errors.map((error, idx) => (
              <div key={idx} className="bg-gray-2 rounded p-3 border-l-2 border-red-9">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-mono text-sm text-red-9">{error.tool}</span>
                  <span className="text-xs text-gray-9">Iteration {error.iter}</span>
                </div>
                <div className="text-sm text-gray-11">{error.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stuckEvents.length > 0 && (
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Stuck Detections
          </h3>
          <div className="space-y-2">
            {stuckEvents.map((stuck, idx) => (
              <div key={idx} className="bg-gray-2 rounded p-3 border-l-2 border-amber-9">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-12">{stuck.reason}</span>
                  <span className="text-xs text-gray-9">Iteration {stuck.iter}</span>
                </div>
                <div className="text-sm text-gray-11">{stuck.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length === 0 && stuckEvents.length === 0 && (
        <div className="bg-gray-1 rounded-lg p-8 border border-gray-4 text-center">
          <div className="text-green-9 text-5xl mb-2">✓</div>
          <div className="text-gray-11">No errors or stuck detections</div>
        </div>
      )}
    </div>
  );
}
