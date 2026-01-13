/**
 * PingPongTarget - Dual render target for iterative effects
 * 
 * Provides two render targets that can be swapped for effects
 * that need to read from and write to the same texture (blur, diffusion, etc).
 * 
 * Equivalent to the PingPongTarget class in ralph-gpu.
 */

import type { GLContext } from './context'
import type { RenderTargetOptions } from './types'
import { RenderTarget } from './target'

export class PingPongTarget {
  /** Current read target */
  read: RenderTarget
  
  /** Current write target */
  write: RenderTarget
  
  private _ctx: GLContext
  
  constructor(ctx: GLContext, width?: number, height?: number, options?: RenderTargetOptions) {
    this._ctx = ctx
    
    // Create two render targets
    // Pass data to read buffer, write buffer starts empty
    this.read = new RenderTarget(ctx, width, height, options)
    
    // Create write buffer without data (starts empty)
    const writeOptions = options ? { ...options, data: undefined } : undefined
    this.write = new RenderTarget(ctx, width, height, writeOptions)
  }
  
  /**
   * Swap read and write targets
   */
  swap(): void {
    const temp = this.read
    this.read = this.write
    this.write = temp
  }
  
  /**
   * Resize both targets
   */
  resize(width: number, height: number): void {
    this.read.resize(width, height)
    this.write.resize(width, height)
  }
  
  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    this.read.dispose()
    this.write.dispose()
  }
}
