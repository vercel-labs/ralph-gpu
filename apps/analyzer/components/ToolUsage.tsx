'use client';

import { TraceEvent, ToolCallEvent, ToolResultEvent } from '@/lib/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRouter } from 'next/navigation';

interface ToolUsageProps {
  events: TraceEvent[];
}

const COLORS = ['#0070f3', '#46a758', '#6e56cf', '#ffc53d', '#e5484d', '#f76b15'];

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
      <h2 className="text-xl font-bold text-gray-12">Tool Usage</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-sm font-semibold mb-4 text-gray-11">Call Distribution</h3>
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
                  border: '1px solid #222222',
                  borderRadius: '8px',
                  color: '#eeeeee'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-sm font-semibold mb-4 text-gray-11">Total Duration (ms)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={durationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis 
                type="number" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="tool" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 12 }}
                width={100}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #222222',
                  borderRadius: '8px',
                  color: '#eeeeee'
                }}
              />
              <Bar dataKey="totalDuration" fill="#0070f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
        <h3 className="text-sm font-semibold mb-3 text-gray-11">Tool Statistics</h3>
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
                  className="bg-gray-2 rounded p-3 hover:bg-gray-3 transition-colors text-left border border-gray-4"
                >
                  <div className="font-mono text-sm font-semibold text-blue-9">{tool}</div>
                  <div className="mt-2 space-y-1 text-xs text-gray-11">
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
