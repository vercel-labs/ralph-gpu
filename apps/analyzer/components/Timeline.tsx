'use client';

import { TraceEvent, ToolCallEvent, ToolResultEvent, IterationEndEvent } from '@/lib/types';
import { Clock, Terminal, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface TimelineProps {
  events: TraceEvent[];
}

export function Timeline({ events }: TimelineProps) {
  // Group events by iteration
  const iterations = new Map<number, TraceEvent[]>();
  
  events.forEach(event => {
    if (event.iter !== undefined) {
      if (!iterations.has(event.iter)) {
        iterations.set(event.iter, []);
      }
      iterations.get(event.iter)!.push(event);
    }
  });

  const sortedIterations = Array.from(iterations.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Timeline</h2>
      
      <div className="space-y-4">
        {sortedIterations.map(([iterNum, iterEvents]) => {
          const iterEnd = iterEvents.find(e => e.type === 'iteration_end') as IterationEndEvent | undefined;
          const toolCalls = iterEvents.filter(e => e.type === 'tool_call') as ToolCallEvent[];
          const toolResults = iterEvents.filter(e => e.type === 'tool_result') as ToolResultEvent[];
          const errors = iterEvents.filter(e => e.type === 'tool_error');
          
          return (
            <div key={iterNum} className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-blue" />
                  <span className="font-semibold">Iteration {iterNum}</span>
                </div>
                {iterEnd && (
                  <div className="flex gap-4 text-sm text-foreground-secondary">
                    <span>{(iterEnd.duration / 1000).toFixed(1)}s</span>
                    <span>${iterEnd.cost.toFixed(4)}</span>
                    <span>{toolCalls.length} tools</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 ml-6">
                {toolCalls.map((call, idx) => {
                  const result = toolResults.find(r => r.tool === call.tool);
                  const hasError = errors.some(e => (e as any).tool === call.tool);
                  
                  // Format tool details based on tool type
                  const formatToolDetails = () => {
                    const parts: string[] = [];
                    
                    // Add args
                    if (call.args) {
                      if (call.tool === 'bash' && call.args.command) {
                        parts.push(`command: "${String(call.args.command).slice(0, 60)}${String(call.args.command).length > 60 ? '...' : ''}"`);
                      } else if ((call.tool === 'readFile' || call.tool === 'writeFile') && call.args.path) {
                        parts.push(`path: "${String(call.args.path)}"`);
                      } else if (call.tool === 'openBrowser' && call.args.url) {
                        parts.push(`url: "${String(call.args.url)}"`);
                      } else {
                        // Generic: show first relevant arg
                        const keys = Object.keys(call.args).filter(k => 
                          !k.startsWith('_') && call.args[k] && typeof call.args[k] !== 'object'
                        );
                        if (keys.length > 0) {
                          const key = keys[0];
                          const val = String(call.args[key]).slice(0, 40);
                          parts.push(`${key}: "${val}${String(call.args[key]).length > 40 ? '...' : ''}"`);
                        }
                      }
                    }
                    
                    // Add result summary
                    if (result?.resultSummary) {
                      parts.push(result.resultSummary);
                    }
                    
                    return parts.join(' • ');
                  };
                  
                  const details = formatToolDetails();
                  
                  return (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {hasError ? (
                        <XCircle className="w-4 h-4 text-accent-red mt-0.5 flex-shrink-0" />
                      ) : result ? (
                        <CheckCircle className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                      ) : (
                        <Terminal className="w-4 h-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div>
                          <span className="font-mono text-accent-blue">{call.tool}</span>
                          {result && (
                            <span className="text-foreground-secondary ml-2">
                              ({result.durationMs}ms)
                            </span>
                          )}
                        </div>
                        {details && (
                          <div className="text-foreground-muted text-xs mt-0.5 truncate">
                            {details}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
