'use client';

import { ToolOverview as ToolOverviewType } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToolOverviewProps {
  overview: ToolOverviewType;
}

const COLORS = ['#0070f3', '#46a758', '#6e56cf', '#ffc53d', '#e5484d', '#f76b15'];

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
          className="flex items-center gap-2 text-blue-9 hover:text-blue-10 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>
        
        <h1 className="text-3xl font-bold text-gray-12 mb-2 font-mono">{overview.toolName}</h1>
        <p className="text-gray-11">
          Tool usage analysis across all ralph traces
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Total Calls</div>
          <div className="text-3xl font-bold text-blue-9">
            {overview.totalCalls.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Avg Duration</div>
          <div className="text-3xl font-bold text-purple-9">
            {overview.avgDuration.toFixed(0)}ms
          </div>
        </div>
        
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Success Rate</div>
          <div className="text-3xl font-bold text-green-9">
            {successRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Errors</div>
          <div className="text-3xl font-bold text-red-9">
            {overview.errorCount}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Usage by task */}
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-lg font-semibold text-gray-12 mb-4">Top 10 Tasks</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topTasks} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis 
                type="number" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="taskName" 
                stroke="#606060"
                tick={{ fill: '#b4b4b4', fontSize: 11 }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #222222',
                  borderRadius: '8px',
                  color: '#eeeeee'
                }}
              />
              <Bar dataKey="count" fill="#0070f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success/Error breakdown */}
        <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
          <h3 className="text-lg font-semibold text-gray-12 mb-4">Success vs Errors</h3>
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
                <Cell fill="#46a758" />
                <Cell fill="#e5484d" />
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
      </div>

      {/* Task List */}
      <div className="bg-gray-1 rounded-lg p-6 border border-gray-4 hover:border-gray-5 transition-colors">
        <h3 className="text-lg font-semibold text-gray-12 mb-4">All Tasks Using This Tool</h3>
        <div className="space-y-2">
          {overview.usageByTask.map((item) => (
            <button
              key={item.taskId}
              onClick={() => router.push(`/trace/${item.taskId}`)}
              className="w-full flex items-center justify-between p-3 bg-gray-2 rounded hover:bg-gray-3 transition-colors border border-gray-4"
            >
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm text-gray-12">{item.taskName}</div>
              </div>
              <div className="flex gap-6 text-sm text-gray-11">
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
