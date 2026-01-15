'use client';

import { TraceEvent, ToolCallEvent, ToolResultEvent } from '@/lib/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRouter } from 'next/navigation';

interface ToolUsageProps {
  events: TraceEvent[];
}

const COLORS = ['#0070f3', '#50e3c2', '#7928ca', '#f5a623', '#ee0000', '#ff6b35'];

export function ToolUsage({ events }: ToolUsageProps) {
  const router = useRouter();
  
  // Count tool calls
  const toolCalls = events.filter(e => e.type === 'tool_call') as ToolCallEvent[];
  const toolResults = events.filter(e => e.type === 'tool_result') as ToolResultEvent[];
  
  const toolCounts: Record<string, number> = {};
  const toolDurations: Record<string, number[]> = {};
  
  toolCalls.forEach(call => {
    toolCounts[call.tool] = (toolCounts[call.tool] || 0) + 1;
  });
  
  toolResults.forEach(result => {
    if (!toolDurations[result.tool]) {
      toolDurations[result.tool] = [];
    }
    toolDurations[result.tool].push(result.durationMs);
  });

  const pieData = Object.entries(toolCounts).map(([tool, count]) => ({
    name: tool,
    value: count,
  }));

  const durationData = Object.entries(toolDurations)
    .map(([tool, durations]) => ({
      tool,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
    }))
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Tool Usage</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h3 className="text-sm font-semibold mb-4 text-foreground-secondary">Call Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h3 className="text-sm font-semibold mb-4 text-foreground-secondary">Total Duration (ms)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={durationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                type="number" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="tool" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
                width={100}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="totalDuration" fill="#0070f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <h3 className="text-sm font-semibold mb-3 text-foreground-secondary">Tool Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(toolCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tool, count]) => {
              const durations = toolDurations[tool] || [];
              const avgDuration = durations.length > 0 
                ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
                : 0;
              
              return (
                <button
                  key={tool}
                  onClick={() => router.push(`/tool/${tool}`)}
                  className="bg-background-tertiary rounded p-3 hover:bg-background-tertiary/70 transition-colors text-left"
                >
                  <div className="font-mono text-sm font-semibold text-accent-blue">{tool}</div>
                  <div className="mt-2 space-y-1 text-xs text-foreground-secondary">
                    <div>{count} calls</div>
                    <div>{avgDuration.toFixed(0)}ms avg</div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
