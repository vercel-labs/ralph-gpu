export interface Example {
  slug: string;
  title: string;
  description: string;
  shader?: string;  // WGSL shader for simple single-pass examples
  code: string;     // Full API code for display and execution
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
  // If true, execute the full code instead of extracting shader
  // Required for multi-pass examples (pingPong, render targets, etc.)
  executable?: boolean;
}
