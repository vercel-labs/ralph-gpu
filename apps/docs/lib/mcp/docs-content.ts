import { readFileSync } from "fs";
import { join } from "path";

const CURSOR_RULE_PATH = join(process.cwd(), "../../.cursor/rules/ralph-gpu.mdc");
const DOCS_CONTENT_DIR = join(process.cwd(), "lib/mcp/content");

// Returns the comprehensive quickstart guide (same as cursor rule)
export function getQuickstartGuide(): string {
  try {
    const content = readFileSync(CURSOR_RULE_PATH, "utf-8");
    // Remove the frontmatter (---...---)
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, "");
    return withoutFrontmatter;
  } catch (error) {
    return "Quickstart guide not found. Error: " + String(error);
  }
}

export function getDocContent(topic: string): string {
  const filePath = join(DOCS_CONTENT_DIR, `${topic}.md`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    // Fallback: return a placeholder message
    return `Documentation for '${topic}' is being prepared. Please use get_started for comprehensive documentation.`;
  }
}

export interface SearchResult {
  topic: string;
  section: string;
  content: string;
  relevance: number;
}

export function searchDocs(query: string): SearchResult[] {
  // First, try to get the quickstart guide for searching
  const quickstart = getQuickstartGuide();
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Search within the quickstart guide
  const sections = quickstart.split(/^## /m);
  
  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split("\n");
    const sectionTitle = lines[0]?.trim() || "Introduction";
    const sectionContent = lines.slice(1).join("\n").trim();
    const sectionLower = sectionContent.toLowerCase();

    // Calculate relevance score
    let relevance = 0;
    for (const word of queryWords) {
      if (sectionLower.includes(word)) {
        relevance += (sectionLower.match(new RegExp(word, "g")) || []).length;
      }
      if (sectionTitle.toLowerCase().includes(word)) {
        relevance += 5; // Boost for title matches
      }
    }

    if (relevance > 0) {
      results.push({
        topic: "quickstart",
        section: sectionTitle,
        content: sectionContent.slice(0, 500) + (sectionContent.length > 500 ? "..." : ""),
        relevance,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
}