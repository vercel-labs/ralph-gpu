'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Material, StorageBuffer } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

// Vertex shader: Transform 3D cube vertices with rotation
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_color;

uniform float u_time;
uniform vec2 u_resolution;

out vec3 v_color;
out vec3 v_normal;

mat4 rotationX(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat4(
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1
  );
}

mat4 rotationY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat4(
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1
  );
}

mat4 rotationZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat4(
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
}

void main() {
  // Apply rotation based on time
  mat4 rotX = rotationX(u_time * 0.7);
  mat4 rotY = rotationY(u_time * 0.5);
  mat4 rotZ = rotationZ(u_time * 0.3);
  
  vec4 rotatedPos = rotZ * rotY * rotX * vec4(a_position, 1.0);
  
  // Simple perspective
  float fov = 1.5;
  float z = rotatedPos.z + 3.0;
  vec2 projected = rotatedPos.xy * fov / z;
  
  // Adjust for aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  projected.x /= aspect;
  
  gl_Position = vec4(projected, rotatedPos.z * 0.1, 1.0);
  
  // Pass color to fragment shader with some shading based on Z
  float shade = 0.5 + 0.5 * (rotatedPos.z + 1.0) / 2.0;
  v_color = a_color * shade;
  
  // Calculate approximate normal for lighting
  v_normal = normalize((rotZ * rotY * rotX * vec4(a_position, 0.0)).xyz);
}
`

// Fragment shader: Output colored fragments with simple lighting
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_color;
in vec3 v_normal;

uniform float u_time;

out vec4 fragColor;

void main() {
  // Simple directional light
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(normalize(v_normal), lightDir), 0.0);
  
  // Ambient + diffuse lighting
  vec3 ambient = v_color * 0.3;
  vec3 color = ambient + v_color * diffuse * 0.7;
  
  // Add a subtle rim light effect
  float rim = 1.0 - max(dot(normalize(v_normal), vec3(0.0, 0.0, 1.0)), 0.0);
  rim = pow(rim, 3.0);
  color += vec3(0.2, 0.4, 0.8) * rim * 0.5;
  
  fragColor = vec4(color, 1.0);
}
`

// Cube geometry: 36 vertices (6 faces * 2 triangles * 3 vertices)
function createCubeGeometry() {
  // Positions and colors for each face
  const positions: number[] = []
  const colors: number[] = []
  
  const faceColors = [
    [1.0, 0.3, 0.3],  // Right - Red
    [0.3, 1.0, 0.3],  // Left - Green
    [0.3, 0.3, 1.0],  // Top - Blue
    [1.0, 1.0, 0.3],  // Bottom - Yellow
    [1.0, 0.3, 1.0],  // Front - Magenta
    [0.3, 1.0, 1.0],  // Back - Cyan
  ]
  
  const faceVertices = [
    // Right face (+X)
    [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]],
    // Left face (-X)
    [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]],
    // Top face (+Y)
    [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]],
    // Bottom face (-Y)
    [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]],
    // Front face (+Z)
    [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]],
    // Back face (-Z)
    [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]],
  ]
  
  for (let f = 0; f < 6; f++) {
    const faceColor = faceColors[f]
    const vertices = faceVertices[f]
    
    for (const vertex of vertices) {
      positions.push(...vertex)
      colors.push(...faceColor)
    }
  }
  
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    vertexCount: 36
  }
}

const CODE_EXAMPLE = `import { gl, Material, StorageBuffer } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create cube geometry
const cube = createCubeGeometry()

// Create storage buffers for vertex data
const positionBuffer = ctx.storage(cube.positions.byteLength)
positionBuffer.write(cube.positions)

const colorBuffer = ctx.storage(cube.colors.byteLength)
colorBuffer.write(cube.colors)

// Create material with custom vertex + fragment shaders
const material = ctx.material(VERTEX_SHADER, FRAGMENT_SHADER, {
  vertexCount: cube.vertexCount,  // 36 vertices
  topology: 'triangles'
})

// Bind storage buffers as vertex attributes
material.storage('a_position', positionBuffer, {
  size: 3,       // vec3
  stride: 12,    // 3 floats * 4 bytes
  divisor: 0     // Per-vertex data
})

material.storage('a_color', colorBuffer, {
  size: 3,
  stride: 12,
  divisor: 0
})

// Animation loop
function animate() {
  ctx.time = performance.now() / 1000
  
  ctx.clear()
  material.draw()
  
  requestAnimationFrame(animate)
}
animate()`

export default function MaterialExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let material: Material | null = null
    let positionBuffer: StorageBuffer | null = null
    let colorBuffer: StorageBuffer | null = null

    const init = async () => {
      try {
        ctx = await gl.init(canvasRef.current!)
        
        const canvas = canvasRef.current!
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        ctx.width = canvas.width
        ctx.height = canvas.height
        ctx.gl.viewport(0, 0, ctx.width, ctx.height)

        // Create cube geometry
        const cube = createCubeGeometry()

        // Create storage buffers for vertex data
        positionBuffer = ctx.storage(cube.positions.byteLength)
        positionBuffer.write(cube.positions)

        colorBuffer = ctx.storage(cube.colors.byteLength)
        colorBuffer.write(cube.colors)

        // Create material with custom shaders
        material = ctx.material(VERTEX_SHADER, FRAGMENT_SHADER, {
          vertexCount: cube.vertexCount,
          topology: 'triangles'
        })

        // Bind storage buffers as vertex attributes
        material.storage('a_position', positionBuffer, {
          size: 3,
          stride: 12,  // 3 floats * 4 bytes
          divisor: 0   // Per-vertex
        })

        material.storage('a_color', colorBuffer, {
          size: 3,
          stride: 12,
          divisor: 0
        })

        // Enable depth testing for proper 3D rendering
        const glCtx = ctx.gl
        glCtx.enable(glCtx.DEPTH_TEST)
        glCtx.depthFunc(glCtx.LEQUAL)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !material) return
          
          const glCtx = ctx.gl
          ctx.time = (performance.now() - startTime) / 1000
          
          // Clear with gradient-like background
          glCtx.clearColor(0.05, 0.05, 0.1, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT | glCtx.DEPTH_BUFFER_BIT)
          
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
      positionBuffer?.dispose()
      colorBuffer?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Custom Geometry"
      description="Demonstrates rendering custom 3D geometry using the Material class. A rotating cube is rendered with per-face colors and simple lighting using custom vertex and fragment shaders."
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
                <strong className="text-white">StorageBuffer</strong> - Stores vertex positions and colors in GPU memory
              </li>
              <li>
                <strong className="text-white">Custom Vertex Shader</strong> - Transforms 3D vertices with rotation matrices and perspective projection
              </li>
              <li>
                <strong className="text-white">Custom Fragment Shader</strong> - Applies diffuse and rim lighting with per-face colors
              </li>
              <li>
                <strong className="text-white">Depth Testing</strong> - Ensures proper occlusion of cube faces
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">36 Vertices</h4>
              <p className="text-zinc-500 text-xs">6 faces × 2 triangles × 3 vertices</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">6 Colors</h4>
              <p className="text-zinc-500 text-xs">Per-face colors (R, G, B, Y, M, C)</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
              <h4 className="text-white font-medium mb-1 text-sm">3 Axes</h4>
              <p className="text-zinc-500 text-xs">X, Y, Z rotation at different speeds</p>
            </div>
          </div>
        </div>
      }
    />
  )
}
