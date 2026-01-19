'use client';

import { useCallback, useEffect, useRef } from 'react';

interface EditorFrameProps {
  initialCode: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
}

/**
 * Renders Monaco editor in an iframe to avoid Shadow DOM issues with keyboard events.
 * Communicates with the editor iframe via postMessage for bidirectional updates.
 */
export function EditorFrame({ initialCode, onChange, onRun }: EditorFrameProps) {
  const isReadyRef = useRef(false);
  const iframeElementRef = useRef<HTMLIFrameElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const lastReceivedCodeRef = useRef<string>(initialCode);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Ref callback to handle iframe mounting and loading
  const iframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;

    iframeElementRef.current = iframe;

    const handleLoad = () => {
      isReadyRef.current = true;
      // Initial code will be sent when we receive 'ready' message from iframe
    };

    iframe.addEventListener('load', handleLoad);

    // Check if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, code: newCode } = event.data || {};

      if (type === 'ready') {
        // Editor is ready, send initial code
        if (iframeElementRef.current?.contentWindow) {
          iframeElementRef.current.contentWindow.postMessage(
            { type: 'setCode', code: initialCode },
            '*'
          );
        }
      } else if (type === 'change') {
        // Code changed in editor
        lastReceivedCodeRef.current = newCode;
        onChangeRef.current?.(newCode);
      } else if (type === 'run') {
        // User pressed Cmd/Ctrl+Enter in editor
        onRunRef.current?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [initialCode]);

  return (
    <iframe
      ref={iframeRef}
      src="/editor"
      className="w-full h-full border-0"
      title="Monaco Editor"
    />
  );
}
