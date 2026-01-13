'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const MANDELBULB_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Constants
const int MAX_STEPS = 128;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.0005;
const float PI = 3.14159265359;
const float POWER = 8.0;
const int MAX_ITERATIONS = 8;
const float BAILOUT = 2.0;

// Mandelbulb distance estimator with orbit trap data
struct MandelbulbResult {
  float dist;
  float iterations;
  vec3 orbitTrap;
};

MandelbulbResult mandelbulb(vec3 pos) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  float iterations = 0.0;
  vec3 orbitTrap = vec3(1e10);
  
  for (int i = 0; i < MAX_ITERATIONS; i++) {
    r = length(z);
    
    if (r > BAILOUT) {
      break;
    }
    
    iterations = float(i);
    
    // Orbit trap - track minimum distance to coordinate planes
    orbitTrap = min(orbitTrap, abs(z));
    
    // Convert to spherical coordinates
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    
    // Scale the derivative
    dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
    
    // Mandelbulb formula: z^n + c
    float zr = pow(r, POWER);
    float newTheta = theta * POWER;
    float newPhi = phi * POWER;
    
    z = zr * vec3(
      sin(newTheta) * cos(newPhi),
      sin(newTheta) * sin(newPhi),
      cos(newTheta)
    );
    z += pos;
  }
  
  MandelbulbResult result;
  result.dist = 0.5 * log(r) * r / dr;
  result.iterations = iterations;
  result.orbitTrap = orbitTrap;
  return result;
}

// Scene map
MandelbulbResult map(vec3 p) {
  return mandelbulb(p);
}

// Calculate normal using gradient
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0001, 0.0);
  return normalize(vec3(
    mandelbulb(p + e.xyy).dist - mandelbulb(p - e.xyy).dist,
    mandelbulb(p + e.yxy).dist - mandelbulb(p - e.yxy).dist,
    mandelbulb(p + e.yyx).dist - mandelbulb(p - e.yyx).dist
  ));
}

// Raymarching with iteration tracking
struct RayResult {
  float dist;
  int steps;
  float iterations;
  vec3 orbitTrap;
};

RayResult raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  RayResult result;
  result.dist = MAX_DIST;
  result.steps = 0;
  result.iterations = 0.0;
  result.orbitTrap = vec3(1.0);
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    MandelbulbResult res = map(p);
    
    result.steps = i;
    
    if (res.dist < SURF_DIST) {
      result.dist = t;
      result.iterations = res.iterations;
      result.orbitTrap = res.orbitTrap;
      break;
    }
    
    if (t > MAX_DIST) {
      break;
    }
    
    t += res.dist * 0.8; // Slight understepping for safety
  }
  
  return result;
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  
  for (int i = 0; i < 32; i++) {
    if (t >= maxt) break;
    float h = mandelbulb(ro + rd * t).dist;
    if (h < 0.001) {
      return 0.0;
    }
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.2);
  }
  
  return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.08 * float(i);
    float d = mandelbulb(pos + h * nor).dist;
    occ += (h - d) * sca;
    sca *= 0.85;
  }
  
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// Color palette function
vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv.y = -uv.y;
  
  float time = u_time * 0.2;
  
  // Camera orbit around the Mandelbulb
  float camDist = 2.8 + sin(time * 0.5) * 0.3;
  float camAngleY = time * 0.4;
  float camAngleX = sin(time * 0.3) * 0.3 + 0.3;
  
  vec3 ro = vec3(
    cos(camAngleY) * cos(camAngleX) * camDist,
    sin(camAngleX) * camDist,
    sin(camAngleY) * cos(camAngleX) * camDist
  );
  
  // Look at center
  vec3 lookAt = vec3(0.0);
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  
  // Ray direction with slight fish-eye for drama
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);
  
  // Light setup
  vec3 lightDir = normalize(vec3(1.0, 0.8, -0.5));
  vec3 lightCol = vec3(1.0, 0.95, 0.9);
  
  // Raymarch
  RayResult hit = raymarch(ro, rd);
  
  vec3 col = vec3(0.0);
  
  if (hit.dist < MAX_DIST) {
    vec3 p = ro + rd * hit.dist;
    vec3 n = calcNormal(p);
    
    // Base color from orbit trap
    vec3 trapCol = palette(length(hit.orbitTrap) * 2.0 + time * 0.5);
    
    // Iteration-based coloring
    vec3 iterCol = palette(hit.iterations / float(MAX_ITERATIONS) + 0.3);
    
    // Mix colors
    vec3 matCol = mix(trapCol, iterCol, 0.5);
    
    // Ambient occlusion
    float ao = calcAO(p, n);
    
    // Diffuse lighting
    float diff = max(dot(n, lightDir), 0.0);
    
    // Soft shadow
    float shadow = softShadow(p + n * 0.002, lightDir, 0.01, 5.0, 8.0);
    
    // Specular
    vec3 viewDir = normalize(ro - p);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 64.0);
    
    // Fresnel rim
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
    
    // Ambient
    vec3 ambient = vec3(0.05, 0.08, 0.12);
    
    // Combine
    col = ambient * matCol * ao;
    col += matCol * lightCol * diff * shadow;
    col += lightCol * spec * shadow * 0.5;
    col += vec3(0.4, 0.6, 1.0) * fresnel * 0.3;
    
    // Glow based on step count (edges glow more)
    float glowAmount = float(hit.steps) / float(MAX_STEPS);
    vec3 glowCol = palette(glowAmount + time * 0.2);
    col += glowCol * glowAmount * 0.15;
    
    // Fog
    float fogAmount = 1.0 - exp(-hit.dist * 0.15);
    vec3 fogColor = vec3(0.01, 0.02, 0.04);
    col = mix(col, fogColor, fogAmount);
  } else {
    // Background with glow based on closest approach
    float bgGrad = rd.y * 0.5 + 0.5;
    col = mix(vec3(0.01, 0.02, 0.04), vec3(0.02, 0.04, 0.08), bgGrad);
    
    // Glow based on how many steps we took (indicates near-miss)
    float glowIntensity = float(hit.steps) / float(MAX_STEPS);
    vec3 glowCol = palette(glowIntensity + time * 0.2);
    col += glowCol * glowIntensity * glowIntensity * 0.5;
  }
  
  // Tone mapping (ACES approximation)
  col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
  
  // Gamma correction
  col = pow(col, vec3(1.0 / 2.2));
  
  // Vignette
  float vignette = 1.0 - 0.4 * length(uv);
  col *= vignette;
  
  fragColor = vec4(col, 1.0);
}
`

const CODE_EXAMPLE = `import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)

const mandelbulb = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

const float POWER = 8.0;
const int MAX_ITERATIONS = 8;

// Mandelbulb distance estimator
float mandelbulb(vec3 pos) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  
  for (int i = 0; i < MAX_ITERATIONS; i++) {
    r = length(z);
    if (r > 2.0) break;
    
    // Convert to spherical
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    
    // Scale derivative
    dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
    
    // Mandelbulb: z^n + c
    float zr = pow(r, POWER);
    theta *= POWER;
    phi *= POWER;
    
    z = zr * vec3(
      sin(theta) * cos(phi),
      sin(theta) * sin(phi),
      cos(theta)
    );
    z += pos;
  }
  
  return 0.5 * log(r) * r / dr;
}

void main() {
  // Raymarch the fractal...
  // Apply orbit trap coloring...
  
  fragColor = vec4(color, 1.0);
}
\`)

function animate() {
  ctx.time = performance.now() / 1000
  mandelbulb.draw()
  requestAnimationFrame(animate)
}`

export default function MandelbulbExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let mandelbulbPass: Pass | null = null
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

        mandelbulbPass = ctx.pass(MANDELBULB_SHADER)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !mandelbulbPass) return
          
          ctx.time = (performance.now() - startTime) / 1000
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.0, 0.0, 0.0, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          mandelbulbPass.draw()
          
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
      mandelbulbPass?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Mandelbulb Fractal"
      description="A 3D fractal raymarched in real-time. The Mandelbulb is the 3D equivalent of the Mandelbrot set, featuring orbit trapping for coloring and glow effects based on iteration count."
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
            <h3 className="text-lg font-semibold text-white mb-2">The Mandelbulb Formula</h3>
            <p className="text-zinc-400 text-sm mb-2">
              The Mandelbulb extends the 2D Mandelbrot set to 3D using spherical coordinates:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">z^n + c</strong> - The core iteration formula (n=8 here)</li>
              <li>• <strong className="text-white">Spherical Coordinates</strong> - Convert cartesian → (r, θ, φ) → power → back</li>
              <li>• <strong className="text-white">Distance Estimation</strong> - Uses derivative tracking for accurate surface detection</li>
              <li>• <strong className="text-white">8 Iterations</strong> - Balance between detail and performance</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Orbit Trap Coloring</h3>
            <p className="text-zinc-400 text-sm mb-2">
              Colors are derived from the fractal iteration process:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Orbit Traps</strong> - Track closest approach to coordinate planes during iteration</li>
              <li>• <strong className="text-white">Iteration Count</strong> - Different escape speeds create color bands</li>
              <li>• <strong className="text-white">Palette Function</strong> - Cosine-based smooth color gradients</li>
              <li>• Blend both methods for rich, varied coloring</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Rendering Techniques</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">128 Raymarch Steps</strong> - High precision for fractal details</li>
              <li>• <strong className="text-white">Conservative Stepping</strong> - 0.8× multiplier prevents overshooting thin features</li>
              <li>• <strong className="text-white">Soft Shadows</strong> - Multiple samples for realistic shadow penumbra</li>
              <li>• <strong className="text-white">Edge Glow</strong> - Visualizes raymarch complexity (more steps = brighter)</li>
              <li>• <strong className="text-white">Background Glow</strong> - Shows "near misses" when ray doesn't hit</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-900 bg-amber-900/20 p-4">
            <h3 className="text-lg font-semibold text-amber-400 mb-2">Performance Note</h3>
            <p className="text-zinc-400 text-sm">
              This is one of the most computationally intensive shaders. Each pixel requires up to 
              <strong className="text-white"> 128 raymarching steps</strong>, each performing 
              <strong className="text-white"> 8 fractal iterations</strong> - that's over 1000 operations per pixel! 
              The fractal's self-similar nature makes it worth the cost.
            </p>
          </div>
        </div>
      }
    />
  )
}
