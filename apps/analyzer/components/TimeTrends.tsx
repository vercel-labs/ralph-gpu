'use client';

import { AggregatedStats } from '@/lib/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimeTrendsProps {
  stats: AggregatedStats;
}

export function TimeTrends({ stats }: TimeTrendsProps) {
  // Calculate if costs are trending up or down
  const costTrend = stats.costByDay.length >= 2
    ? stats.costByDay[stats.costByDay.length - 1].cost > stats.costByDay[0].cost
      ? 'up'
      : 'down'
    : 'stable';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Time-Based Trends</h3>
        {costTrend !== 'stable' && (
          <div className={`text-sm ${costTrend === 'up' ? 'text-accent-red' : 'text-accent-green'}`}>
            {costTrend === 'up' ? '↗' : '↘'} Costs trending {costTrend}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h4 className="text-sm font-semibold mb-3 text-foreground-secondary">Cost & Execution Frequency</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.costByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 11 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                yAxisId="cost"
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="count"
                orientation="right"
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
              />
              <Legend />
              <Bar yAxisId="cost" dataKey="cost" fill="#0070f3" name="Cost ($)" />
              <Bar yAxisId="count" dataKey="count" fill="#50e3c2" name="Executions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h4 className="text-sm font-semibold mb-3 text-foreground-secondary">Token Usage Over Time</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.tokensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 11 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="tokens" 
                stroke="#7928ca" 
                strokeWidth={2}
                dot={{ fill: '#7928ca', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
