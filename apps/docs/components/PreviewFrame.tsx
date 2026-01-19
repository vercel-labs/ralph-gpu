'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PreviewFrameProps {
  code: string | null;
  onError?: (error: string | null) => void;
}

/**
 * Renders a sandboxed iframe that executes shader code.
 * Communicates with the preview page via postMessage.
 */
export function PreviewFrame({ code, onError }: PreviewFrameProps) {
  const iframeElementRef = useRef<HTMLIFrameElement | null>(null);
  const hasRunRef = useRef(false);
  const isReadyRef = useRef(false);
  const pendingCodeRef = useRef<string | null>(code);
  pendingCodeRef.current = code

  const [initialized, setInitialized] = useState(false)

  // Direct send function
  const runCodeDirect = useCallback((iframe: HTMLIFrameElement, codeToRun: string) => {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'run', code: codeToRun }, '*');
  }, []);

  const runCodeDirectRef = useRef(runCodeDirect)
  runCodeDirectRef.current = runCodeDirect

  // Ref callback to handle iframe mounting and loading
  const iframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;

    iframeElementRef.current = iframe;
    hasRunRef.current = false; // Reset run flag on new iframe mount
    isReadyRef.current = false; // Reset ready flag
  }, []);

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from the preview iframe, not from editor iframe
      if (event.source !== iframeElementRef.current?.contentWindow) {
        return;
      }

      const { type, message } = event.data || {};

      if (type === 'preview-iframe-ready') {
        console.log('Ready recieved');
        isReadyRef.current = true;
        console.log(pendingCodeRef.current, hasRunRef.current);


        // Run pending code if we have it
        if (pendingCodeRef.current && !hasRunRef.current && iframeElementRef.current) {
          hasRunRef.current = true;
          runCodeDirectRef.current(iframeElementRef.current, pendingCodeRef.current);
          pendingCodeRef.current = null;
        }
      } else if (type === 'error') {
        onErrorRef.current?.(message);
      } else if (type === 'success') {
        onErrorRef.current?.(null);
      }
    };

    window.addEventListener('message', handleMessage);
    console.log("initialized listener");

    setInitialized(true)
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!code) return null

  return (
    <iframe
      ref={iframeRef}
      src={initialized ? "/preview.html" : "about:blank"}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      title="Shader Preview"
    />
  );
}


/**

window.addEventListener('message', handleMessage);
return () => window.removeEventListener('message', handleMessage);


<iframe
  ref={iframeRef}
  src={initialized ? "/preview.html" : "about:blank"}
  className="w-full h-full border-0"
  sandbox="allow-scripts allow-same-origin"
  title="Shader Preview"
/>


 */