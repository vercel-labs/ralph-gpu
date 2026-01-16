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
        <h2 className="text-xl font-bold text-gray-12 mb-4">Cost Analysis</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
            <div className="text-sm text-gray-11">Total Cost</div>
            <div className="text-2xl font-bold text-green-9">
              ${totalCost.toFixed(4)}
            </div>
          </div>
          <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
            <div className="text-sm text-gray-11">Total Tokens</div>
            <div className="text-2xl font-bold text-blue-9">
              {totalTokens.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
            <div className="text-sm text-gray-11">Avg Cost/Iter</div>
            <div className="text-2xl font-bold text-purple-9">
              ${(totalCost / iterationEnds.length).toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
        <h3 className="text-sm font-semibold mb-4 text-gray-11">Cost per Iteration</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
            <XAxis 
              dataKey="iteration" 
              stroke="#606060"
              tick={{ fill: '#b4b4b4', fontSize: 12 }}
            />
            <YAxis 
              stroke="#606060"
              tick={{ fill: '#b4b4b4', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a0a0a', 
                border: '1px solid #222222',
                borderRadius: '8px',
                color: '#eeeeee'
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

      <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
        <h3 className="text-sm font-semibold mb-4 text-gray-11">Token Usage</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
            <XAxis 
              dataKey="iteration" 
              stroke="#606060"
              tick={{ fill: '#b4b4b4', fontSize: 12 }}
            />
            <YAxis 
              stroke="#606060"
              tick={{ fill: '#b4b4b4', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a0a0a', 
                border: '1px solid #222222',
                borderRadius: '8px',
                color: '#eeeeee'
              }}
            />
            <Legend />
            <Bar dataKey="inputTokens" stackId="a" fill="#46a758" name="Input" />
            <Bar dataKey="outputTokens" stackId="a" fill="#6e56cf" name="Output" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
