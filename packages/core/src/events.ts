/**
 * Base event interface - all events extend this
 */
export interface GPUEvent {
  type: string;
  timestamp: number;  // performance.now()
  id: string;         // Unique event ID
}

/**
 * Generate unique event ID
 */
let eventIdCounter = 0;
export function generateEventId(): string {
  return `evt_${++eventIdCounter}_${performance.now().toFixed(0)}`;
}

// Draw event
export interface DrawEvent extends GPUEvent {
  type: "draw";
  phase: "start" | "end";  // Distinguish start vs end of draw call
  source: "pass" | "material" | "particles";
  label?: string;
  vertexCount?: number;
  instanceCount?: number;
  topology?: GPUPrimitiveTopology;
  target: "screen" | "texture";
  targetSize: [number, number];
}

// Compute event
export interface ComputeEvent extends GPUEvent {
  type: "compute";
  phase: "start" | "end";  // Distinguish start vs end of dispatch
  label?: string;
  workgroups?: [number, number, number];
  workgroupSize?: [number, number, number];
  totalInvocations?: number;
}

// Shader Compile event
export interface ShaderCompileEvent extends GPUEvent {
  type: "shader_compile";
  shaderType: "vertex" | "fragment" | "compute";
  label?: string;
  sourceLines?: number; // Assuming this refers to lines of code
  warnings?: string[];
  errors?: string[];
  compilationTime?: number; // in ms
}

// Memory event
export interface MemoryEvent extends GPUEvent {
  type: "memory";
  resourceType: "buffer" | "texture" | "sampler";
  label?: string;
  size?: number; // in bytes
  usage?: number; // GPUBufferUsageFlags or GPUTextureUsageFlags
  action: "allocate" | "free" | "resize";
}

// Target event (e.g., render target, swap chain)
export interface TargetEvent extends GPUEvent {
  type: "target";
  target: "screen" | "texture" | "mrt"; // Multiple Render Targets
  label?: string;
  size?: [number, number]; // width, height
  format?: GPUTextureFormat;
  action: "set" | "clear" | "resize" | "present"; // Added 'present' for swap chain
}

// Pipeline event
export interface PipelineEvent extends GPUEvent {
  type: "pipeline";
  pipelineType: "render" | "compute";
  label?: string;
  format?: GPUTextureFormat | "undefined"; // Render pipeline output format, or "undefined" for compute
  cacheHit: boolean;
}

// Frame event
export interface FrameEvent extends GPUEvent {
  type: "frame";
  frameNumber: number;
  deltaTime: number; // Time since last frame in ms
  time: number;      // Total time elapsed in ms
  phase: "start" | "end"; // To distinguish frame start and end
}

// GPU Timing Event
export interface GPUTimingEvent extends GPUEvent {
  type: "gpu_timing";
  label: string;
  gpuTime: number; // in ms
  cpuTime: number; // in ms
}

// Union type of all RalphGPU events
export type RalphGPUEvent =
  | DrawEvent
  | ComputeEvent
  | ShaderCompileEvent
  | MemoryEvent
  | TargetEvent
  | PipelineEvent
  | FrameEvent
  | GPUTimingEvent;

// Union type of all event type strings
export type EventType = RalphGPUEvent['type'];
