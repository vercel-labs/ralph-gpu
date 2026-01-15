import { NextResponse } from "next/server";
import { loadTaskTrace } from "@/lib/trace-loader";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const trace = await loadTaskTrace(params.taskId);
    
    if (!trace) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(trace);
  } catch (error) {
    console.error("Error loading task trace:", error);
    return NextResponse.json(
      { error: "Failed to load task trace" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
