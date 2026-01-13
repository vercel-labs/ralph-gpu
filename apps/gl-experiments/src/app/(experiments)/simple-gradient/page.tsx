'use client'

import { useEffect, useRef } from 'react'
import { gl, GLContext } from 'ralph-gl'

export default function SimpleGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let ctx: GLContext
    let animationId: number

    // Initialize ralph-gl
    async function init() {
      try {
        if(!canvas) return
        // Initialize context
        ctx = await gl.init(canvas, {
          autoResize: true
        })

        // Create a simple gradient shader pass
        const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  // Get normalized coordinates with aspect ratio correction
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  
  // Adjust UV to respect aspect ratio (centered)
  vec2 aspectUv = uv;
  aspectUv.x = (aspectUv.x - 0.5) * aspect + 0.5;
  
  // Create an animated diagonal gradient
  float diagonal = (uv.x + uv.y) * 0.5;
  float t = u_time * 0.3;
  
  // RGB channels with phase offsets
  float r = sin(diagonal * 3.14159 + t) * 0.5 + 0.5;
  float g = sin(diagonal * 3.14159 + t + 2.094) * 0.5 + 0.5;  // +2π/3
  float b = sin(diagonal * 3.14159 + t + 4.189) * 0.5 + 0.5;  // +4π/3
  
  // Add circular wave pattern using aspect-corrected UVs
  vec2 center = vec2(0.5);
  float dist = length(aspectUv - center);
  float wave = sin(dist * 8.0 - u_time * 1.5) * 0.3 + 0.7;
  
  fragColor = vec4(r * wave, g * wave, b * wave, 1.0);
}
`

        // Create the pass
        const pass = ctx.pass(fragmentShader)

        // Animation loop
        function animate() {
          // Update time
          ctx.time += 0.016

          // Render the pass
          pass.draw()

          animationId = requestAnimationFrame(animate)
        }

        animate()

        // Cleanup
        return () => {
          cancelAnimationFrame(animationId)
          if (ctx?.dispose) {
            ctx.dispose()
          }
        }
      } catch (error) {
        console.error('Failed to initialize ralph-gl:', error)
      }
    }

    init()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}
