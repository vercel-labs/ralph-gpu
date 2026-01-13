'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass, Material, StorageBuffer } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

// SDF Lines Fragment Shader
const SDF_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Distance from point p to line segment a-b
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p_aspect = vec2(p.x * aspect, p.y);
  
  vec3 color = vec3(0.0);
  float lineWidth = 0.015;
  float t = u_time;
  
  // Line 1: Animated horizontal line (cyan)
  float y1 = sin(t * 2.0) * 0.3 + 0.4;
  float d1 = sdSegment(p_aspect, vec2(-0.8, y1), vec2(0.8, y1 + 0.1));
  float line1 = smoothstep(lineWidth, lineWidth * 0.5, d1);
  color = mix(color, vec3(0.2, 0.8, 1.0), line1);
  
  // Line 2: Diagonal animated (orange)
  vec2 a2 = vec2(-0.6, -0.2 + sin(t * 1.5) * 0.1);
  vec2 b2 = vec2(0.6, 0.3 + sin(t * 1.5 + 1.0) * 0.1);
  float d2 = sdSegment(p_aspect, a2, b2);
  float line2 = smoothstep(lineWidth, lineWidth * 0.5, d2);
  color = mix(color, vec3(1.0, 0.5, 0.2), line2);
  
  // Line 3: Animated wave (green)
  float waveY = sin(p.x * 6.28 + t * 3.0) * 0.15 - 0.5;
  float d3 = abs(p.y - waveY);
  float line3 = smoothstep(lineWidth, lineWidth * 0.5, d3);
  color = mix(color, vec3(0.3, 1.0, 0.5), line3);
  
  // Circle (magenta)
  vec2 circleCenter = vec2(0.5, 0.0);
  float circleRadius = 0.2;
  float dCircle = abs(length(p_aspect - circleCenter) - circleRadius);
  float circle = smoothstep(lineWidth, lineWidth * 0.5, dCircle);
  color = mix(color, vec3(1.0, 0.3, 0.8), circle);
  
  // Spiral (yellow)
  vec2 spiralCenter = vec2(-0.5, -0.3);
  vec2 sp = p_aspect - spiralCenter;
  float angle = atan(sp.y, sp.x);
  float radius = length(sp);
  float spiralLine = abs(radius - (angle + 3.14159) * 0.05 - fract(t * 0.2) * 0.3);
  float spiral = smoothstep(lineWidth * 0.7, lineWidth * 0.3, spiralLine);
  color = mix(color, vec3(1.0, 0.9, 0.3), spiral * step(radius, 0.35));
  
  fragColor = vec4(color, 1.0);
}
`

// Storage Buffer Lines - Vertex Shader
const LINE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;

uniform float u_time;

out vec3 v_color;

void main() {
  int lineIdx = gl_VertexID / 2;
  
  // Animate positions
  vec2 p = a_position;
  p.y += sin(u_time * 2.0 + float(lineIdx) * 0.5) * 0.2;
  
  gl_Position = vec4(p, 0.0, 1.0);
  
  // Color based on line index
  float hue = float(lineIdx) / 20.0;
  v_color = vec3(
    sin(hue * 6.28) * 0.5 + 0.5,
    sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
    sin(hue * 6.28 + 4.18) * 0.5 + 0.5
  );
}
`

const LINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_color;

out vec4 fragColor;

void main() {
  fragColor = vec4(v_color, 1.0);
}
`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

// Initialize WebGL context
const ctx = await gl.init(canvas)

// === SDF Lines (Fragment Shader) ===
// Most reliable for anti-aliased, visible lines

const sdfLines = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p_aspect = vec2(p.x * aspect, p.y);
  
  vec3 color = vec3(0.0);
  float lineWidth = 0.015;
  
  // Draw a line segment
  float d = sdSegment(p_aspect, vec2(-0.8, 0.0), vec2(0.8, 0.5));
  float line = smoothstep(lineWidth, lineWidth * 0.5, d);
  color = mix(color, vec3(0.2, 0.8, 1.0), line);
  
  fragColor = vec4(color, 1.0);
}
\`)

// === Storage Buffer Lines (Vertex Shader) ===
// For data-driven line positions

const numLines = 20
const numVertices = numLines * 2

// Create storage buffer for line positions
const lineBuffer = ctx.storage(numVertices * 2 * 4) // vec2 per vertex
const positions = new Float32Array(numVertices * 2)
// ... fill positions ...
lineBuffer.write(positions)

const linesMaterial = ctx.material(vertexShader, fragmentShader, {
  topology: 'lines',        // gl.LINES
  vertexCount: numVertices
})

linesMaterial.storage('a_position', lineBuffer, {
  size: 2  // vec2
})

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  ctx.clear()
  
  sdfLines.draw()
  // or
  linesMaterial.draw()
  
  requestAnimationFrame(animate)
}`

export default function LinesExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sdf' | 'storage'>('sdf')

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let sdfPass: Pass | null = null
    let linesMaterial: Material | null = null
    let lineBuffer: StorageBuffer | null = null
    let animationId: number | null = null

    const init = async () => {
      try {
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        
        ctx = await gl.init(canvas)
        ctx.width = canvas.width
        ctx.height = canvas.height
        ctx.gl.viewport(0, 0, ctx.width, ctx.height)

        // Create SDF lines pass
        sdfPass = ctx.pass(SDF_FRAGMENT_SHADER)

        // Create storage buffer lines material
        const numLines = 20
        const numVertices = numLines * 2
        
        lineBuffer = ctx.storage(numVertices * 2 * 4)
        
        const positions = new Float32Array(numVertices * 2)
        for (let i = 0; i < numLines; i++) {
          const t = i / numLines
          positions[i * 4 + 0] = -0.8 + t * 1.6
          positions[i * 4 + 1] = Math.sin(t * Math.PI * 2) * 0.3
          positions[i * 4 + 2] = -0.8 + t * 1.6
          positions[i * 4 + 3] = Math.sin(t * Math.PI * 2) * 0.3 + 0.3
        }
        lineBuffer.write(positions)

        linesMaterial = ctx.material(LINE_VERTEX_SHADER, LINE_FRAGMENT_SHADER, {
          topology: 'lines',
          vertexCount: numVertices,
        })
        
        linesMaterial.storage('a_position', lineBuffer, { size: 2 })

        const startTime = performance.now()
        const animate = () => {
          if (!ctx) return
          
          ctx.time = (performance.now() - startTime) / 1000
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.0, 0.0, 0.0, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          if (activeTab === 'sdf' && sdfPass) {
            sdfPass.draw()
          } else if (activeTab === 'storage' && linesMaterial) {
            linesMaterial.draw()
          }
          
          animationId = requestAnimationFrame(animate)
        }
        
        animate()
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Failed to initialize WebGL')
      }
    }

    init()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      sdfPass?.dispose()
      linesMaterial?.dispose()
      lineBuffer?.dispose()
    }
  }, [activeTab])

  return (
    <FullscreenExample
      title="Lines & Points"
      description="Demonstrate different approaches to rendering lines in WebGL - SDF lines for anti-aliased results, and storage buffer lines for data-driven positions."
      canvas={
        error ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900/20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="w-full h-full bg-black relative">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setActiveTab('sdf')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'sdf'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                SDF Lines
              </button>
              <button
                onClick={() => setActiveTab('storage')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'storage'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Storage Lines
              </button>
            </div>
          </div>
        )
      }
      codeBlock={<CodeBlock code={CODE_EXAMPLE} language="typescript" />}
      info={
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Rendering Approaches</h3>
            <ul className="text-zinc-400 space-y-2 text-sm">
              <li>
                <strong className="text-white">SDF Lines (Recommended)</strong> - Uses signed distance functions in fragment shader for smooth, anti-aliased lines of any width
              </li>
              <li>
                <strong className="text-white">Storage Buffer Lines</strong> - Uses vertex attributes with <code className="text-emerald-400">gl.LINES</code> topology for data-driven line positions (1px wide)
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Line Topologies</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <code className="text-emerald-400">topology: 'lines'</code> - Each pair of vertices forms a separate line</li>
              <li>• <code className="text-emerald-400">topology: 'line-strip'</code> - Vertices form a continuous connected line</li>
              <li>• <code className="text-emerald-400">topology: 'points'</code> - Each vertex is rendered as a point</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-900 bg-amber-900/20 p-4">
            <h3 className="text-lg font-semibold text-amber-400 mb-2">Note</h3>
            <p className="text-zinc-400 text-sm">
              WebGL's native line primitives are only 1 pixel wide and cannot be made thicker. 
              For visible, anti-aliased lines in creative coding, use SDF-based lines in fragment shaders.
            </p>
          </div>
        </div>
      }
    />
  )
}
