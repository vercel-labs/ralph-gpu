'use client';

import { TaskTrace } from '@/lib/types';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ExecutionTimelineProps {
  tasks: TaskTrace[];
}

interface TimelineTask {
  task: TaskTrace;
  start: number;
  end: number;
  duration: number;
  row: number;
}

export function ExecutionTimeline({ tasks: allTasks }: ExecutionTimelineProps) {
  const router = useRouter();
  const [hoveredTask, setHoveredTask] = useState<TaskTrace | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Zoom handles state (0-100 percentage)
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(100);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  
  const brushRef = useRef<HTMLDivElement>(null);

  // Filter tasks with valid timestamps
  const tasks = allTasks.filter(t => t.startTime && t.endTime && t.summary);

  if (tasks.length === 0) {
    return (
      <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
        <h3 className="text-lg font-semibold mb-4">Execution Timeline</h3>
        <div className="text-center py-8 text-foreground-secondary">
          No timeline data available
        </div>
      </div>
    );
  }

  // Calculate time bounds
  const startTimes = tasks.map(t => new Date(t.startTime!).getTime());
  const endTimes = tasks.map(t => new Date(t.endTime!).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);
  const totalRange = maxTime - minTime;

  // Calculate visible range based on zoom handles
  const visibleStart = minTime + (totalRange * zoomStart / 100);
  const visibleEnd = minTime + (totalRange * zoomEnd / 100);
  const visibleRange = visibleEnd - visibleStart;

  // Assign rows to tasks (pack them efficiently, only stack if overlapping)
  const assignRows = (): TimelineTask[] => {
    const sorted = tasks
      .map(task => ({
        task,
        start: new Date(task.startTime!).getTime(),
        end: new Date(task.endTime!).getTime(),
        duration: new Date(task.endTime!).getTime() - new Date(task.startTime!).getTime(),
        row: 0,
      }))
      .sort((a, b) => a.start - b.start);

    const rowEndTimes: number[] = [];

    sorted.forEach(item => {
      // Find first available row where this task doesn't overlap
      let assignedRow = -1;
      
      for (let row = 0; row < rowEndTimes.length; row++) {
        // Task can fit in this row if it starts after (or when) the row's last task ends
        if (item.start >= rowEndTimes[row]) {
          assignedRow = row;
          rowEndTimes[row] = item.end;
          break;
        }
      }
      
      // If no available row found, create a new one
      if (assignedRow === -1) {
        assignedRow = rowEndTimes.length;
        rowEndTimes.push(item.end);
      }
      
      item.row = assignedRow;
    });

    return sorted;
  };

  const timelineTasks = assignRows();
  const maxRow = Math.max(...timelineTasks.map(t => t.row));
  const rowHeight = 40;
  const timelineHeight = (maxRow + 1) * rowHeight + 40;

  // Format functions
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if task completed
  const taskCompleted = (task: TaskTrace): boolean => {
    return task.events.some(e => e.type === 'tool_call' && (e as any).tool === 'done');
  };

  // Handle brush dragging
  const handleBrushMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHandle(handle);
  };

  const handleBrushMouseMove = (e: React.MouseEvent) => {
    if (!draggingHandle || !brushRef.current) return;
    
    const rect = brushRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    
    if (draggingHandle === 'start') {
      setZoomStart(Math.min(percentage, zoomEnd - 5));
    } else {
      setZoomEnd(Math.max(percentage, zoomStart + 5));
    }
  };

  const handleBrushMouseUp = () => {
    setDraggingHandle(null);
  };

  return (
    <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Execution Timeline</h3>
        <div className="text-xs text-foreground-secondary">
          {formatDate(visibleStart)} — {formatDate(visibleEnd)}
        </div>
      </div>
      
      {/* Main timeline */}
      <div className="space-y-4">
        {/* Timeline chart */}
        <div 
          className="relative bg-background-tertiary rounded-lg overflow-hidden"
          style={{ height: timelineHeight }}
          onMouseMove={draggingHandle ? handleBrushMouseMove : undefined}
          onMouseUp={draggingHandle ? handleBrushMouseUp : undefined}
          onMouseLeave={draggingHandle ? handleBrushMouseUp : undefined}
        >
          {/* Time grid lines */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 border-r border-foreground-muted/10 first:border-l"
              />
            ))}
          </div>

          {/* Timeline bars */}
          {timelineTasks.map((item, idx) => {
            const start = item.start;
            const end = item.end;
            
            // Calculate position relative to visible range
            const left = ((start - visibleStart) / visibleRange) * 100;
            const width = ((end - start) / visibleRange) * 100;
            
            // Skip if outside visible range
            if (left + width < 0 || left > 100) return null;
            
            const completed = taskCompleted(item.task);
            const barColor = completed ? 'bg-accent-blue' : 'bg-accent-red';
            const y = item.row * rowHeight + 10;
            
            // Tool call density
            const toolCallDensity = item.task.summary 
              ? (item.task.summary.totalToolCalls / (item.duration / 1000)) 
              : 0;
            
            return (
              <div
                key={`${item.task.taskId}-${idx}`}
                className={`absolute h-6 rounded cursor-pointer transition-all hover:h-8 hover:z-10 ${barColor}`}
                style={{
                  left: `${Math.max(0, left)}%`,
                  width: `${Math.min(width, 100 - Math.max(0, left))}%`,
                  top: y,
                }}
                onMouseEnter={(e) => {
                  setHoveredTask(item.task);
                  setMousePos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setMousePos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredTask(null)}
                onClick={() => router.push(`/trace/${item.task.taskId}`)}
              >
                {/* Task label */}
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-mono text-white truncate">
                    {item.task.taskName}
                  </span>
                </div>

                {/* Tool call density */}
                {toolCallDensity > 0.5 && width > 2 && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
                    {Array.from({ length: Math.min(Math.floor(toolCallDensity * 2), 15) }).map((_, i) => (
                      <div key={i} className="w-px h-3 bg-white" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Brush/range selector (Premiere-style zoom handles) */}
        <div className="relative">
          <div className="text-xs text-foreground-muted mb-1 px-2">Zoom Range</div>
          <div 
            ref={brushRef}
            className="relative h-16 bg-background-tertiary rounded-lg overflow-hidden cursor-default"
            onMouseMove={handleBrushMouseMove}
            onMouseUp={handleBrushMouseUp}
          >
            {/* Mini timeline overview */}
            <div className="absolute inset-0 flex items-center px-1">
              {timelineTasks.map((item, idx) => {
                const left = ((item.start - minTime) / totalRange) * 100;
                const width = ((item.end - item.start) / totalRange) * 100;
                const completed = taskCompleted(item.task);
                const color = completed ? '#0070f3' : '#ee0000';
                
                return (
                  <div
                    key={`mini-${item.task.taskId}-${idx}`}
                    className="absolute h-2 rounded opacity-60"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 0.2)}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </div>

            {/* Brush selection overlay */}
            <div className="absolute inset-0 flex">
              {/* Left mask */}
              <div 
                className="bg-black/50"
                style={{ width: `${zoomStart}%` }}
              />
              
              {/* Selection area */}
              <div 
                className="relative border-2 border-accent-blue"
                style={{ width: `${zoomEnd - zoomStart}%` }}
              >
                {/* Left handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-3 bg-accent-blue cursor-ew-resize hover:bg-accent-blue-hover flex items-center justify-center"
                  onMouseDown={handleBrushMouseDown('start')}
                  style={{ marginLeft: '-6px' }}
                >
                  <div className="w-1 h-8 bg-white/80 rounded" />
                </div>
                
                {/* Right handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 bg-accent-blue cursor-ew-resize hover:bg-accent-blue-hover flex items-center justify-center"
                  onMouseDown={handleBrushMouseDown('end')}
                  style={{ marginRight: '-6px' }}
                >
                  <div className="w-1 h-8 bg-white/80 rounded" />
                </div>
              </div>
              
              {/* Right mask */}
              <div 
                className="bg-black/50 flex-1"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 pt-2 text-xs text-foreground-secondary">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent-blue rounded" />
            <span>Completed (called done)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent-red rounded" />
            <span>Incomplete (no done call)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-px h-4 bg-foreground-muted" />
              <div className="w-px h-4 bg-foreground-muted" />
              <div className="w-px h-4 bg-foreground-muted" />
            </div>
            <span>Tool call density</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTask && (
        <div
          className="fixed z-50 bg-background border border-foreground-muted/40 rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="text-sm font-semibold mb-2">{hoveredTask.taskName}</div>
          <div className="space-y-1 text-xs text-foreground-secondary">
            <div className="flex justify-between gap-4">
              <span>Duration:</span>
              <span className="text-foreground font-mono">
                {formatTime(hoveredTask.summary?.elapsedMs || 0)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Cost:</span>
              <span className="text-accent-green font-mono">
                ${hoveredTask.summary?.totalCost.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Tool Calls:</span>
              <span className="text-accent-blue font-mono">
                {hoveredTask.summary?.totalToolCalls}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Iterations:</span>
              <span className="text-foreground font-mono">
                {hoveredTask.summary?.totalIterations}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Status:</span>
              <span className={`font-mono ${taskCompleted(hoveredTask) ? 'text-accent-green' : 'text-accent-red'}`}>
                {taskCompleted(hoveredTask) ? 'Completed' : 'Incomplete'}
              </span>
            </div>
            {(hoveredTask.summary?.errorsEncountered || 0) > 0 && (
              <div className="flex justify-between gap-4">
                <span>Errors:</span>
                <span className="text-accent-yellow font-mono">
                  {hoveredTask.summary?.errorsEncountered}
                </span>
              </div>
            )}
            <div className="pt-1 mt-1 border-t border-foreground-muted/20 text-foreground-muted">
              <div>Started: {formatDate(new Date(hoveredTask.startTime!).getTime())}</div>
              <div>Ended: {formatDate(new Date(hoveredTask.endTime!).getTime())}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
