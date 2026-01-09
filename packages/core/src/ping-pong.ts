/**
 * Ping-pong buffer for iterative effects
 */

import { RenderTarget } from "./target";
import type { RenderTargetOptions } from "./types";

/**
 * Ping-pong buffer class
 */
export class PingPongTarget {
  private _read: RenderTarget;
  private _write: RenderTarget;

  constructor(
    device: GPUDevice,
    width: number,
    height: number,
    options: RenderTargetOptions = {}
  ) {
    this._read = new RenderTarget(device, width, height, options);
    this._write = new RenderTarget(device, width, height, options);
  }

  /**
   * Get the read target (current state)
   */
  get read(): RenderTarget {
    return this._read;
  }

  /**
   * Get the write target (next state)
   */
  get write(): RenderTarget {
    return this._write;
  }

  /**
   * Swap read and write targets
   */
  swap(): void {
    const temp = this._read;
    this._read = this._write;
    this._write = temp;
  }

  /**
   * Resize both targets
   */
  resize(width: number, height: number): void {
    this._read.resize(width, height);
    this._write.resize(width, height);
  }

  /**
   * Dispose both targets
   */
  dispose(): void {
    this._read.dispose();
    this._write.dispose();
  }
}
