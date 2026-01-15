'use client';

import { AggregatedStats } from '@/lib/types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, DollarSign, Wrench, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OverviewStatsProps {
  stats: AggregatedStats;
}

const COLORS = ['#0070f3', '#50e3c2', '#7928ca', '#f5a623', '#ee0000', '#ff6b35'];

export function OverviewStats({ stats }: OverviewStatsProps) {
  const router = useRouter();
  
  const toolUsageData = Object.entries(stats.toolUsage)
    .map(([tool, count]) => ({ name: tool, value: count }))
    .sort((a, b) => b.value - a.value);

  const topCostTasks = stats.costByTask.slice(0, 10);
  const topIterationTasks = stats.iterationsByTask.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ralph Traces Overview</h1>
        <p className="text-foreground-secondary">
          Analyzing {stats.totalTasks} trace{stats.totalTasks !== 1 ? 's' : ''} across all ralph tasks
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-accent-blue" />
            <span className="text-sm text-foreground-secondary">Total Iterations</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalIterations.toLocaleString()}</div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-accent-green" />
            <span className="text-sm text-foreground-secondary">Total Cost</span>
          </div>
          <div className="text-3xl font-bold text-accent-green">
            ${stats.totalCost.toFixed(4)}
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-accent-purple" />
            <span className="text-sm text-foreground-secondary">Tool Calls</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalToolCalls.toLocaleString()}</div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-accent-red" />
            <span className="text-sm text-foreground-secondary">Errors</span>
          </div>
          <div className="text-3xl font-bold text-accent-red">{stats.totalErrors}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Costs */}
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <h3 className="text-lg font-semibold mb-4">Top 10 Tasks by Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCostTasks} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                type="number" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="taskName" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 11 }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `$${value.toFixed(4)}`}
              />
              <Bar dataKey="cost" fill="#0070f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Iterations */}
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <h3 className="text-lg font-semibold mb-4">Top 10 Tasks by Iterations</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIterationTasks} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                type="number" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="taskName" 
                stroke="#666"
                tick={{ fill: '#a1a1a1', fontSize: 11 }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="iterations" fill="#7928ca" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tool Usage */}
      <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
        <h3 className="text-lg font-semibold mb-4">Tool Usage Distribution</h3>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width="40%" height={300}>
            <PieChart>
              <Pie
                data={toolUsageData.slice(0, 6)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {toolUsageData.slice(0, 6).map((entry, index) => (
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

          <div className="flex-1 grid grid-cols-2 gap-3">
            {toolUsageData.map(({ name, value }, idx) => (
              <button
                key={name}
                onClick={() => router.push(`/tool/${name}`)}
                className="bg-background-tertiary rounded p-3 hover:bg-background-tertiary/70 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-mono text-sm font-semibold">{name}</span>
                </div>
                <div className="text-foreground-secondary text-sm">
                  {value.toLocaleString()} calls
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
