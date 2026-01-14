/**
 * Profiler - High-level API for tracking GPU operations and performance metrics
 */

import type { GPUContext } from "./context";
import type { RalphGPUEvent, FrameEvent, DrawEvent, ComputeEvent } from "./events";

/**
 * Statistics for a profiled region
 */
export interface ProfilerRegion {
  name: string;
  calls: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  averageTime: number;
  lastTime: number;
}

/**
 * Summary of a region within a frame
 */
export interface RegionSummary {
  calls: number;
  totalTime: number;
}

/**
 * Profile data for a single frame
 */
export interface FrameProfile {
  frameNumber: number;
  timestamp: number;
  duration: number;
  regions: Map<string, RegionSummary>;
  drawCalls: number;
  computeDispatches: number;
}

/**
 * Frame time statistics
 */
export interface FrameStats {
  frameCount: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  averageTime: number;
  lastTime: number;
}

/**
 * Profiler options
 */
export interface ProfilerOptions {
  maxFrameHistory?: number;
  autoTrackFrames?: boolean;
}

/**
 * Internal structure to track active region timings
 */
interface ActiveRegion {
  startTime: number;
  events: RalphGPUEvent[];
}

/**
 * Profiler class for tracking GPU operations and performance metrics
 */
export class Profiler {
  private ctx: GPUContext;
  private enabled = true;
  private maxFrameHistory: number;
  private autoTrackFrames: boolean;

  // Region tracking
  private regions = new Map<string, ProfilerRegion>();
  private activeRegions = new Map<string, ActiveRegion>();

  // Frame tracking
  private frameHistory: FrameProfile[] = [];
  private currentFrameStartTime = 0;
  private currentFrameNumber = 0;
  private currentFrameEvents: RalphGPUEvent[] = [];
  private currentFrameRegions = new Map<string, RegionSummary>();
  private lastFrameStartTime = 0; // For measuring frame interval (FPS)
  private frameStats: FrameStats = {
    frameCount: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
    averageTime: 0,
    lastTime: 0,
  };
  
  // Manual tick tracking (for use with pass.draw() API)
  private lastTickTime = 0;
  private tickHistory: number[] = []; // stores frame intervals
  private maxTickHistory = 120;
  
  // Per-tick (animation frame) stats
  private tickDrawCalls = 0;
  private tickComputeDispatches = 0;
  private lastTickDrawCalls = 0;
  private lastTickComputeDispatches = 0;

  // Event subscription cleanup
  private unsubscribe: (() => void) | null = null;

  constructor(ctx: GPUContext, options: ProfilerOptions = {}) {
    this.ctx = ctx;
    this.maxFrameHistory = options.maxFrameHistory ?? 120;
    this.autoTrackFrames = options.autoTrackFrames ?? true;

    // Subscribe to all events
    this.unsubscribe = ctx.onAll((event) => this.handleEvent(event));
  }

  /**
   * Handle incoming events from GPUContext
   */
  private handleEvent(event: RalphGPUEvent): void {
    if (!this.enabled) return;

    // Track events during active frame
    if (this.currentFrameStartTime > 0) {
      this.currentFrameEvents.push(event);
    }

    // Count draw/compute calls per tick (animation frame)
    // Only count "start" phase to avoid double-counting
    if (event.type === "draw" && (event as DrawEvent).phase === "start") {
      this.tickDrawCalls++;
    } else if (event.type === "compute" && (event as ComputeEvent).phase === "start") {
      this.tickComputeDispatches++;
    }

    // Handle frame events
    if (event.type === "frame") {
      const frameEvent = event as FrameEvent;
      if (frameEvent.phase === "start") {
        this.onFrameStart(frameEvent);
      } else if (frameEvent.phase === "end") {
        this.onFrameEnd(frameEvent);
      }
    }
  }

  /**
   * Handle frame start event
   */
  private onFrameStart(event: FrameEvent): void {
    // Calculate frame interval (time since last frame start) for FPS
    const frameInterval = this.lastFrameStartTime > 0 
      ? event.timestamp - this.lastFrameStartTime 
      : 0;
    
    // Update frame interval stats (this is what FPS is based on)
    if (frameInterval > 0) {
      this.frameStats.frameCount++;
      this.frameStats.totalTime += frameInterval;
      this.frameStats.lastTime = frameInterval;
      if (frameInterval < this.frameStats.minTime) {
        this.frameStats.minTime = frameInterval;
      }
      if (frameInterval > this.frameStats.maxTime) {
        this.frameStats.maxTime = frameInterval;
      }
      this.frameStats.averageTime = this.frameStats.totalTime / this.frameStats.frameCount;
    }
    
    this.lastFrameStartTime = event.timestamp;
    this.currentFrameStartTime = event.timestamp;
    this.currentFrameNumber = event.frameNumber;
    this.currentFrameEvents = [];
    this.currentFrameRegions.clear();
  }

  /**
   * Handle frame end event
   */
  private onFrameEnd(event: FrameEvent): void {
    if (this.currentFrameStartTime === 0) return;

    const duration = event.timestamp - this.currentFrameStartTime;

    // Count draw calls and compute dispatches from events
    // Only count "start" phase to avoid double-counting (start + end events)
    let drawCalls = 0;
    let computeDispatches = 0;

    for (const evt of this.currentFrameEvents) {
      if (evt.type === "draw" && (evt as DrawEvent).phase === "start") {
        drawCalls++;
      } else if (evt.type === "compute" && (evt as ComputeEvent).phase === "start") {
        computeDispatches++;
      }
    }

    // Build frame profile
    const frameProfile: FrameProfile = {
      frameNumber: this.currentFrameNumber,
      timestamp: this.currentFrameStartTime,
      duration,
      regions: new Map(this.currentFrameRegions),
      drawCalls,
      computeDispatches,
    };

    // Add to history
    this.frameHistory.push(frameProfile);
    if (this.frameHistory.length > this.maxFrameHistory) {
      this.frameHistory.shift();
    }

    // Note: Frame interval stats are updated in onFrameStart for accurate FPS
    // The 'duration' here is render time, which is stored in frameProfile.duration

    // Reset for next frame
    this.currentFrameStartTime = 0;
    this.currentFrameNumber = 0;
    this.currentFrameEvents = [];
    this.currentFrameRegions.clear();
  }

  /**
   * Begin a profiled region
   */
  begin(name: string): void {
    if (!this.enabled) return;

    this.activeRegions.set(name, {
      startTime: performance.now(),
      events: [],
    });
  }

  /**
   * End a profiled region
   */
  end(name: string): void {
    if (!this.enabled) return;

    const active = this.activeRegions.get(name);
    if (!active) {
      console.warn(`Profiler: end() called for unknown region "${name}"`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - active.startTime;

    // Update region statistics
    let region = this.regions.get(name);
    if (!region) {
      region = {
        name,
        calls: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        averageTime: 0,
        lastTime: 0,
      };
      this.regions.set(name, region);
    }

    region.calls++;
    region.totalTime += duration;
    region.lastTime = duration;
    if (duration < region.minTime) {
      region.minTime = duration;
    }
    if (duration > region.maxTime) {
      region.maxTime = duration;
    }
    region.averageTime = region.totalTime / region.calls;

    // Track region within current frame
    let frameRegion = this.currentFrameRegions.get(name);
    if (!frameRegion) {
      frameRegion = { calls: 0, totalTime: 0 };
      this.currentFrameRegions.set(name, frameRegion);
    }
    frameRegion.calls++;
    frameRegion.totalTime += duration;

    // Remove from active regions
    this.activeRegions.delete(name);
  }

  /**
   * Get statistics for a specific region
   */
  getRegion(name: string): ProfilerRegion | undefined {
    return this.regions.get(name);
  }

  /**
   * Get all region statistics
   */
  getResults(): Map<string, ProfilerRegion> {
    return new Map(this.regions);
  }

  /**
   * Get frame time statistics
   */
  getFrameStats(): FrameStats {
    return { ...this.frameStats };
  }

  /**
   * Call once per animation frame to track real FPS.
   * Works with regular pass.draw() - no need to change your rendering code.
   * 
   * @example
   * function animate() {
   *   profiler.tick();
   *   myPass.draw();
   *   requestAnimationFrame(animate);
   * }
   */
  tick(): void {
    const now = performance.now();
    
    if (this.lastTickTime > 0) {
      const interval = now - this.lastTickTime;
      this.tickHistory.push(interval);
      
      if (this.tickHistory.length > this.maxTickHistory) {
        this.tickHistory.shift();
      }
    }
    
    // Save and reset per-tick stats
    this.lastTickDrawCalls = this.tickDrawCalls;
    this.lastTickComputeDispatches = this.tickComputeDispatches;
    this.tickDrawCalls = 0;
    this.tickComputeDispatches = 0;
    
    this.lastTickTime = now;
  }
  
  /**
   * Get draw calls from the last animation frame (tick).
   * This counts all draw calls between tick() calls, regardless of GPU frame boundaries.
   */
  getDrawCallsPerTick(): number {
    return this.lastTickDrawCalls;
  }
  
  /**
   * Get compute dispatches from the last animation frame (tick).
   */
  getComputeDispatchesPerTick(): number {
    return this.lastTickComputeDispatches;
  }

  /**
   * Get current FPS based on tick() calls.
   * Returns 0 if tick() hasn't been called enough times.
   */
  getFPS(sampleCount = 60): number {
    if (this.tickHistory.length < 2) return 0;
    
    const samples = this.tickHistory.slice(-sampleCount);
    const avgInterval = samples.reduce((a, b) => a + b, 0) / samples.length;
    
    return avgInterval > 0 ? 1000 / avgInterval : 0;
  }

  /**
   * Get frame profile by frame number
   */
  getFrameProfile(frameNumber: number): FrameProfile | undefined {
    return this.frameHistory.find((f) => f.frameNumber === frameNumber);
  }

  /**
   * Get the last N frames
   */
  getLastFrames(count: number): FrameProfile[] {
    return this.frameHistory.slice(-count);
  }

  /**
   * Get average frame time over the last N frames
   */
  getAverageFrameTime(frames?: number): number {
    const n = frames ?? this.frameHistory.length;
    const slice = this.frameHistory.slice(-n);
    if (slice.length < 2) return 0;
    
    // Calculate frame intervals from timestamps (not render duration)
    let totalInterval = 0;
    for (let i = 1; i < slice.length; i++) {
      totalInterval += slice[i].timestamp - slice[i - 1].timestamp;
    }
    return totalInterval / (slice.length - 1);
  }
  
  /**
   * Get average render time (GPU work duration, not frame interval)
   */
  getAverageRenderTime(frames?: number): number {
    const n = frames ?? this.frameHistory.length;
    const slice = this.frameHistory.slice(-n);
    if (slice.length === 0) return 0;
    const total = slice.reduce((sum, f) => sum + f.duration, 0);
    return total / slice.length;
  }

  /**
   * Reset all profiling data
   */
  reset(): void {
    this.regions.clear();
    this.activeRegions.clear();
    this.frameHistory = [];
    this.currentFrameStartTime = 0;
    this.currentFrameNumber = 0;
    this.currentFrameEvents = [];
    this.currentFrameRegions.clear();
    this.lastFrameStartTime = 0;
    this.lastTickTime = 0;
    this.tickHistory = [];
    this.tickDrawCalls = 0;
    this.tickComputeDispatches = 0;
    this.lastTickDrawCalls = 0;
    this.lastTickComputeDispatches = 0;
    this.frameStats = {
      frameCount: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      averageTime: 0,
      lastTime: 0,
    };
  }

  /**
   * Enable or disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if profiler is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Dispose the profiler and unsubscribe from events
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.reset();
  }
}
