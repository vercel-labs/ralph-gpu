import { NextResponse } from 'next/server';
import { loadAllTraces, getToolOverview } from '@/lib/trace-loader';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { toolName: string } }
) {
  try {
    const tasks = await loadAllTraces();
    const overview = getToolOverview(tasks, params.toolName);

    if (overview.totalCalls === 0) {
      return NextResponse.json(
        { error: 'Tool not found or has no usage' },
        { status: 404 }
      );
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Error loading tool overview:', error);
    return NextResponse.json(
      { error: 'Failed to load tool overview', details: String(error) },
      { status: 500 }
    );
  }
}
