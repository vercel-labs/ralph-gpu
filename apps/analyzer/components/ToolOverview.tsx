'use client';

import { ToolOverview as ToolOverviewType } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToolOverviewProps {
  overview: ToolOverviewType;
}

const COLORS = ['#0070f3', '#50e3c2', '#7928ca', '#f5a623', '#ee0000', '#ff6b35'];

export function ToolOverview({ overview }: ToolOverviewProps) {
  const router = useRouter();
  
  const successRate = overview.totalCalls > 0 
    ? (overview.successCount / overview.totalCalls) * 100 
    : 0;

  const statusData = [
    { name: 'Success', value: overview.successCount },
    { name: 'Error', value: overview.errorCount },
  ];

  const topTasks = overview.usageByTask.slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-accent-blue hover:text-accent-blue-hover mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>
        
        <h1 className="text-3xl font-bold mb-2 font-mono">{overview.toolName}</h1>
        <p className="text-foreground-secondary">
          Tool usage analysis across all ralph traces
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Total Calls</div>
          <div className="text-3xl font-bold text-accent-blue">
            {overview.totalCalls.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Avg Duration</div>
          <div className="text-3xl font-bold text-accent-purple">
            {overview.avgDuration.toFixed(0)}ms
          </div>
        </div>
        
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Success Rate</div>
          <div className="text-3xl font-bold text-accent-green">
            {successRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Errors</div>
          <div className="text-3xl font-bold text-accent-red">
            {overview.errorCount}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Usage by task */}
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <h3 className="text-lg font-semibold mb-4">Top 10 Tasks</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topTasks} layout="vertical">
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
              <Bar dataKey="count" fill="#0070f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success/Error breakdown */}
        <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
          <h3 className="text-lg font-semibold mb-4">Success vs Errors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#50e3c2" />
                <Cell fill="#ee0000" />
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
      </div>

      {/* Task List */}
      <div className="bg-background-secondary rounded-lg p-6 border border-foreground-muted/20">
        <h3 className="text-lg font-semibold mb-4">All Tasks Using This Tool</h3>
        <div className="space-y-2">
          {overview.usageByTask.map((item) => (
            <button
              key={item.taskId}
              onClick={() => router.push(`/trace/${item.taskId}`)}
              className="w-full flex items-center justify-between p-3 bg-background-tertiary rounded hover:bg-background-tertiary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm">{item.taskName}</div>
              </div>
              <div className="flex gap-6 text-sm text-foreground-secondary">
                <span>{item.count} calls</span>
                <span>{item.avgDuration.toFixed(0)}ms avg</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
