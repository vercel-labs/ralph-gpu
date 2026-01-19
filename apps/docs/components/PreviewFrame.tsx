'use client';

import { useCallback, useEffect, useRef } from 'react';

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

  // Direct send function
  const runCodeDirect = useCallback((iframe: HTMLIFrameElement, codeToRun: string) => {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'run', code: codeToRun }, '*');
  }, []);

  // Ref callback to handle iframe mounting and loading
  const iframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;

    iframeElementRef.current = iframe;
    hasRunRef.current = false; // Reset run flag on new iframe mount

    const handleLoad = () => {
      // Small delay to ensure iframe's message listener is set up
      setTimeout(() => {
        if (!hasRunRef.current && code && iframe.contentWindow) {
          hasRunRef.current = true;
          runCodeDirect(iframe, code);
        }
      }, 100);
    };

    // Add load event listener
    iframe.addEventListener('load', handleLoad);

    // Also check if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }
  }, [code, runCodeDirect]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, message } = event.data || {};

      if (type === 'error') {
        onError?.(message);
      } else if (type === 'success') {
        onError?.(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError]);

  return (
    <iframe
      ref={iframeRef}
      src="/preview.html"
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      title="Shader Preview"
    />
  );
}
