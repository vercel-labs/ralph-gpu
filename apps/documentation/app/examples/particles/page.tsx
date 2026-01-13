'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Material, StorageBuffer } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const PARTICLE_COUNT = 1000

// Vertex shader for instanced particles
const VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-instance data (from storage buffer)
in vec4 a_particleData;  // xy = position, zw = velocity

uniform vec2 u_resolution;
uniform float u_time;

out vec3 v_color;

void main() {
  // Each instance is a point
  int vertexId = gl_VertexID;
  
  // Get particle position from instance data
  vec2 pos = a_particleData.xy;
  vec2 vel = a_particleData.zw;
  
  // Animate position based on time and velocity
  float t = u_time * 0.5;
  vec2 animatedPos = pos + vel * sin(t + float(gl_InstanceID) * 0.1) * 0.3;
  
  // Add some swirl motion
  float angle = t + length(pos) * 5.0;
  float swirl = 0.1;
  animatedPos.x += cos(angle) * swirl;
  animatedPos.y += sin(angle) * swirl;
  
  // Convert to clip space
  vec2 clipPos = animatedPos * 2.0 - 1.0;
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  gl_PointSize = 4.0 + sin(u_time * 3.0 + float(gl_InstanceID) * 0.5) * 2.0;
  
  // Color based on position and instance
  float hue = fract(float(gl_InstanceID) / float(${PARTICLE_COUNT}) + u_time * 0.1);
  v_color = vec3(
    0.5 + 0.5 * cos(6.28318 * (hue + 0.0)),
    0.5 + 0.5 * cos(6.28318 * (hue + 0.33)),
    0.5 + 0.5 * cos(6.28318 * (hue + 0.67))
  );
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_color;

out vec4 fragColor;

void main() {
  // Circular point with soft edge
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  fragColor = vec4(v_color, alpha);
}
`

const CODE_EXAMPLE = `import { gl, Material, StorageBuffer } from 'ralph-gl'

const PARTICLE_COUNT = 1000

// Initialize context
const ctx = await gl.init(canvas)

// Create storage buffer for particle data (position + velocity)
const particleBuffer = ctx.storage(PARTICLE_COUNT * 16) // 4 floats per particle

// Initialize particle positions
const particleData = new Float32Array(PARTICLE_COUNT * 4)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2
  const radius = 0.1 + Math.random() * 0.4
  
  particleData[i * 4 + 0] = 0.5 + Math.cos(angle) * radius  // x
  particleData[i * 4 + 1] = 0.5 + Math.sin(angle) * radius  // y
  particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.5     // vx
  particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.5     // vy
}
particleBuffer.write(particleData)

// Create material for instanced rendering
const material = ctx.material(VERTEX_SHADER, FRAGMENT_SHADER, {
  vertexCount: 1,           // 1 vertex per particle (point)
  instances: PARTICLE_COUNT, // Draw 1000 instances
  topology: 'points'
})

// Bind particle data as vertex attribute
material.storage('a_particleData', particleBuffer, {
  size: 4,      // vec4
  divisor: 1    // Per-instance data
})

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  ctx.clear()
  material.draw()
  requestAnimationFrame(animate)
}`

export default function ParticlesExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let material: Material | null = null
    let particleBuffer: StorageBuffer | null = null

    const init = async () => {
      try {
        ctx = await gl.init(canvasRef.current!)
        
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        ctx.width = canvas.width
        ctx.height = canvas.height
        ctx.gl.viewport(0, 0, ctx.width, ctx.height)

        // Create storage buffer for particle data
        // Each particle: position (vec2) + velocity (vec2) = 4 floats = 16 bytes
        particleBuffer = ctx.storage(PARTICLE_COUNT * 16)

        // Initialize particles in a spiral pattern
        const particleData = new Float32Array(PARTICLE_COUNT * 4)
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const t = i / PARTICLE_COUNT
          const angle = t * Math.PI * 10 + Math.random() * 0.5
          const radius = 0.1 + t * 0.35 + Math.random() * 0.05
          
          particleData[i * 4 + 0] = 0.5 + Math.cos(angle) * radius  // x
          particleData[i * 4 + 1] = 0.5 + Math.sin(angle) * radius  // y
          particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.5     // vx
          particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.5     // vy
        }
        particleBuffer.write(particleData)

        // Create material with instanced rendering
        material = ctx.material(VERTEX_SHADER, FRAGMENT_SHADER, {
          vertexCount: 1,            // 1 vertex per particle
          instances: PARTICLE_COUNT,  // Number of instances
          topology: 'points',
          blend: 'add'               // Additive blending for glow effect
        })

        // Bind particle buffer as per-instance vertex attribute
        material.storage('a_particleData', particleBuffer, {
          size: 4,      // vec4 (x, y, vx, vy)
          divisor: 1    // Changes per instance
        })

        // Enable blending
        const glCtx = ctx.gl
        glCtx.enable(glCtx.BLEND)
        glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !material) return
          
          const glCtx = ctx.gl
          ctx.time = (performance.now() - startTime) / 1000
          
          // Clear with dark background
          glCtx.clearColor(0.02, 0.02, 0.05, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          material.draw()
          
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
      material?.dispose()
      particleBuffer?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Instanced Particles"
      description={`Demonstrates instanced rendering with ${PARTICLE_COUNT.toLocaleString()} particles. Each particle is rendered as a single draw call using GPU instancing with the Material class.`}
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
            <h3 className="text-lg font-semibold text-white mb-2">Key Concepts</h3>
            <ul className="text-zinc-400 space-y-2 text-sm">
              <li>
                <strong className="text-white">StorageBuffer</strong> - Stores per-particle data (position + velocity as vec4)
              </li>
              <li>
                <strong className="text-white">Instanced Rendering</strong> - Draw {PARTICLE_COUNT.toLocaleString()} copies with one draw call using <code className="text-emerald-400">instances</code>
              </li>
              <li>
                <strong className="text-white">Vertex Attribute Divisor</strong> - Per-instance data using <code className="text-emerald-400">divisor: 1</code>
              </li>
              <li>
                <strong className="text-white">Additive Blending</strong> - Creates glowing particle effect with <code className="text-emerald-400">blend: 'add'</code>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Effects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• Spiral particle arrangement</li>
              <li>• Swirl animation with sine waves</li>
              <li>• Rainbow color cycling</li>
              <li>• Pulsing particle size</li>
              <li>• Soft circular particles with alpha falloff</li>
            </ul>
          </div>
        </div>
      }
    />
  )
}
