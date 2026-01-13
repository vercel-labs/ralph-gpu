'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const MORPHING_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Constants
const int MAX_STEPS = 100;
const float MAX_DIST = 50.0;
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

float sdCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// ========================================
// Domain Distortions
// ========================================

vec3 opTwist(vec3 p, float k) {
  float c = cos(k * p.y);
  float s = sin(k * p.y);
  vec2 q = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
  return vec3(q.x, p.y, q.y);
}

vec3 opBend(vec3 p, float k) {
  float c = cos(k * p.x);
  float s = sin(k * p.x);
  vec2 q = vec2(c * p.y - s * p.z, s * p.y + c * p.z);
  return vec3(p.x, q.x, q.y);
}

float opDisplace(vec3 p, float time) {
  return sin(p.x * 5.0 + time) * sin(p.y * 5.0 + time * 1.3) * sin(p.z * 5.0 + time * 0.7) * 0.03;
}

// ========================================
// Morphing Scene
// ========================================

float map(vec3 p) {
  float time = u_time;
  
  // Cycle through shapes every 3 seconds
  float cycleTime = 3.0;
  float totalCycle = cycleTime * 5.0; // 5 shapes
  float t = mod(time, totalCycle);
  int shapeIndex = int(t / cycleTime);
  float morphT = fract(t / cycleTime); // 0 to 1 within each transition
  
  // Smooth easing function
  float easedT = smoothstep(0.0, 1.0, morphT);
  
  // Apply twist/bend during transitions
  float transitionIntensity = sin(morphT * PI); // peaks at 0.5
  vec3 distortedP = p;
  
  distortedP = opTwist(distortedP, transitionIntensity * 1.5);
  distortedP = opBend(distortedP, transitionIntensity * 0.8);
  
  // SDFs for each shape (scaled to similar sizes)
  float sphere = sdSphere(distortedP, 1.0);
  float box = sdBox(distortedP, vec3(0.8));
  float torus = sdTorus(distortedP, vec2(0.8, 0.3));
  float octahedron = sdOctahedron(distortedP, 1.3);
  float cylinder = sdCylinder(distortedP, 0.8, 0.6);
  
  // Morph between shapes
  float d;
  
  if (shapeIndex == 0) {
    // Sphere → Box
    d = mix(sphere, box, easedT);
  } else if (shapeIndex == 1) {
    // Box → Torus
    d = mix(box, torus, easedT);
  } else if (shapeIndex == 2) {
    // Torus → Octahedron
    d = mix(torus, octahedron, easedT);
  } else if (shapeIndex == 3) {
    // Octahedron → Cylinder
    d = mix(octahedron, cylinder, easedT);
  } else {
    // Cylinder → Sphere
    d = mix(cylinder, sphere, easedT);
  }
  
  // Add displacement for organic feel during transitions
  d += opDisplace(p, time) * transitionIntensity;
  
  return d;
}

// Normal calculation
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    
    if (d < SURF_DIST) {
      return t;
    }
    
    if (t > MAX_DIST) {
      break;
    }
    
    t += d;
  }
  
  return MAX_DIST;
}

// Calculate edge glow based on gradient changes
float edgeGlow(vec3 p, vec3 n) {
  float e = 0.05;
  float d1 = map(p + n * e);
  float d2 = map(p - n * e);
  float curvature = abs(d1 + d2 - 2.0 * map(p)) / (e * e);
  return clamp(curvature * 0.5, 0.0, 1.0);
}

// Wireframe effect based on position
float wireframe(vec3 p, vec3 n) {
  float scale = 10.0;
  float thickness = 0.05;
  
  // Grid lines on each axis
  float gridX = abs(fract(p.x * scale + 0.5) - 0.5);
  float gridY = abs(fract(p.y * scale + 0.5) - 0.5);
  float gridZ = abs(fract(p.z * scale + 0.5) - 0.5);
  
  // Weight by normal to show lines perpendicular to surface
  float nx = abs(n.x);
  float ny = abs(n.y);
  float nz = abs(n.z);
  
  float wire = min(gridY, gridZ) * nx;
  wire = min(wire, min(gridX, gridZ) * ny);
  wire = min(wire, min(gridX, gridY) * nz);
  
  return 1.0 - smoothstep(0.0, thickness, wire);
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  
  for (int i = 0; i < 24; i++) {
    if (t >= maxt) break;
    float h = map(ro + rd * t);
    if (h < 0.001) {
      return 0.0;
    }
    res = min(res, k * h / t);
    t += h;
  }
  
  return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.1 * float(i);
    float d = map(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.8;
  }
  
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// Get shape color based on current transition
vec3 getShapeColor(float time) {
  float cycleTime = 3.0;
  float totalCycle = cycleTime * 5.0;
  float t = mod(time, totalCycle);
  int shapeIndex = int(t / cycleTime);
  float morphT = fract(t / cycleTime);
  
  // Colors for each shape
  vec3 sphereCol = vec3(0.9, 0.3, 0.4);   // Red
  vec3 boxCol = vec3(0.3, 0.7, 0.9);      // Cyan
  vec3 torusCol = vec3(0.4, 0.9, 0.4);    // Green
  vec3 octaCol = vec3(0.9, 0.6, 0.2);     // Orange
  vec3 cylCol = vec3(0.7, 0.3, 0.9);      // Purple
  
  vec3 col1;
  vec3 col2;
  
  if (shapeIndex == 0) {
    col1 = sphereCol; col2 = boxCol;
  } else if (shapeIndex == 1) {
    col1 = boxCol; col2 = torusCol;
  } else if (shapeIndex == 2) {
    col1 = torusCol; col2 = octaCol;
  } else if (shapeIndex == 3) {
    col1 = octaCol; col2 = cylCol;
  } else {
    col1 = cylCol; col2 = sphereCol;
  }
  
  return mix(col1, col2, smoothstep(0.0, 1.0, morphT));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv.y = -uv.y;
  
  float time = u_time;
  
  // Camera setup - slow orbit
  float camDist = 4.0;
  float camAngle = time * 0.2;
  
  vec3 ro = vec3(
    cos(camAngle) * camDist,
    sin(time * 0.15) * 1.0 + 0.5,
    sin(camAngle) * camDist
  );
  
  // Look at center
  vec3 lookAt = vec3(0.0);
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  
  // Ray direction
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);
  
  // Light
  vec3 lightDir = normalize(vec3(1.0, 1.0, -0.5));
  vec3 lightCol = vec3(1.0, 0.98, 0.95);
  
  // Raymarch
  float dist = raymarch(ro, rd);
  
  vec3 col = vec3(0.0);
  
  if (dist < MAX_DIST) {
    vec3 p = ro + rd * dist;
    vec3 n = calcNormal(p);
    
    // Base material color
    vec3 matCol = getShapeColor(time);
    
    // View direction
    vec3 viewDir = normalize(ro - p);
    
    // Diffuse
    float diff = max(dot(n, lightDir), 0.0);
    
    // Specular
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 64.0);
    
    // Fresnel
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
    
    // Edge glow
    float edge = edgeGlow(p, n);
    
    // Wireframe overlay
    float wire = wireframe(p, n);
    
    // Ambient occlusion
    float ao = calcAO(p, n);
    
    // Soft shadow
    float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);
    
    // Ambient
    vec3 ambient = vec3(0.08, 0.1, 0.15);
    
    // Combine base lighting
    col = ambient * matCol * ao;
    col += matCol * lightCol * diff * shadow;
    col += lightCol * spec * shadow * 0.6;
    
    // Add holographic rim
    vec3 rimCol = vec3(0.5, 0.8, 1.0);
    col += rimCol * fresnel * 0.5;
    
    // Add edge glow (bright at edges/corners)
    vec3 edgeCol = vec3(1.0, 0.8, 0.4);
    col += edgeCol * edge * 0.3;
    
    // Add wireframe overlay
    vec3 wireCol = mix(vec3(0.2, 0.6, 1.0), vec3(1.0, 0.4, 0.8), sin(time * 2.0) * 0.5 + 0.5);
    col = mix(col, wireCol, wire * 0.4 * (0.5 + fresnel * 0.5));
    
    // Scanline effect for holographic look
    float scanline = sin(p.y * 50.0 + time * 5.0) * 0.5 + 0.5;
    col += wireCol * scanline * wire * 0.1;
    
    // Fog
    float fogAmount = 1.0 - exp(-dist * 0.08);
    vec3 fogColor = vec3(0.02, 0.04, 0.08);
    col = mix(col, fogColor, fogAmount);
    
  } else {
    // Background
    float bgGrad = rd.y * 0.5 + 0.5;
    col = mix(vec3(0.05, 0.07, 0.12), vec3(0.02, 0.03, 0.06), bgGrad);
    
    // Grid floor
    if (rd.y < 0.0) {
      float floorDist = -ro.y / rd.y;
      vec3 floorP = ro + rd * floorDist;
      
      if (floorDist < 50.0 && floorDist > 0.0) {
        float gridScale = 2.0;
        float gridX = abs(fract(floorP.x / gridScale + 0.5) - 0.5);
        float gridZ = abs(fract(floorP.z / gridScale + 0.5) - 0.5);
        float grid = min(gridX, gridZ);
        float gridLine = 1.0 - smoothstep(0.0, 0.02, grid);
        
        float gridFade = exp(-floorDist * 0.05);
        col += vec3(0.1, 0.2, 0.4) * gridLine * gridFade * 0.5;
      }
    }
  }
  
  // Tone mapping
  col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
  
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

const morphing = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Domain distortions
vec3 opTwist(vec3 p, float k) {
  float c = cos(k * p.y);
  float s = sin(k * p.y);
  vec2 q = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
  return vec3(q.x, p.y, q.y);
}

// SDF shapes
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { /* ... */ }
float sdTorus(vec3 p, vec2 t) { /* ... */ }

float map(vec3 p) {
  // Cycle through shapes
  float cycleTime = 3.0;
  float t = mod(u_time, cycleTime * 5.0);
  int shapeIndex = int(t / cycleTime);
  float morphT = smoothstep(0.0, 1.0, fract(t / cycleTime));
  
  // Apply twist during transition
  float intensity = sin(morphT * 3.14159);
  vec3 distorted = opTwist(p, intensity * 1.5);
  
  // Interpolate between shapes
  float sphere = sdSphere(distorted, 1.0);
  float box = sdBox(distorted, vec3(0.8));
  
  return mix(sphere, box, morphT);
}

void main() {
  // Raymarch scene...
  fragColor = vec4(color, 1.0);
}
\`)

function animate() {
  ctx.time = performance.now() / 1000
  morphing.draw()
  requestAnimationFrame(animate)
}`

export default function MorphingExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let morphingPass: Pass | null = null
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

        morphingPass = ctx.pass(MORPHING_SHADER)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !morphingPass) return
          
          ctx.time = (performance.now() - startTime) / 1000
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.0, 0.0, 0.0, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          morphingPass.draw()
          
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
      morphingPass?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Shape Morphing"
      description="Smooth morphing between 3D primitives: Sphere → Cube → Torus → Octahedron → Cylinder. Features twist and bend distortions during transitions with holographic wireframe overlay."
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
            <h3 className="text-lg font-semibold text-white mb-2">Morphing Technique</h3>
            <p className="text-zinc-400 text-sm mb-2">
              Shape morphing is achieved by interpolating between different SDF functions:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Linear Interpolation</strong> - <code className="text-emerald-400">mix(sdf1, sdf2, t)</code> blends distances smoothly</li>
              <li>• <strong className="text-white">Easing Functions</strong> - <code className="text-emerald-400">smoothstep()</code> creates natural acceleration/deceleration</li>
              <li>• <strong className="text-white">3-second Cycles</strong> - Each shape holds for ~1s, morphs over ~2s</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Domain Distortions</h3>
            <p className="text-zinc-400 text-sm mb-2">
              During transitions, the space itself is warped for dramatic effects:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Twist</strong> - Rotates space along Y axis based on distance</li>
              <li>• <strong className="text-white">Bend</strong> - Curves space along X axis</li>
              <li>• <strong className="text-white">Displacement</strong> - Adds noise-based surface detail</li>
              <li>• Peak intensity at mid-transition (sin wave)</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Holographic Effects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Wireframe Overlay</strong> - 3D grid projected onto surface</li>
              <li>• <strong className="text-white">Edge Glow</strong> - Highlights areas of high curvature</li>
              <li>• <strong className="text-white">Scanlines</strong> - Animated horizontal lines for tech aesthetic</li>
              <li>• <strong className="text-white">Color Cycling</strong> - Each shape has distinct color that blends</li>
              <li>• <strong className="text-white">Grid Floor</strong> - Tron-style infinite grid plane</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Shape Cycle</h3>
            <p className="text-zinc-400 text-sm">
              <span className="text-red-400">●</span> Sphere → 
              <span className="text-cyan-400">●</span> Box → 
              <span className="text-green-400">●</span> Torus → 
              <span className="text-orange-400">●</span> Octahedron → 
              <span className="text-purple-400">●</span> Cylinder → 
              <span className="text-red-400">●</span> (repeat)
            </p>
          </div>
        </div>
      }
    />
  )
}
