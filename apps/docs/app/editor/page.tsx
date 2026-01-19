'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Predetermined skeleton line widths to avoid hydration mismatch
const SKELETON_WIDTHS = [65, 45, 70, 55, 80, 50, 75, 60, 40, 68, 58, 72, 48, 62, 77];

export default function EditorPage() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isUpdatingFromParentRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const handleEditorDidMount: OnMount = async (editor, monaco) => {
    editorRef.current = editor;

    // Define Vercel dark theme
    monaco.editor.defineTheme('vercel-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'fafafa', background: '000000' },
        { token: 'comment', foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'keyword.control', foreground: 'ff7b72' },
        { token: 'storage', foreground: 'ff7b72' },
        { token: 'storage.type', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'string.template', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'constant', foreground: '79c0ff' },
        { token: 'variable', foreground: 'ffa657' },
        { token: 'variable.parameter', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'type', foreground: '7ee787' },
        { token: 'type.identifier', foreground: '7ee787' },
        { token: 'class', foreground: '7ee787' },
        { token: 'interface', foreground: '7ee787' },
        { token: 'operator', foreground: 'fafafa' },
        { token: 'punctuation', foreground: 'a1a1a1' },
        { token: 'delimiter', foreground: 'a1a1a1' },
        { token: 'identifier', foreground: 'fafafa' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#fafafa',
        'editor.lineHighlightBackground': '#111111',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#1a3a5c',
        'editorLineNumber.foreground': '#444444',
        'editorLineNumber.activeForeground': '#666666',
        'editorCursor.foreground': '#fafafa',
        'editorWhitespace.foreground': '#333333',
        'editorIndentGuide.background': '#222222',
        'editorIndentGuide.activeBackground': '#333333',
        'editor.selectionHighlightBackground': '#264f7840',
        'editorBracketMatch.background': '#333333',
        'editorBracketMatch.border': '#555555',
        'scrollbarSlider.background': '#33333380',
        'scrollbarSlider.hoverBackground': '#44444480',
        'scrollbarSlider.activeBackground': '#55555580',
      },
    });

    monaco.editor.setTheme('vercel-dark');

    // Configure TypeScript
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: false,
      noEmit: true,
      lib: ['esnext', 'dom'],
    });

    // Load all ralph-gpu type files
    const typeFiles = [
      'index.d.ts',
      'context.d.ts',
      'pass.d.ts',
      'material.d.ts',
      'compute.d.ts',
      'target.d.ts',
      'ping-pong.d.ts',
      'mrt.d.ts',
      'storage.d.ts',
      'particles.d.ts',
      'sampler.d.ts',
      'errors.d.ts',
      'types.d.ts',
      'uniforms.d.ts',
      'events.d.ts',
      'event-emitter.d.ts',
      'profiler.d.ts',
    ];

    // Load each type file with proper path resolution
    for (const file of typeFiles) {
      try {
        const response = await fetch(`/dist/${file}`);
        let content = await response.text();

        // Replace relative imports with absolute module paths
        content = content.replace(/from\s+['"]\.\//g, 'from "ralph-gpu/');
        content = content.replace(/export\s+\*\s+from\s+['"]\.\//g, 'export * from "ralph-gpu/');

        const fileName = file.replace('.d.ts', '');
        const modulePath = `file:///node_modules/ralph-gpu/${fileName}.d.ts`;
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, modulePath);
      } catch (error) {
        console.warn(`Failed to load ${file}:`, error);
      }
    }

    // Create module declaration that maps 'ralph-gpu' to the index
    const moduleDeclaration = `
declare module 'ralph-gpu' {
  export * from 'ralph-gpu/index';
}
`;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      moduleDeclaration,
      'file:///node_modules/@types/ralph-gpu/package.d.ts'
    );

    // Suppress diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1378, 2345, 2531, 2792],
    });

    // Listen for content changes and send to parent
    editor.onDidChangeModelContent(() => {
      if (!isUpdatingFromParentRef.current) {
        const value = editor.getValue();
        window.parent.postMessage({ type: 'change', code: value }, '*');
      }
    });

    // Add Cmd/Ctrl+Enter shortcut to trigger run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.parent.postMessage({ type: 'run' }, '*');
    });

    setIsReady(true);
  };

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, code } = event.data || {};

      if (type === 'setCode' && editorRef.current && code !== undefined) {
        // Prevent change event from firing when updating from parent
        isUpdatingFromParentRef.current = true;
        const model = editorRef.current.getModel();
        if (model) {
          model.setValue(code);
        }
        // Reset flag after a short delay to allow Monaco to process
        setTimeout(() => {
          isUpdatingFromParentRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Notify parent that editor is ready
  useEffect(() => {
    if (isReady) {
      window.parent.postMessage({ type: 'ready' }, '*');
    }
  }, [isReady]);

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      {!isReady && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000000',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Line number column skeleton */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '14px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '2px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
            {/* Code lines skeleton */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SKELETON_WIDTHS.map((width, i) => (
                <div
                  key={i}
                  style={{
                    height: '14px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '2px',
                    width: `${width}%`,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <Editor
        defaultValue=""
        language="typescript"
        theme="vercel-dark"
        onMount={handleEditorDidMount}
        loading={null}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'Geist Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
