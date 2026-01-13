'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create a nice gradient with some visual interest
  vec3 color1 = vec3(0.1, 0.2, 0.5);  // Deep blue
  vec3 color2 = vec3(0.9, 0.3, 0.4);  // Coral
  vec3 color3 = vec3(0.2, 0.8, 0.6);  // Teal
  
  // Diagonal gradient
  float t = (uv.x + uv.y) * 0.5;
  
  // Mix colors
  vec3 color = mix(color1, color2, smoothstep(0.0, 0.5, t));
  color = mix(color, color3, smoothstep(0.5, 1.0, t));
  
  // Add subtle radial highlight
  float dist = length(uv - vec2(0.5));
  color += 0.1 * (1.0 - dist);
  
  fragColor = vec4(color, 1.0);
}`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

// Initialize WebGL context
const ctx = await gl.init(canvas)
ctx.width = canvas.width
ctx.height = canvas.height

// Create a fullscreen pass with gradient shader
const pass = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create a nice gradient
  vec3 color1 = vec3(0.1, 0.2, 0.5);
  vec3 color2 = vec3(0.9, 0.3, 0.4);
  vec3 color3 = vec3(0.2, 0.8, 0.6);
  
  float t = (uv.x + uv.y) * 0.5;
  
  vec3 color = mix(color1, color2, smoothstep(0.0, 0.5, t));
  color = mix(color, color3, smoothstep(0.5, 1.0, t));
  
  float dist = length(uv - vec2(0.5));
  color += 0.1 * (1.0 - dist);
  
  fragColor = vec4(color, 1.0);
}\`)

// Draw the pass
pass.draw()`

export default function BasicExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let pass: Pass | null = null

    const init = async () => {
      try {
        const canvas = canvasRef.current!
        
        // Set canvas size before initializing context
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        
        ctx = await gl.init(canvas)
        
        // Set context dimensions
        ctx.width = canvas.width
        ctx.height = canvas.height
        
        // Set viewport
        ctx.gl.viewport(0, 0, ctx.width, ctx.height)

        pass = ctx.pass(FRAGMENT_SHADER)
        pass.draw()
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Failed to initialize WebGL')
      }
    }

    init()

    return () => {
      pass?.destroy()
    }
  }, [])

  return (
    <FullscreenExample
      title="Basic Gradient"
      description="A simple example showing how to create a fullscreen gradient using ralph-gl. The shader creates a smooth multi-color gradient with a subtle radial highlight."
      canvas={
        error ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900/20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full bg-black"
          />
        )
      }
      codeBlock={<CodeBlock code={CODE_EXAMPLE} language="typescript" />}
      info={
        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-2">How it works</h3>
          <ul className="text-zinc-400 text-sm space-y-1">
            <li>• Creates UV coordinates from screen position</li>
            <li>• Defines three colors: deep blue, coral, and teal</li>
            <li>• Uses diagonal gradient mixing with smoothstep</li>
            <li>• Adds radial highlight based on distance from center</li>
          </ul>
        </div>
      }
    />
  )
}
