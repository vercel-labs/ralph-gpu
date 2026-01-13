'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_waveFrequency;
uniform float u_waveAmplitude;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create animated wave distortion
  float wave = sin(uv.y * u_waveFrequency + u_time * 2.0) * u_waveAmplitude;
  float wave2 = cos(uv.x * u_waveFrequency * 0.7 + u_time * 1.5) * u_waveAmplitude * 0.5;
  
  // Apply wave to UV
  vec2 distortedUV = uv + vec2(wave, wave2);
  
  // Create gradient with distorted coordinates
  float t = distortedUV.x + sin(distortedUV.y * 3.14159 + u_time) * 0.2;
  
  // Mix the two custom colors
  vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 1.0, t));
  
  // Add animated glow effect
  float glow = sin(u_time * 3.0) * 0.5 + 0.5;
  color += 0.1 * glow * vec3(1.0, 0.8, 0.6);
  
  // Add some sparkle
  float sparkle = sin(uv.x * 50.0 + u_time * 10.0) * sin(uv.y * 50.0 - u_time * 8.0);
  sparkle = pow(max(sparkle, 0.0), 20.0);
  color += sparkle * 0.3 * vec3(1.0);
  
  fragColor = vec4(color, 1.0);
}`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create pass with animated uniforms
const pass = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_waveFrequency;
uniform float u_waveAmplitude;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create animated wave distortion
  float wave = sin(uv.y * u_waveFrequency + u_time * 2.0) 
             * u_waveAmplitude;
  
  // Mix custom colors with animation
  float t = uv.x + sin(uv.y * 3.14 + u_time) * 0.2;
  vec3 color = mix(u_color1, u_color2, t);
  
  fragColor = vec4(color, 1.0);
}\`)

// Set custom uniform values
pass.setUniform('u_color1', [0.1, 0.4, 0.8])    // Blue
pass.setUniform('u_color2', [0.9, 0.2, 0.5])    // Pink
pass.setUniform('u_waveFrequency', 10.0)
pass.setUniform('u_waveAmplitude', 0.05)

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  pass.draw()
  requestAnimationFrame(animate)
}
animate()`

export default function UniformsExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let pass: Pass | null = null

    const init = async () => {
      try {
        ctx = await gl.init(canvasRef.current!)
        
        // Set canvas size
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        ctx.width = canvas.width
        ctx.height = canvas.height

        pass = ctx.pass(FRAGMENT_SHADER)
        
        // Set custom uniforms
        pass.setUniform('u_color1', [0.1, 0.4, 0.8])   // Blue
        pass.setUniform('u_color2', [0.9, 0.2, 0.5])   // Pink
        pass.setUniform('u_waveFrequency', 10.0)
        pass.setUniform('u_waveAmplitude', 0.05)
        
        // Animation loop
        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !pass) return
          
          ctx.time = (performance.now() - startTime) / 1000
          pass.draw()
          animationRef.current = requestAnimationFrame(animate)
        }
        
        animate()
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Failed to initialize WebGL')
      }
    }

    init()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      pass?.destroy()
    }
  }, [])

  return (
    <FullscreenExample
      title="Animated Uniforms"
      description="Demonstrates how to use custom uniforms for animated waves and colors. The shader uses u_time along with custom uniforms to create dynamic visual effects."
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
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Uniforms Used</h3>
            <ul className="text-zinc-400 space-y-1 text-sm">
              <li><code className="text-emerald-400">u_time</code> - Auto-updated time in seconds</li>
              <li><code className="text-emerald-400">u_color1</code> - First gradient color (blue)</li>
              <li><code className="text-emerald-400">u_color2</code> - Second gradient color (pink)</li>
              <li><code className="text-emerald-400">u_waveFrequency</code> - Wave frequency (10.0)</li>
              <li><code className="text-emerald-400">u_waveAmplitude</code> - Wave amplitude (0.05)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Effects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• Animated wave distortion on UV coordinates</li>
              <li>• Pulsing glow effect synchronized with time</li>
              <li>• Sparkling particle effect across the surface</li>
            </ul>
          </div>
        </div>
      }
    />
  )
}
