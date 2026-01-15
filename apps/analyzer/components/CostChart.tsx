'use client';

import { TraceEvent, IterationEndEvent } from '@/lib/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CostChartProps {
  events: TraceEvent[];
}

export function CostChart({ events }: CostChartProps) {
  // Extract iteration end events for cost analysis
  const iterationEnds = events
    .filter(e => e.type === 'iteration_end')
    .map(e => e as IterationEndEvent)
    .sort((a, b) => a.iter - b.iter);

  const costData = iterationEnds.map(iter => ({
    iteration: `Iter ${iter.iter}`,
    cost: parseFloat((iter.cost || 0).toFixed(4)),
    tokens: (iter.tokens?.input || 0) + (iter.tokens?.output || 0),
    inputTokens: iter.tokens?.input || 0,
    outputTokens: iter.tokens?.output || 0,
  }));

  const totalCost = iterationEnds.reduce((sum, iter) => sum + (iter.cost || 0), 0);
  const totalTokens = iterationEnds.reduce((sum, iter) => 
    sum + (iter.tokens?.input || 0) + (iter.tokens?.output || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Cost Analysis</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
            <div className="text-sm text-foreground-secondary">Total Cost</div>
            <div className="text-2xl font-bold text-accent-green">
              ${totalCost.toFixed(4)}
            </div>
          </div>
          <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
            <div className="text-sm text-foreground-secondary">Total Tokens</div>
            <div className="text-2xl font-bold text-accent-blue">
              {totalTokens.toLocaleString()}
            </div>
          </div>
          <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
            <div className="text-sm text-foreground-secondary">Avg Cost/Iter</div>
            <div className="text-2xl font-bold text-accent-purple">
              ${(totalCost / iterationEnds.length).toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <h3 className="text-sm font-semibold mb-4 text-foreground-secondary">Cost per Iteration</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="iteration" 
              stroke="#666"
              tick={{ fill: '#a1a1a1', fontSize: 12 }}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#a1a1a1', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a0a0a', 
                border: '1px solid #333',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              stroke="#0070f3" 
              strokeWidth={2}
              dot={{ fill: '#0070f3', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <h3 className="text-sm font-semibold mb-4 text-foreground-secondary">Token Usage</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="iteration" 
              stroke="#666"
              tick={{ fill: '#a1a1a1', fontSize: 12 }}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#a1a1a1', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a0a0a', 
                border: '1px solid #333',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="inputTokens" stackId="a" fill="#50e3c2" name="Input" />
            <Bar dataKey="outputTokens" stackId="a" fill="#7928ca" name="Output" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
