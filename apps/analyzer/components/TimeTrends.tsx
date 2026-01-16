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
        <h3 className="text-lg font-semibold text-gray-12">Time-Based Trends</h3>
        {costTrend !== 'stable' && (
          <div className={`text-sm ${costTrend === 'up' ? 'text-red-9' : 'text-green-9'}`}>
            {costTrend === 'up' ? '↗' : '↘'} Costs trending {costTrend}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11">Cost & Execution Frequency</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.costByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis 
                dataKey="date" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 11 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                yAxisId="cost"
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="count"
                orientation="right"
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
                labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
              />
              <Legend />
              <Bar yAxisId="cost" dataKey="cost" fill="#0070f3" name="Cost ($)" />
              <Bar yAxisId="count" dataKey="count" fill="#46a758" name="Executions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11">Token Usage Over Time</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.tokensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis 
                dataKey="date" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 11 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="tokens" 
                stroke="#6e56cf" 
                strokeWidth={2}
                dot={{ fill: '#6e56cf', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
