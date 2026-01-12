"use client";

import { useState, useEffect } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

// Language display names and colors
const languageConfig: Record<string, { name: string; color: string }> = {
  typescript: { name: "TypeScript", color: "#3178c6" },
  ts: { name: "TypeScript", color: "#3178c6" },
  javascript: { name: "JavaScript", color: "#f7df1e" },
  js: { name: "JavaScript", color: "#f7df1e" },
  wgsl: { name: "WGSL", color: "#ff6b35" },
  bash: { name: "Bash", color: "#4eaa25" },
  shell: { name: "Shell", color: "#4eaa25" },
  json: { name: "JSON", color: "#292929" },
  html: { name: "HTML", color: "#e34c26" },
  css: { name: "CSS", color: "#1572b6" },
};

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const langConfig = languageConfig[language] || { name: language.toUpperCase(), color: "#888" };

  useEffect(() => {
    let mounted = true;
    
    async function highlightCode() {
      try {
        // Dynamically import shiki
        const { createHighlighter } = await import("shiki");
        
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: ["typescript", "javascript", "tsx", "jsx", "json", "bash", "html", "css", "wgsl"],
        });

        if (!mounted) return;
        
        const html = highlighter.codeToHtml(code.trim(), {
          lang: language,
          theme: "github-dark",
        });
        
        setHighlightedHtml(html);
      } catch (error) {
        console.warn("Shiki highlighting failed, using fallback:", error);
        // Fallback to plain code
        setHighlightedHtml(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    highlightCode();
    
    return () => {
      mounted = false;
    };
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="group relative rounded-lg border border-[#333] bg-[#0a0a0a] overflow-hidden my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#111]">
        <div className="flex items-center gap-2">
          {filename ? (
            <span className="text-sm text-[#a1a1a1]">{filename}</span>
          ) : (
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#666]" />
              <span className="text-sm text-[#a1a1a1]" style={{ color: langConfig.color }}>
                {langConfig.name}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-[#333] transition-colors text-[#666] hover:text-[#fafafa]"
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto">
        {showLineNumbers ? (
          <div className="flex">
            {/* Line numbers */}
            <div className="flex-none py-4 pl-4 pr-3 text-right select-none border-r border-[#333] bg-[#0a0a0a]">
              {lines.map((_, i) => (
                <div key={i} className="text-sm leading-6 text-[#444] font-mono">
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Code */}
            <div className="flex-1 py-4 px-4 overflow-x-auto">
              {isLoading ? (
                <pre className="text-sm leading-6 font-mono text-[#a1a1a1]">
                  <code>{code.trim()}</code>
                </pre>
              ) : highlightedHtml ? (
                <div 
                  className="text-sm leading-6 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!bg-transparent"
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              ) : (
                <pre className="text-sm leading-6 font-mono text-[#a1a1a1]">
                  <code>{code.trim()}</code>
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 px-4 overflow-x-auto">
            {isLoading ? (
              <pre className="text-sm leading-6 font-mono text-[#a1a1a1]">
                <code>{code.trim()}</code>
              </pre>
            ) : highlightedHtml ? (
              <div 
                className="text-sm leading-6 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <pre className="text-sm leading-6 font-mono text-[#a1a1a1]">
                <code>{code.trim()}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
