"use client";
import { useEffect, useRef } from "react";
import { gpu, GPUContext } from "ralph-gpu";

// Simple 4x4 matrix helpers (column-major order, compatible with WGSL)
function mat4Identity(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

function mat4RotateY(a: Float32Array, rad: number): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const out = new Float32Array(16);
  
  // Column 0
  out[0] = a[0] * c - a[8] * s;
  out[1] = a[1] * c - a[9] * s;
  out[2] = a[2] * c - a[10] * s;
  out[3] = a[3] * c - a[11] * s;
  
  // Column 1 (unchanged)
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  
  // Column 2
  out[8] = a[0] * s + a[8] * c;
  out[9] = a[1] * s + a[9] * c;
  out[10] = a[2] * s + a[10] * c;
  out[11] = a[3] * s + a[11] * c;
  
  // Column 3 (unchanged)
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  
  return out;
}

function mat4RotateX(a: Float32Array, rad: number): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const out = new Float32Array(16);
  
  // Column 0 (unchanged)
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  
  // Column 1
  out[4] = a[4] * c + a[8] * s;
  out[5] = a[5] * c + a[9] * s;
  out[6] = a[6] * c + a[10] * s;
  out[7] = a[7] * c + a[11] * s;
  
  // Column 2
  out[8] = a[8] * c - a[4] * s;
  out[9] = a[9] * c - a[5] * s;
  out[10] = a[10] * c - a[6] * s;
  out[11] = a[11] * c - a[7] * s;
  
  // Column 3 (unchanged)
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  
  return out;
}

function mat4Translate(a: Float32Array, v: [number, number, number]): Float32Array {
  const out = new Float32Array(a);
  // Column 3 = Column 0 * v[0] + Column 1 * v[1] + Column 2 * v[2] + Column 3
  out[12] = a[0] * v[0] + a[4] * v[1] + a[8] * v[2] + a[12];
  out[13] = a[1] * v[0] + a[5] * v[1] + a[9] * v[2] + a[13];
  out[14] = a[2] * v[0] + a[6] * v[1] + a[10] * v[2] + a[14];
  out[15] = a[3] * v[0] + a[7] * v[1] + a[11] * v[2] + a[15];
  return out;
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] = 
        a[row] * b[col * 4] +
        a[row + 4] * b[col * 4 + 1] +
        a[row + 8] * b[col * 4 + 2] +
        a[row + 12] * b[col * 4 + 3];
    }
  }
  return out;
}

export default function GeometryPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let disposed = false;

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;
      ctx = await gpu.init(canvasRef.current, { dpr: 2 });
      if (disposed) { ctx.dispose(); return; }

      // ========================================
      // Example 1: Simple Triangle (no index buffer)
      // ========================================
      
      // Triangle positions in storage buffer (3 vertices × vec3f)
      // NOTE: In WGSL, array<vec3f> has 16-byte stride (not 12) due to alignment
      // Each vec3f is padded to 16 bytes
      const trianglePositions = ctx.storage(3 * 16); // 3 vec3f × 16 bytes each
      trianglePositions.write(new Float32Array([
         0.0,  0.5, 0.0, 0.0,  // top (x, y, z, padding)
        -0.5, -0.5, 0.0, 0.0,  // bottom-left (x, y, z, padding)
         0.5, -0.5, 0.0, 0.0,  // bottom-right (x, y, z, padding)
      ]));

      const triangle = ctx.material(/* wgsl */ `
        @group(1) @binding(0) var<storage, read> positions: array<vec3f>;
        
        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
          let time = globals.time;
          let pos = positions[vid];
          let yOffset = sin(time * 2.0) * 0.05;
          return vec4f(pos.x - 0.5, pos.y + yOffset, pos.z, 1.0);
        }
        
        @fragment
        fn fs_main() -> @location(0) vec4f {
          return vec4f(1.0, 0.3, 0.3, 1.0);
        }
      `, { vertexCount: 3 });
      triangle.storage("positions", trianglePositions);

      // ========================================
      // Example 2: Rotating Cube (with index buffer)
      // ========================================
      
      // 8 unique vertices for a cube (16-byte aligned for array<vec3f>)
      const cubePositions = ctx.storage(8 * 16);
      cubePositions.write(new Float32Array([
        -0.5, -0.5, -0.5, 0,  // 0 - back bottom left
         0.5, -0.5, -0.5, 0,  // 1 - back bottom right
         0.5,  0.5, -0.5, 0,  // 2 - back top right
        -0.5,  0.5, -0.5, 0,  // 3 - back top left
        -0.5, -0.5,  0.5, 0,  // 4 - front bottom left
         0.5, -0.5,  0.5, 0,  // 5 - front bottom right
         0.5,  0.5,  0.5, 0,  // 6 - front top right
        -0.5,  0.5,  0.5, 0,  // 7 - front top left
      ]));

      // 36 indices (12 triangles, 2 per face)
      const cubeIndices = ctx.storage(36 * 4);
      cubeIndices.write(new Uint32Array([
        // Front face
        4, 5, 6,  4, 6, 7,
        // Back face
        1, 0, 3,  1, 3, 2,
        // Top face
        7, 6, 2,  7, 2, 3,
        // Bottom face
        0, 1, 5,  0, 5, 4,
        // Right face
        5, 1, 2,  5, 2, 6,
        // Left face
        0, 4, 7,  0, 7, 3,
      ]));

      // MVP matrix storage buffer (64 bytes for mat4x4f)
      const mvpBuffer = ctx.storage(64);
      
      // Create the MVP matrix uniform value
      const mvpData = mat4Identity();

      const cube = ctx.material(/* wgsl */ `
        @group(1) @binding(0) var<storage, read> mvp: mat4x4f;
        @group(1) @binding(1) var<storage, read> positions: array<vec3f>;
        
        struct VertexOutput {
          @builtin(position) pos: vec4f,
          @location(0) color: vec3f,
        }
        
        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
          // Reference globals to ensure proper bind group setup
          let t = globals.time * 0.0;
          var out: VertexOutput;
          let localPos = positions[vid];
          out.pos = mvp * vec4f(localPos + t, 1.0);
          // Color based on position (shifted to 0-1 range)
          out.color = localPos + 0.5;
          return out;
        }
        
        @fragment
        fn fs_main(in: VertexOutput) -> @location(0) vec4f {
          return vec4f(in.color, 1.0);
        }
      `, {
        indexBuffer: cubeIndices,
        indexFormat: "uint32",
        indexCount: 36,
      });
      cube.storage("mvp", mvpBuffer);
      cube.storage("positions", cubePositions);

      const startTime = performance.now();

      function frame() {
        if (disposed || !ctx) return;
        
        const time = (performance.now() - startTime) / 1000;
        
        // Update MVP matrix for the cube
        const aspect = ctx.width / ctx.height;
        const projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 100);
        
        // Model matrix: rotate around Y and X axes
        let model = mat4Identity();
        model = mat4Translate(model, [0.5, 0, -3]); // Move cube to right side and back
        model = mat4RotateY(model, time * 0.7);
        model = mat4RotateX(model, time * 0.5);
        
        // MVP = projection * model (no separate view matrix for simplicity)
        const mvp = mat4Multiply(projection, model);
        mvpBuffer.write(mvp);
        
        ctx.autoClear = false
        ctx.clear();
        triangle.draw();
        cube.draw();
        
        requestAnimationFrame(frame);
      }
      frame();
    }

    init();
    return () => { disposed = true; ctx?.dispose(); };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#111" }}>
      <h1 style={{ 
        position: "absolute", 
        top: 20, 
        left: 20, 
        color: "white", 
        fontFamily: "system-ui",
        fontSize: "16px",
        margin: 0,
        zIndex: 10,
      }}>
        Geometry Examples: Triangle (left) + Rotating Cube (right)
      </h1>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
