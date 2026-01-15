import { NextResponse } from 'next/server';
import { loadAllTraces, calculateAggregatedStats } from '@/lib/trace-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await loadAllTraces();
    const stats = calculateAggregatedStats(tasks);

    return NextResponse.json({
      tasks,
      stats,
    });
  } catch (error) {
    console.error('Error loading traces:', error);
    return NextResponse.json(
      { error: 'Failed to load traces', details: String(error) },
      { status: 500 }
    );
  }
}
