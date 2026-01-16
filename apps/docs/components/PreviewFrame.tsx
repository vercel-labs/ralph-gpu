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
  const isLoadedRef = useRef(false);
  const hasSucceededRef = useRef(false);

  // Track latest code
  const latestCodeRef = useRef<string | null>(null);
  latestCodeRef.current = code;
  
  // Ref callback to handle iframe mounting and loading
  const iframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    
    const handleLoad = () => {
      isLoadedRef.current = true;
      // Small delay to ensure iframe's message listener is set up
      setTimeout(() => {
        if (latestCodeRef.current) {
          runCodeDirect(iframe, latestCodeRef.current);
        }
      }, 100);
    };
    
    // Add load event listener
    iframe.addEventListener('load', handleLoad);
    
    // Also check if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }
  }, []);

  // Direct send function (doesn't depend on ref)
  const runCodeDirect = useCallback((iframe: HTMLIFrameElement, codeToRun: string) => {
    if (!iframe?.contentWindow) return;
    hasSucceededRef.current = false;
    iframe.contentWindow.postMessage({ type: 'run', code: codeToRun }, '*');
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, message } = event.data || {};
      
      if (type === 'error') {
        hasSucceededRef.current = false;
        onError?.(message);
      } else if (type === 'success') {
        hasSucceededRef.current = true;
        onError?.(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError]);

  // Store iframe element for effects
  const iframeElementRef = useRef<HTMLIFrameElement | null>(null);
  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeElementRef.current = iframe;
    iframeRef(iframe);
  }, [iframeRef]);
  
  // Run code when it changes (if iframe is loaded)
  useEffect(() => {
    if (code === null || !isLoadedRef.current || !iframeElementRef.current) return;
    runCodeDirect(iframeElementRef.current, code);
  }, [code, runCodeDirect]);

  // Retry mechanism - if code hasn't succeeded after 500ms, retry
  useEffect(() => {
    if (!code || !isLoadedRef.current || !iframeElementRef.current) return;
    
    const timer = setTimeout(() => {
      // Retry if we haven't received success
      if (!hasSucceededRef.current && iframeElementRef.current) {
        runCodeDirect(iframeElementRef.current, code);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [code, runCodeDirect]);

  return (
    <iframe
      ref={setIframeRef}
      src="/preview.html"
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      title="Shader Preview"
    />
  );
}
