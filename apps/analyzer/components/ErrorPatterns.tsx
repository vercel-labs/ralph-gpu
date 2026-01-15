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
      <h2 className="text-xl font-bold">Errors & Issues</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-accent-red" />
            <span className="text-sm text-foreground-secondary">Tool Errors</span>
          </div>
          <div className="text-3xl font-bold text-accent-red">{errors.length}</div>
        </div>
        
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-accent-yellow" />
            <span className="text-sm text-foreground-secondary">Stuck Detections</span>
          </div>
          <div className="text-3xl font-bold text-accent-yellow">{stuckEvents.length}</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h3 className="text-sm font-semibold mb-3 text-foreground-secondary flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tool Errors
          </h3>
          <div className="space-y-2">
            {errors.map((error, idx) => (
              <div key={idx} className="bg-background-tertiary rounded p-3 border-l-2 border-accent-red">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-mono text-sm text-accent-red">{error.tool}</span>
                  <span className="text-xs text-foreground-muted">Iteration {error.iter}</span>
                </div>
                <div className="text-sm text-foreground-secondary">{error.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stuckEvents.length > 0 && (
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h3 className="text-sm font-semibold mb-3 text-foreground-secondary flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Stuck Detections
          </h3>
          <div className="space-y-2">
            {stuckEvents.map((stuck, idx) => (
              <div key={idx} className="bg-background-tertiary rounded p-3 border-l-2 border-accent-yellow">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold text-sm">{stuck.reason}</span>
                  <span className="text-xs text-foreground-muted">Iteration {stuck.iter}</span>
                </div>
                <div className="text-sm text-foreground-secondary">{stuck.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length === 0 && stuckEvents.length === 0 && (
        <div className="bg-background-secondary rounded-lg p-8 border border-foreground-muted/20 text-center">
          <div className="text-accent-green text-5xl mb-2">✓</div>
          <div className="text-foreground-secondary">No errors or stuck detections</div>
        </div>
      )}
    </div>
  );
}
