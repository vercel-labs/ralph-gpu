'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const RAYMARCH_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Constants
const int MAX_STEPS = 100;
const float MAX_DIST = 100.0;
const float SURF_DIST = 0.001;
const float PI = 3.14159265359;

// ========================================
// SDF Primitives
// ========================================

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdOctahedron(vec3 p, float s) {
  vec3 q = abs(p);
  return (q.x + q.y + q.z - s) * 0.57735027;
}

// ========================================
// SDF Operations
// ========================================

float opUnion(float d1, float d2) {
  return min(d1, d2);
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// ========================================
// Rotation helpers
// ========================================

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateX(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateZ(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

// ========================================
// Scene Definition
// ========================================

struct SceneResult {
  float dist;
  float materialId;
};

SceneResult map(vec3 p) {
  float time = u_time;
  SceneResult result;
  
  // Animated central sphere that pulses
  vec3 spherePos = vec3(0.0, sin(time * 2.0) * 0.3, 0.0);
  float sphereRadius = 0.8 + sin(time * 3.0) * 0.1;
  float sphere = sdSphere(p - spherePos, sphereRadius);
  
  // Rotating torus around the sphere
  vec3 torusP = p;
  torusP = rotateY(torusP, time * 0.7);
  torusP = rotateX(torusP, time * 0.5);
  float torus = sdTorus(torusP, vec2(1.5, 0.15));
  
  // Another torus at different angle
  vec3 torus2P = p;
  torus2P = rotateZ(torus2P, time * 0.6);
  torus2P = rotateX(torus2P, PI * 0.5 + time * 0.4);
  float torus2 = sdTorus(torus2P, vec2(1.5, 0.15));
  
  // Orbiting smaller spheres
  float orbitRadius = 2.2;
  vec3 orbit1 = vec3(
    cos(time * 1.5) * orbitRadius,
    sin(time * 2.0) * 0.5,
    sin(time * 1.5) * orbitRadius
  );
  vec3 orbit2 = vec3(
    cos(time * 1.2 + PI * 0.66) * orbitRadius,
    sin(time * 1.8 + PI) * 0.5,
    sin(time * 1.2 + PI * 0.66) * orbitRadius
  );
  vec3 orbit3 = vec3(
    cos(time * 1.0 + PI * 1.33) * orbitRadius,
    sin(time * 1.5 + PI * 0.5) * 0.5,
    sin(time * 1.0 + PI * 1.33) * orbitRadius
  );
  
  float orbitSphere1 = sdSphere(p - orbit1, 0.3);
  float orbitSphere2 = sdSphere(p - orbit2, 0.3);
  float orbitSphere3 = sdSphere(p - orbit3, 0.3);
  
  // Rotating box
  vec3 boxP = p - vec3(0.0, -1.5, 0.0);
  boxP = rotateY(boxP, time * 0.8);
  boxP = rotateX(boxP, time * 0.3);
  float box = sdBox(boxP, vec3(0.4));
  
  // Octahedron floating above
  vec3 octP = p - vec3(0.0, 1.8 + sin(time * 2.5) * 0.2, 0.0);
  octP = rotateY(octP, time);
  float oct = sdOctahedron(octP, 0.5);
  
  // Ground plane
  float ground = p.y + 3.5;
  
  // Combine everything
  float d = sphere;
  float matId = 1.0;
  
  // Smooth blend tori with sphere
  d = opSmoothUnion(d, torus, 0.3);
  d = opSmoothUnion(d, torus2, 0.3);
  
  // Add orbiting spheres (different material)
  float orbitDist = min(min(orbitSphere1, orbitSphere2), orbitSphere3);
  if (orbitDist < d) {
    matId = 2.0;
  }
  d = opSmoothUnion(d, orbitDist, 0.2);
  
  // Add box
  if (box < d) {
    matId = 3.0;
  }
  d = opSmoothUnion(d, box, 0.15);
  
  // Add octahedron
  if (oct < d) {
    matId = 4.0;
  }
  d = opSmoothUnion(d, oct, 0.15);
  
  // Ground with different material
  if (ground < d) {
    matId = 0.0;
  }
  d = min(d, ground);
  
  result.dist = d;
  result.materialId = matId;
  return result;
}

// Simple map returning just distance for normals/shadows
float mapDist(vec3 p) {
  return map(p).dist;
}

// ========================================
// Normal Calculation
// ========================================

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    mapDist(p + e.xyy) - mapDist(p - e.xyy),
    mapDist(p + e.yxy) - mapDist(p - e.yxy),
    mapDist(p + e.yyx) - mapDist(p - e.yyx)
  ));
}

// ========================================
// Raymarching
// ========================================

SceneResult raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  SceneResult result;
  result.dist = MAX_DIST;
  result.materialId = -1.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    SceneResult res = map(p);
    
    if (res.dist < SURF_DIST) {
      result.dist = t;
      result.materialId = res.materialId;
      break;
    }
    
    if (t > MAX_DIST) {
      break;
    }
    
    t += res.dist;
  }
  
  return result;
}

// ========================================
// Soft Shadows
// ========================================

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  
  for (int i = 0; i < 32; i++) {
    if (t >= maxt) break;
    float h = mapDist(ro + rd * t);
    if (h < 0.001) {
      return 0.0;
    }
    res = min(res, k * h / t);
    t += h;
  }
  
  return res;
}

// ========================================
// Ambient Occlusion
// ========================================

float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = mapDist(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// ========================================
// Material Colors
// ========================================

vec3 getMaterial(float matId, vec3 p) {
  float time = u_time;
  
  if (matId < 0.5) {
    // Ground - checkerboard
    float checker = step(0.0, sin(p.x * 2.0) * sin(p.z * 2.0));
    return mix(vec3(0.1, 0.1, 0.12), vec3(0.15, 0.15, 0.18), checker);
  } else if (matId < 1.5) {
    // Main sphere + tori - gradient based on position
    float h = sin(p.y * 2.0 + time) * 0.5 + 0.5;
    return mix(vec3(0.8, 0.2, 0.4), vec3(0.2, 0.4, 0.9), h);
  } else if (matId < 2.5) {
    // Orbiting spheres - emissive-like warm colors
    return vec3(1.0, 0.6, 0.2);
  } else if (matId < 3.5) {
    // Box - cool cyan
    return vec3(0.2, 0.8, 0.8);
  } else {
    // Octahedron - golden
    return vec3(0.95, 0.8, 0.3);
  }
}

// ========================================
// Main
// ========================================

void main() {
  // Normalized coordinates (-1 to 1, aspect corrected)
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv.y = -uv.y;  // Flip Y
  
  float time = u_time;
  
  // Camera setup - orbit around scene
  float camDist = 6.0;
  float camAngle = time * 0.3;
  float camHeight = 2.0 + sin(time * 0.5) * 0.5;
  
  vec3 ro = vec3(
    cos(camAngle) * camDist,
    camHeight,
    sin(camAngle) * camDist
  );
  
  // Look at center
  vec3 lookAt = vec3(0.0);
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  
  // Ray direction
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);
  
  // Light positions
  vec3 lightPos1 = vec3(5.0, 8.0, -5.0);
  vec3 lightPos2 = vec3(-4.0, 3.0, 4.0);
  vec3 lightCol1 = vec3(1.0, 0.95, 0.9);
  vec3 lightCol2 = vec3(0.4, 0.5, 0.8);
  
  // Raymarch
  SceneResult hit = raymarch(ro, rd);
  
  vec3 col = vec3(0.0);
  
  if (hit.dist < MAX_DIST) {
    // Hit point
    vec3 p = ro + rd * hit.dist;
    vec3 n = calcNormal(p);
    
    // Material
    vec3 matCol = getMaterial(hit.materialId, p);
    
    // Ambient occlusion
    float ao = calcAO(p, n);
    
    // Lighting
    vec3 l1Dir = normalize(lightPos1 - p);
    vec3 l2Dir = normalize(lightPos2 - p);
    
    // Diffuse
    float diff1 = max(dot(n, l1Dir), 0.0);
    float diff2 = max(dot(n, l2Dir), 0.0);
    
    // Specular (Blinn-Phong)
    vec3 viewDir = normalize(ro - p);
    vec3 h1 = normalize(l1Dir + viewDir);
    vec3 h2 = normalize(l2Dir + viewDir);
    float spec1 = pow(max(dot(n, h1), 0.0), 32.0);
    float spec2 = pow(max(dot(n, h2), 0.0), 32.0);
    
    // Soft shadows
    float shadow1 = softShadow(p + n * 0.01, l1Dir, 0.02, 10.0, 16.0);
    float shadow2 = softShadow(p + n * 0.01, l2Dir, 0.02, 10.0, 16.0);
    
    // Ambient
    vec3 ambient = vec3(0.03, 0.04, 0.06);
    
    // Combine lighting
    col = ambient * matCol;
    col += matCol * lightCol1 * diff1 * shadow1;
    col += matCol * lightCol2 * diff2 * shadow2;
    col += lightCol1 * spec1 * shadow1 * 0.3;
    col += lightCol2 * spec2 * shadow2 * 0.2;
    
    // Apply AO
    col *= ao;
    
    // Fresnel rim light
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
    col += fresnel * vec3(0.3, 0.4, 0.6) * 0.5;
    
    // Fog
    float fogAmount = 1.0 - exp(-hit.dist * 0.04);
    vec3 fogColor = vec3(0.02, 0.03, 0.05);
    col = mix(col, fogColor, fogAmount);
  } else {
    // Background - subtle gradient
    float bgGrad = rd.y * 0.5 + 0.5;
    col = mix(vec3(0.02, 0.02, 0.04), vec3(0.05, 0.08, 0.15), bgGrad);
    
    // Add some subtle "stars"
    float stars = fract(sin(dot(floor(rd * 500.0), vec3(12.9898, 78.233, 45.543))) * 43758.5453);
    if (stars > 0.998) {
      col += vec3(0.5) * (stars - 0.998) * 500.0;
    }
  }
  
  // Tone mapping
  col = col / (col + vec3(1.0));
  
  // Gamma correction
  col = pow(col, vec3(1.0 / 2.2));
  
  // Vignette
  float vignette = 1.0 - 0.3 * length(uv);
  col *= vignette;
  
  fragColor = vec4(col, 1.0);
}
`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)

// Raymarching shader with SDFs, lighting, and effects
const raymarch = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// SDF primitives
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Scene
float map(vec3 p) {
  float sphere = sdSphere(p, 1.0);
  float box = sdBox(p - vec3(0.0, -2.0, 0.0), vec3(5.0, 0.1, 5.0));
  return min(sphere, box);
}

// Raymarch
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 100; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001 || t > 100.0) break;
    t += d;
  }
  return t;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  
  // Camera
  vec3 ro = vec3(0.0, 1.0, -3.0);
  vec3 rd = normalize(vec3(uv, 1.0));
  
  // Raymarch
  float t = raymarch(ro, rd);
  
  vec3 col = vec3(0.0);
  if (t < 100.0) {
    col = vec3(0.8, 0.4, 0.2);
  }
  
  fragColor = vec4(col, 1.0);
}
\`)

function animate() {
  ctx.time = performance.now() / 1000
  raymarch.draw()
  requestAnimationFrame(animate)
}`

export default function RaymarchingExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let raymarchPass: Pass | null = null
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

        raymarchPass = ctx.pass(RAYMARCH_SHADER)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !raymarchPass) return
          
          ctx.time = (performance.now() - startTime) / 1000
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.0, 0.0, 0.0, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          raymarchPass.draw()
          
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
      raymarchPass?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="3D Raymarching"
      description="Real-time raymarched scene with SDF primitives, smooth blending, soft shadows, ambient occlusion, and two-point lighting. Fully rendered in a fragment shader."
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
            <h3 className="text-lg font-semibold text-white mb-2">Raymarching Technique</h3>
            <p className="text-zinc-400 text-sm mb-2">
              Raymarching renders 3D scenes entirely in the fragment shader by marching rays through the scene 
              and using Signed Distance Functions (SDFs) to define geometry.
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">SDF Primitives</strong> - Sphere, box, torus, octahedron</li>
              <li>• <strong className="text-white">Boolean Operations</strong> - Union, smooth union for organic blending</li>
              <li>• <strong className="text-white">Transformations</strong> - Rotation, translation applied in 3D space</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Lighting & Effects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Soft Shadows</strong> - Penumbra shadows with adjustable softness</li>
              <li>• <strong className="text-white">Ambient Occlusion</strong> - Depth-based darkening in crevices</li>
              <li>• <strong className="text-white">Specular Highlights</strong> - Blinn-Phong shading model</li>
              <li>• <strong className="text-white">Fresnel Rim Light</strong> - Edge lighting effect</li>
              <li>• <strong className="text-white">Fog</strong> - Distance-based atmospheric fog</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Scene Objects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <span className="text-pink-400">●</span> Central pulsing sphere with rotating tori</li>
              <li>• <span className="text-orange-400">●</span> Three orbiting spheres</li>
              <li>• <span className="text-cyan-400">●</span> Rotating cube</li>
              <li>• <span className="text-yellow-400">●</span> Floating octahedron</li>
              <li>• Checkered ground plane</li>
            </ul>
          </div>
        </div>
      }
    />
  )
}
