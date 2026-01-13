'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Material, StorageBuffer } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

// Matrix helpers (column-major order)
function mat4Identity(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])
}

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2)
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ])
}

function mat4RotateY(a: Float32Array, rad: number): Float32Array {
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const out = new Float32Array(16)
  
  out[0] = a[0] * c - a[8] * s
  out[1] = a[1] * c - a[9] * s
  out[2] = a[2] * c - a[10] * s
  out[3] = a[3] * c - a[11] * s
  
  out[4] = a[4]
  out[5] = a[5]
  out[6] = a[6]
  out[7] = a[7]
  
  out[8] = a[0] * s + a[8] * c
  out[9] = a[1] * s + a[9] * c
  out[10] = a[2] * s + a[10] * c
  out[11] = a[3] * s + a[11] * c
  
  out[12] = a[12]
  out[13] = a[13]
  out[14] = a[14]
  out[15] = a[15]
  
  return out
}

function mat4RotateX(a: Float32Array, rad: number): Float32Array {
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const out = new Float32Array(16)
  
  out[0] = a[0]
  out[1] = a[1]
  out[2] = a[2]
  out[3] = a[3]
  
  out[4] = a[4] * c + a[8] * s
  out[5] = a[5] * c + a[9] * s
  out[6] = a[6] * c + a[10] * s
  out[7] = a[7] * c + a[11] * s
  
  out[8] = a[8] * c - a[4] * s
  out[9] = a[9] * c - a[5] * s
  out[10] = a[10] * c - a[6] * s
  out[11] = a[11] * c - a[7] * s
  
  out[12] = a[12]
  out[13] = a[13]
  out[14] = a[14]
  out[15] = a[15]
  
  return out
}

function mat4Translate(a: Float32Array, v: [number, number, number]): Float32Array {
  const out = new Float32Array(a)
  out[12] = a[0] * v[0] + a[4] * v[1] + a[8] * v[2] + a[12]
  out[13] = a[1] * v[0] + a[5] * v[1] + a[9] * v[2] + a[13]
  out[14] = a[2] * v[0] + a[6] * v[1] + a[10] * v[2] + a[14]
  out[15] = a[3] * v[0] + a[7] * v[1] + a[11] * v[2] + a[15]
  return out
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] = 
        a[row] * b[col * 4] +
        a[row + 4] * b[col * 4 + 1] +
        a[row + 8] * b[col * 4 + 2] +
        a[row + 12] * b[col * 4 + 3]
    }
  }
  return out
}

// Triangle Shaders
const TRIANGLE_VERTEX = `#version 300 es
precision highp float;

in vec3 a_position;

uniform float u_time;

void main() {
  float yOffset = sin(u_time * 2.0) * 0.05;
  gl_Position = vec4(a_position.x - 0.5, a_position.y + yOffset, a_position.z, 1.0);
}
`

const TRIANGLE_FRAGMENT = `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 0.3, 0.3, 1.0);
}
`

// Cube Shaders
const CUBE_VERTEX = `#version 300 es
precision highp float;

in vec3 a_position;

uniform mat4 u_mvp;

out vec3 v_color;

void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  v_color = a_position + 0.5;  // Color based on position (shifted to 0-1 range)
}
`

const CUBE_FRAGMENT = `#version 300 es
precision highp float;

in vec3 v_color;

out vec4 fragColor;

void main() {
  fragColor = vec4(v_color, 1.0);
}
`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// === Triangle ===
const trianglePositions = ctx.storage(3 * 3 * 4) // 3 vertices × vec3 × 4 bytes
trianglePositions.write(new Float32Array([
   0.0,  0.5, 0.0,  // top
  -0.5, -0.5, 0.0,  // bottom-left
   0.5, -0.5, 0.0,  // bottom-right
]))

const triangle = ctx.material(vertexShader, fragmentShader, {
  vertexCount: 3
})

triangle.storage('a_position', trianglePositions, { size: 3 })

// === Cube with Index Buffer ===
const cubePositions = ctx.storage(8 * 3 * 4) // 8 vertices × vec3
cubePositions.write(new Float32Array([
  -0.5, -0.5, -0.5,  // 0
   0.5, -0.5, -0.5,  // 1
   0.5,  0.5, -0.5,  // 2
  -0.5,  0.5, -0.5,  // 3
  -0.5, -0.5,  0.5,  // 4
   0.5, -0.5,  0.5,  // 5
   0.5,  0.5,  0.5,  // 6
  -0.5,  0.5,  0.5,  // 7
]))

const cubeIndices = ctx.storage(36 * 4) // 36 indices × 4 bytes
cubeIndices.write(new Uint32Array([
  // Front, Back, Top, Bottom, Right, Left faces
  4,5,6, 4,6,7,  1,0,3, 1,3,2,
  7,6,2, 7,2,3,  0,1,5, 0,5,4,
  5,1,2, 5,2,6,  0,4,7, 0,7,3
]))

const cube = ctx.material(vertexShader, fragmentShader, {
  indexBuffer: cubeIndices,
  indexCount: 36
})

cube.storage('a_position', cubePositions, { size: 3 })

// Set uniform for MVP matrix
const mvp = calculateMVP() // mat4
cube.set('u_mvp', mvp)

// Render
triangle.draw()
cube.draw()`

export default function GeometryExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let triangle: Material | null = null
    let cube: Material | null = null
    let triangleBuffer: StorageBuffer | null = null
    let cubeBuffer: StorageBuffer | null = null
    let cubeIndices: StorageBuffer | null = null
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

        // Triangle
        triangleBuffer = ctx.storage(3 * 3 * 4)
        triangleBuffer.write(new Float32Array([
           0.0,  0.5, 0.0,
          -0.5, -0.5, 0.0,
           0.5, -0.5, 0.0,
        ]))

        triangle = ctx.material(TRIANGLE_VERTEX, TRIANGLE_FRAGMENT, {
          vertexCount: 3
        })
        triangle.storage('a_position', triangleBuffer, { size: 3 })

        // Cube
        cubeBuffer = ctx.storage(8 * 3 * 4)
        cubeBuffer.write(new Float32Array([
          -0.5, -0.5, -0.5,  // 0
           0.5, -0.5, -0.5,  // 1
           0.5,  0.5, -0.5,  // 2
          -0.5,  0.5, -0.5,  // 3
          -0.5, -0.5,  0.5,  // 4
           0.5, -0.5,  0.5,  // 5
           0.5,  0.5,  0.5,  // 6
          -0.5,  0.5,  0.5,  // 7
        ]))

        cubeIndices = ctx.storage(36 * 4)
        cubeIndices.write(new Uint32Array([
          4,5,6, 4,6,7,  1,0,3, 1,3,2,
          7,6,2, 7,2,3,  0,1,5, 0,5,4,
          5,1,2, 5,2,6,  0,4,7, 0,7,3
        ]))

        cube = ctx.material(CUBE_VERTEX, CUBE_FRAGMENT, {
          indexBuffer: cubeIndices,
          indexCount: 36
        })
        cube.storage('a_position', cubeBuffer, { size: 3 })

        // Enable depth testing
        const glCtx = ctx.gl
        glCtx.enable(glCtx.DEPTH_TEST)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !triangle || !cube) return
          
          const time = (performance.now() - startTime) / 1000
          ctx.time = time
          
          // Update MVP matrix for cube
          const aspect = ctx.width / ctx.height
          const projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 100)
          
          let model = mat4Identity()
          model = mat4Translate(model, [0.5, 0, -3])
          model = mat4RotateY(model, time * 0.7)
          model = mat4RotateX(model, time * 0.5)
          
          const mvp = mat4Multiply(projection, model)
          cube.set('u_mvp', mvp)
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.05, 0.05, 0.05, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT | glCtx.DEPTH_BUFFER_BIT)
          
          triangle.draw()
          cube.draw()
          
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
      triangle?.dispose()
      cube?.dispose()
      triangleBuffer?.dispose()
      cubeBuffer?.dispose()
      cubeIndices?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Custom Geometry"
      description="Demonstrates rendering custom geometry with vertex buffers - a simple triangle and a rotating 3D cube with index buffer."
      canvas={
        error ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900/20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full bg-zinc-900"
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
                <strong className="text-white">Vertex Buffers</strong> - Store geometry data (positions, colors, normals) in GPU memory using <code className="text-emerald-400">StorageBuffer</code>
              </li>
              <li>
                <strong className="text-white">Index Buffers</strong> - Reuse vertices efficiently by indexing into the vertex buffer
              </li>
              <li>
                <strong className="text-white">MVP Matrix</strong> - Model-View-Projection transformation for 3D rendering
              </li>
              <li>
                <strong className="text-white">Depth Testing</strong> - Proper z-sorting for 3D objects using <code className="text-emerald-400">gl.enable(gl.DEPTH_TEST)</code>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">What's Shown</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Red Triangle</strong> - Simple geometry with animated bobbing motion</li>
              <li>• <strong className="text-white">Colored Cube</strong> - 8 vertices, 36 indices (12 triangles), rotating in 3D</li>
              <li>• Cube colors based on vertex positions (creating RGB gradients)</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Index Buffer Benefits</h3>
            <p className="text-zinc-400 text-sm">
              The cube uses only <strong className="text-white">8 vertices</strong> instead of 36 (6 faces × 2 triangles × 3 vertices). 
              The index buffer references these 8 vertices to create all 12 triangles, saving <strong className="text-white">78% memory</strong>.
            </p>
          </div>
        </div>
      }
    />
  )
}
