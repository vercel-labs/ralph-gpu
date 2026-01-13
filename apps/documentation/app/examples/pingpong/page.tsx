'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass, PingPongTarget } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

// Initial pass: Create a seed image with moving particles
const SEED_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Create a few animated particles as seed points
  float dist = 1.0;
  
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float angle = u_time * (0.5 + fi * 0.2) + fi * 1.256;
    float radius = 0.15 + fi * 0.05;
    vec2 center = vec2(
      0.5 + cos(angle) * radius,
      0.5 + sin(angle * 1.3) * radius
    );
    dist = min(dist, length(uv - center));
  }
  
  // Only emit where particles are
  float emit = smoothstep(0.03, 0.01, dist);
  
  // Color based on which particle
  vec3 color = vec3(
    emit * (0.5 + 0.5 * sin(u_time * 2.0)),
    emit * (0.5 + 0.5 * sin(u_time * 2.0 + 2.09)),
    emit * (0.5 + 0.5 * sin(u_time * 2.0 + 4.18))
  );
  
  fragColor = vec4(color, 1.0);
}
`

// Blur pass: Sample neighbors and blend with previous frame
const BLUR_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform float u_decay;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 texel = 1.0 / u_resolution;
  
  // 9-tap box blur
  vec4 color = vec4(0.0);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      color += texture(u_texture, uv + vec2(float(x), float(y)) * texel * 2.0);
    }
  }
  color /= 9.0;
  
  // Decay the color over time (creates trail effect)
  color *= u_decay;
  
  fragColor = color;
}
`

// Composite pass: Combine seed and blurred result
const COMPOSITE_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_feedback;
uniform sampler2D u_seed;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  vec4 feedback = texture(u_feedback, uv);
  vec4 seed = texture(u_seed, uv);
  
  // Combine feedback with new seed
  vec3 color = feedback.rgb + seed.rgb;
  
  fragColor = vec4(color, 1.0);
}
`

// Display pass: Render to screen with color grading
const DISPLAY_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  vec4 texColor = texture(u_texture, uv);
  
  // Boost saturation and add subtle pulsing
  vec3 color = texColor.rgb;
  float pulse = 1.0 + 0.1 * sin(u_time * 0.5);
  color *= pulse;
  
  // Tone mapping
  color = color / (color + 1.0);
  
  // Add vignette
  vec2 vignetteUV = uv * (1.0 - uv);
  float vignette = vignetteUV.x * vignetteUV.y * 15.0;
  vignette = pow(vignette, 0.25);
  color *= vignette;
  
  fragColor = vec4(color, 1.0);
}
`

const CODE_EXAMPLE = `import { gl, PingPongTarget } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create a PingPong target for feedback effects
// This provides two textures that can be swapped
const pingPong = ctx.pingPong(512, 512)

// Seed pass: Create animated particles
const seedPass = ctx.pass(SEED_SHADER)

// Blur pass: Apply blur with decay
const blurPass = ctx.pass(BLUR_SHADER)

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  
  // 1. Blur the previous frame into write target
  ctx.setTarget(pingPong.write)
  blurPass.setUniform('u_texture', pingPong.read.texture)
  blurPass.setUniform('u_decay', 0.98)
  blurPass.draw()
  
  // 2. Add new particles on top
  seedPass.draw()  // blends additively
  
  // 3. Swap read/write buffers
  pingPong.swap()
  
  // 4. Display to screen
  ctx.setTarget(null)
  displayPass.setUniform('u_texture', pingPong.read.texture)
  displayPass.draw()
  
  requestAnimationFrame(animate)
}
animate()`

export default function PingPongExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let seedPass: Pass | null = null
    let blurPass: Pass | null = null
    let compositePass: Pass | null = null
    let displayPass: Pass | null = null
    let pingPong: PingPongTarget | null = null
    let seedTarget: any = null

    const init = async () => {
      try {
        ctx = await gl.init(canvasRef.current!)
        
        // Set canvas size
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        ctx.width = canvas.width
        ctx.height = canvas.height

        // Create ping-pong buffer for feedback effect
        pingPong = ctx.pingPong(512, 512)
        
        // Create an extra target for seed rendering
        seedTarget = ctx.target(512, 512)
        
        // Create passes
        seedPass = ctx.pass(SEED_SHADER)
        blurPass = ctx.pass(BLUR_SHADER)
        compositePass = ctx.pass(COMPOSITE_SHADER)
        displayPass = ctx.pass(DISPLAY_SHADER)
        
        // Animation loop
        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !seedPass || !blurPass || !compositePass || !displayPass || !pingPong || !seedTarget) return
          
          const glCtx = ctx.gl
          ctx.time = (performance.now() - startTime) / 1000
          
          const originalWidth = ctx.width
          const originalHeight = ctx.height
          
          // 1. Render seed particles to temp target
          ctx.setTarget(seedTarget)
          ctx.width = seedTarget.width
          ctx.height = seedTarget.height
          glCtx.clearColor(0, 0, 0, 1)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          seedPass.draw()
          
          // 2. Apply blur to previous frame and write to pingPong.write
          ctx.setTarget(pingPong.write)
          ctx.width = pingPong.write.width
          ctx.height = pingPong.write.height
          glCtx.activeTexture(glCtx.TEXTURE0)
          glCtx.bindTexture(glCtx.TEXTURE_2D, pingPong.read.texture)
          blurPass.setUniform('u_texture', 0)
          blurPass.setUniform('u_decay', 0.97)
          blurPass.draw()
          
          // 3. Composite: add new seed to blurred frame
          glCtx.enable(glCtx.BLEND)
          glCtx.blendFunc(glCtx.ONE, glCtx.ONE)
          
          glCtx.activeTexture(glCtx.TEXTURE0)
          glCtx.bindTexture(glCtx.TEXTURE_2D, seedTarget.texture)
          
          // Draw seed additively
          const tempPass = ctx.pass(`#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = texture(u_texture, uv);
}
`)
          tempPass.setUniform('u_texture', 0)
          tempPass.draw()
          tempPass.destroy()
          
          glCtx.disable(glCtx.BLEND)
          
          // 4. Swap ping-pong buffers
          pingPong.swap()
          
          // 5. Display to screen
          ctx.setTarget(null)
          ctx.width = originalWidth
          ctx.height = originalHeight
          glCtx.viewport(0, 0, originalWidth, originalHeight)
          
          glCtx.activeTexture(glCtx.TEXTURE0)
          glCtx.bindTexture(glCtx.TEXTURE_2D, pingPong.read.texture)
          displayPass.setUniform('u_texture', 0)
          displayPass.draw()
          
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
      seedPass?.destroy()
      blurPass?.destroy()
      compositePass?.destroy()
      displayPass?.destroy()
      pingPong?.dispose()
      seedTarget?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="PingPong Feedback"
      description="Demonstrates feedback effects using PingPongTarget. Two render targets are swapped each frame, allowing the shader to read from the previous frame while writing to a new one."
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
              <li><strong className="text-white">Create PingPongTarget</strong> - Provides two textures: <code className="text-emerald-400">read</code> and <code className="text-emerald-400">write</code></li>
              <li><strong className="text-white">Blur Pass</strong> - Read from previous frame, apply blur with decay (0.97), write to new buffer</li>
              <li><strong className="text-white">Add Seeds</strong> - Blend new animated particles onto the blurred result</li>
              <li><strong className="text-white">Swap</strong> - Call <code className="text-emerald-400">pingPong.swap()</code> to flip read/write targets</li>
              <li><strong className="text-white">Display</strong> - Render the result to the canvas with color grading and vignette</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">Feedback Loop</h4>
              <p className="text-zinc-500 text-xs">Each frame builds on the previous one, creating trails</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">Use Cases</h4>
              <p className="text-zinc-500 text-xs">Blur, motion blur, diffusion, fluid simulation, trails</p>
            </div>
          </div>
        </div>
      }
    />
  )
}
