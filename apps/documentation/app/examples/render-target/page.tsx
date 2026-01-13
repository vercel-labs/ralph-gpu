'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass, RenderTarget } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

// First pass: Render an animated pattern to a texture
const PATTERN_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create a rotating pattern
  vec2 center = uv - 0.5;
  float angle = atan(center.y, center.x);
  float radius = length(center);
  
  // Animated spiral
  float spiral = sin(radius * 20.0 - u_time * 3.0 + angle * 5.0);
  
  // Concentric rings
  float rings = sin(radius * 30.0 - u_time * 2.0) * 0.5 + 0.5;
  
  // Color based on pattern
  vec3 color1 = vec3(0.2, 0.6, 0.9);  // Blue
  vec3 color2 = vec3(0.9, 0.4, 0.2);  // Orange
  vec3 color3 = vec3(0.2, 0.9, 0.5);  // Green
  
  vec3 color = mix(color1, color2, spiral * 0.5 + 0.5);
  color = mix(color, color3, rings * 0.3);
  
  // Vignette
  float vignette = 1.0 - radius * 1.2;
  color *= vignette;
  
  fragColor = vec4(color, 1.0);
}`

// Second pass: Sample the texture and apply post-processing
const POST_PROCESS_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create a wavy distortion effect
  float distortion = sin(uv.y * 15.0 + u_time * 2.0) * 0.01;
  vec2 distortedUV = uv + vec2(distortion, 0.0);
  
  // Sample the texture
  vec4 texColor = texture(u_texture, distortedUV);
  
  // Add chromatic aberration
  float aberration = 0.003;
  float r = texture(u_texture, distortedUV + vec2(aberration, 0.0)).r;
  float g = texColor.g;
  float b = texture(u_texture, distortedUV - vec2(aberration, 0.0)).b;
  
  vec3 color = vec3(r, g, b);
  
  // Add scanlines
  float scanline = sin(gl_FragCoord.y * 2.0) * 0.04;
  color -= scanline;
  
  // Add a subtle color grade
  color = pow(color, vec3(0.95));
  color *= vec3(1.0, 0.98, 0.95);
  
  fragColor = vec4(color, 1.0);
}`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create a render target (offscreen texture)
const target = ctx.target(512, 512)

// First pass: Render pattern to texture
const patternPass = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Animated spiral pattern
  vec2 center = uv - 0.5;
  float angle = atan(center.y, center.x);
  float radius = length(center);
  float spiral = sin(radius * 20.0 - u_time * 3.0 + angle * 5.0);
  
  vec3 color = mix(vec3(0.2, 0.6, 0.9), vec3(0.9, 0.4, 0.2), spiral);
  fragColor = vec4(color, 1.0);
}\`)

// Second pass: Sample texture with post-processing
const postPass = ctx.pass(\`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture(u_texture, uv);
  
  // Add chromatic aberration
  float r = texture(u_texture, uv + vec2(0.003, 0.0)).r;
  float b = texture(u_texture, uv - vec2(0.003, 0.0)).b;
  
  fragColor = vec4(r, color.g, b, 1.0);
}\`)

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  
  // Render pattern to texture
  ctx.setTarget(target)
  patternPass.draw()
  
  // Render to canvas with post-processing
  ctx.setTarget(null)
  gl.bindTexture(gl.TEXTURE_2D, target.texture)
  postPass.draw()
  
  requestAnimationFrame(animate)
}
animate()`

export default function RenderTargetExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let patternPass: Pass | null = null
    let postPass: Pass | null = null
    let target: RenderTarget | null = null

    const init = async () => {
      try {
        ctx = await gl.init(canvasRef.current!)
        
        // Set canvas size
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        ctx.width = canvas.width
        ctx.height = canvas.height

        // Create render target at 512x512
        target = ctx.target(512, 512)
        
        // Create passes
        patternPass = ctx.pass(PATTERN_SHADER)
        postPass = ctx.pass(POST_PROCESS_SHADER)
        
        // Animation loop
        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !patternPass || !postPass || !target) return
          
          const glCtx = ctx.gl
          ctx.time = (performance.now() - startTime) / 1000
          
          // First pass: render pattern to texture
          ctx.setTarget(target)
          // Temporarily set resolution to target size
          const originalWidth = ctx.width
          const originalHeight = ctx.height
          ctx.width = target.width
          ctx.height = target.height
          patternPass.draw()
          
          // Second pass: render to canvas with post-processing
          ctx.setTarget(null)
          ctx.width = originalWidth
          ctx.height = originalHeight
          
          // Bind the texture from the render target
          glCtx.activeTexture(glCtx.TEXTURE0)
          glCtx.bindTexture(glCtx.TEXTURE_2D, target.texture)
          postPass.setUniform('u_texture', 0)
          postPass.draw()
          
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
      patternPass?.destroy()
      postPass?.destroy()
      target?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Render Target"
      description="Demonstrates rendering to an offscreen texture and then sampling it in a second pass. This technique is essential for post-processing effects, blur, and multi-pass rendering."
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
            <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
            <ol className="text-zinc-400 space-y-2 text-sm list-decimal list-inside">
              <li><strong className="text-white">Create a RenderTarget</strong> - An offscreen texture (512x512) to render to</li>
              <li><strong className="text-white">First Pass</strong> - Render an animated spiral pattern to the texture</li>
              <li><strong className="text-white">Second Pass</strong> - Sample the texture and apply post-processing effects</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">Pass 1: Pattern</h4>
              <p className="text-zinc-500 text-xs">Animated spiral with color mixing</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">Pass 2: Post-Process</h4>
              <p className="text-zinc-500 text-xs">Wave distortion, chromatic aberration, scanlines</p>
            </div>
          </div>
        </div>
      }
    />
  )
}
