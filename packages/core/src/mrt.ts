/**
 * Multiple render targets
 */

import { RenderTarget } from "./target";
import type { MRTOutputs } from "./types";

/**
 * Multiple render target class
 */
export class MultiRenderTarget {
  private device: GPUDevice;
  private targets: Map<string, RenderTarget>;
  private _width: number;
  private _height: number;

  constructor(
    device: GPUDevice,
    outputs: MRTOutputs,
    width: number,
    height: number
  ) {
    this.device = device;
    this._width = width;
    this._height = height;
    this.targets = new Map();

    // Create a render target for each output
    for (const [name, options] of Object.entries(outputs)) {
      const target = new RenderTarget(device, width, height, options);
      this.targets.set(name, target);
    }
  }

  /**
   * Get a specific render target by name
   */
  get(name: string): RenderTarget | undefined {
    return this.targets.get(name);
  }

  /**
   * Get all render target views
   */
  getViews(): GPUTextureView[] {
    return Array.from(this.targets.values()).map((target) => target.view);
  }

  /**
   * Get all render target formats in order
   */
  getFormats(): string[] {
    return Array.from(this.targets.values()).map((target) => target.format);
  }

  /**
   * Get the first target (useful for getting format when only one target matters)
   */
  getFirstTarget(): RenderTarget | undefined {
    const firstEntry = this.targets.values().next();
    return firstEntry.done ? undefined : firstEntry.value;
  }

  /**
   * Get the width
   */
  get width(): number {
    return this._width;
  }

  /**
   * Get the height
   */
  get height(): number {
    return this._height;
  }

  /**
   * Resize all targets
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    for (const target of this.targets.values()) {
      target.resize(width, height);
    }
  }

  /**
   * Dispose all targets
   */
  dispose(): void {
    for (const target of this.targets.values()) {
      target.dispose();
    }
    this.targets.clear();
  }

  /**
   * Allow property access to targets
   */
  [key: string]: any;
}

// Add dynamic property access
const handler: ProxyHandler<MultiRenderTarget> = {
  get(target, prop) {
    if (typeof prop === "string" && !Reflect.has(target, prop)) {
      return target.get(prop);
    }
    return Reflect.get(target, prop);
  },
};

/**
 * Create a proxied MRT that allows direct property access
 */
export function createMultiRenderTarget(
  device: GPUDevice,
  outputs: MRTOutputs,
  width: number,
  height: number
): MultiRenderTarget {
  const mrt = new MultiRenderTarget(device, outputs, width, height);
  return new Proxy(mrt, handler);
}
