"use client";

import { useState } from "react";
import MonacoEditor from "../../components/MonacoEditor";

const DEFAULT_CODE = `// Sample TypeScript code
import { gpu } from "ralph-gpu";

async function main() {
  const canvas = document.querySelector("canvas")!;
  const ctx = await gpu.init(canvas);
  
  const pass = ctx.pass(\`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / globals.resolution;
      return vec4f(uv, 0.5, 1.0);
    }
  \`);
  
  function frame() {
    pass.draw();
    requestAnimationFrame(frame);
  }
  frame();
}

main();
`;

export default function TestMonacoPage() {
  const [code, setCode] = useState(DEFAULT_CODE);

  const handleRun = () => {
    console.log("Run! Code length:", code.length);
  };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      background: "#1e1e1e"
    }}>
      <div style={{ 
        padding: "1rem", 
        borderBottom: "1px solid #333",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, color: "#fff" }}>Monaco Editor Test</h1>
        <button 
          onClick={handleRun}
          style={{
            padding: "0.5rem 1rem",
            background: "#0e639c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Run (Cmd+Enter)
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <MonacoEditor 
          value={code} 
          onChange={setCode} 
          language="typescript"
          onRun={handleRun}
        />
      </div>
    </div>
  );
}
