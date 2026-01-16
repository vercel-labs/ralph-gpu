import { getQuickstartGuide } from "@/lib/mcp/docs-content";

export async function GET() {
  const content = getQuickstartGuide();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
