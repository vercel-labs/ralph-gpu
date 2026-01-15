'use client';

import Editor, { OnMount } from '@monaco-editor/react';
import { useCallback, useRef, useEffect } from 'react';

interface MonacoEditorProps {
  code: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  language?: string;
  height?: string;
}

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

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+Enter shortcut - uses ref to always get latest callback
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    onChange?.(value ?? '');
  }, [onChange]);

  return (
    <Editor
      height={height}
      language={language}
      theme="vs-dark"
      value={code}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
