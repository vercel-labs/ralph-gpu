'use client';

import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { useCallback, useRef, useEffect } from 'react';

interface MonacoEditorProps {
  code: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  language?: string;
  height?: string;
}

// Type definitions for ralph-gpu to suppress module not found errors
const ralphGpuTypes = `
declare module 'ralph-gpu' {
  export interface GPUContext {
    pass(shader: string, options?: { uniforms?: Record<string, any> }): Pass;
    material(shader: string, options?: any): Material;
    compute(shader: string, options?: any): ComputeShader;
    target(width: number, height: number, options?: any): RenderTarget;
    pingPong(width: number, height: number, options?: any): PingPongTarget;
    storage(byteSize: number): StorageBuffer;
    particles(count: number, options: any): Particles;
    createSampler(descriptor?: any): Sampler;
    setTarget(target: RenderTarget | null): void;
    clear(target?: RenderTarget | null, color?: number[]): void;
    resize(width: number, height: number): void;
    dispose(): void;
    clearColor: number[];
    autoClear: boolean;
    paused: boolean;
    timeScale: number;
    time: number;
    dpr: number;
  }
  
  export interface Pass {
    draw(): void;
    storage(name: string, buffer: StorageBuffer): void;
    set(key: string, value: any): void;
    uniforms: Record<string, { value: any }>;
    dispose(): void;
  }
  
  export interface Material {
    draw(): void;
    storage(name: string, buffer: StorageBuffer): void;
    uniforms: Record<string, { value: any }>;
    dispose(): void;
  }
  
  export interface ComputeShader {
    dispatch(x: number, y?: number, z?: number): void;
    storage(name: string, buffer: StorageBuffer): void;
    uniforms: Record<string, { value: any }>;
    dispose(): void;
  }
  
  export interface RenderTarget {
    texture: any;
    gpuTexture: GPUTexture;
    view: GPUTextureView;
    sampler: GPUSampler;
    width: number;
    height: number;
    format: string;
    resize(width: number, height: number): void;
    readPixels(x?: number, y?: number, w?: number, h?: number): Promise<Uint8Array | Float32Array>;
    dispose(): void;
  }
  
  export interface PingPongTarget {
    read: RenderTarget;
    write: RenderTarget;
    swap(): void;
    resize(width: number, height: number): void;
    dispose(): void;
  }
  
  export interface StorageBuffer {
    write(data: Float32Array | Uint32Array): void;
    gpuBuffer: GPUBuffer;
    byteSize: number;
    dispose(): void;
  }
  
  export interface Particles {
    write(data: Float32Array | Uint32Array): void;
    draw(): void;
    storageBuffer: StorageBuffer;
    dispose(): void;
  }
  
  export interface Sampler {
    gpuSampler: GPUSampler;
    dispose(): void;
  }
  
  export const gpu: {
    isSupported(): boolean;
    init(canvas: HTMLCanvasElement, options?: { autoResize?: boolean; dpr?: number; debug?: boolean }): Promise<GPUContext>;
  };
  
  export class WebGPUNotSupportedError extends Error {}
  export class DeviceCreationError extends Error {}
  export class ShaderCompileError extends Error {
    line?: number;
    column?: number;
  }
}
`;

export function MonacoEditor({
  code,
  onChange,
  onRun,
  language = 'typescript',
  height = '100%',
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const onRunRef = useRef(onRun);

  // Keep ref updated with latest callback
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleEditorWillMount: BeforeMount = useCallback((monaco) => {
    // Define Vercel-inspired dark theme
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

    // Configure TypeScript compiler options for top-level await and module resolution
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

    // Add ralph-gpu type definitions
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      ralphGpuTypes,
      'file:///node_modules/@types/ralph-gpu/index.d.ts'
    );

    // Suppress diagnostics that aren't relevant for this sandbox environment
    // 1378: Top-level await error (we want to allow it in examples)
    // 2345: Argument type mismatch (getElementById returns HTMLElement, not HTMLCanvasElement)
    // 2531: Object is possibly null (getElementById can return null)
    // 2792: Cannot find module (handled by our type definitions)
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1378, 2345, 2531, 2792],
    });
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+Enter shortcut - uses ref to always get latest callback
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });

    // Force layout refresh after a short delay to fix mobile rendering
    // Monaco sometimes doesn't calculate its size correctly on initial render
    setTimeout(() => {
      editor.layout();
    }, 100);
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    onChange?.(value ?? '');
  }, [onChange]);

  return (
    <Editor
      height={height}
      language={language}
      theme="vercel-dark"
      value={code}
      onChange={handleChange}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorMount}
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
  );
}
