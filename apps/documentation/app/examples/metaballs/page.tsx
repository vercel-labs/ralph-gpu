'use client'

import { useEffect, useRef, useState } from 'react'
import { gl, GLContext, Pass } from 'ralph-gl'
import { FullscreenExample } from '@/components/FullscreenExample'
import { CodeBlock } from '@/components/CodeBlock'

const METABALLS_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Constants
const int MAX_STEPS = 100;
const float MAX_DIST = 50.0;
const float SURF_DIST = 0.001;
const float PI = 3.14159265359;
const int NUM_BALLS = 7;

// Smooth minimum (polynomial)
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

// Sphere SDF
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Get ball position at time
vec3 getBallPos(int index, float time) {
  float t = time * 0.5;
  float i = float(index);
  
  // Each ball has unique orbital motion
  float phase1 = i * 0.7 + t;
  float phase2 = i * 1.3 + t * 0.8;
  float phase3 = i * 0.5 + t * 1.2;
  
  float radius = 1.5 + sin(i * 2.0) * 0.5;
  
  return vec3(
    sin(phase1) * cos(phase2 * 0.5) * radius,
    sin(phase2) * cos(phase3 * 0.7) * radius * 0.7,
    cos(phase1) * sin(phase3) * radius
  );
}

// Get ball radius at time
float getBallRadius(int index, float time) {
  float i = float(index);
  float baseRadius = 0.4 + sin(i * 1.5) * 0.15;
  float pulse = sin(time * 2.0 + i * 0.8) * 0.1;
  return baseRadius + pulse;
}

// Scene map - returns distance and color blend info
struct SceneResult {
  float dist;
  vec3 blend; // For color blending
};

SceneResult map(vec3 p) {
  float time = u_time;
  SceneResult result;
  result.dist = MAX_DIST;
  result.blend = vec3(0.0);
  
  float blendK = 0.8; // Blend factor
  
  // Add all metaballs with smooth union
  for (int i = 0; i < NUM_BALLS; i++) {
    vec3 ballPos = getBallPos(i, time);
    float ballRadius = getBallRadius(i, time);
    float d = sdSphere(p - ballPos, ballRadius);
    
    // Color influence (closer balls have more influence)
    float influence = 1.0 / (1.0 + d * d);
    float hue = float(i) / float(NUM_BALLS);
    
    // Convert hue to RGB for blending
    vec3 ballCol = vec3(
      sin(hue * 6.28 + 0.0) * 0.5 + 0.5,
      sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
      sin(hue * 6.28 + 4.19) * 0.5 + 0.5
    );
    
    result.blend += ballCol * influence;
    result.dist = smin(result.dist, d, blendK);
  }
  
  // Normalize blend colors
  result.blend = normalize(result.blend + vec3(0.001));
  
  return result;
}

// Simple distance map
float mapDist(vec3 p) {
  return map(p).dist;
}

// Normal calculation
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    mapDist(p + e.xyy) - mapDist(p - e.xyy),
    mapDist(p + e.yxy) - mapDist(p - e.yxy),
    mapDist(p + e.yyx) - mapDist(p - e.yyx)
  ));
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = mapDist(p);
    
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

// Subsurface scattering approximation
float subsurface(vec3 p, vec3 n, vec3 lightDir) {
  // Sample behind the surface
  float scatter = 0.0;
  
  for (int i = 1; i <= 3; i++) {
    float fi = float(i);
    vec3 samplePos = p - n * fi * 0.1;
    float d = mapDist(samplePos);
    scatter += smoothstep(0.0, 1.0, d) / fi;
  }
  
  // Directional component
  float backlight = max(dot(-n, lightDir), 0.0);
  
  return scatter * backlight * 0.3;
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  
  for (int i = 0; i < 24; i++) {
    if (t >= maxt) break;
    float h = mapDist(ro + rd * t);
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
    float d = mapDist(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.8;
  }
  
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// Iridescence based on view angle and normal
vec3 iridescence(vec3 viewDir, vec3 normal, float time) {
  float NdotV = dot(normal, viewDir);
  float t = NdotV * 3.0 + time * 0.5;
  
  return vec3(
    sin(t + 0.0) * 0.5 + 0.5,
    sin(t + 2.1) * 0.5 + 0.5,
    sin(t + 4.2) * 0.5 + 0.5
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv.y = -uv.y;
  
  float time = u_time;
  
  // Camera orbiting the metaballs
  float camDist = 5.0;
  float camAngle = time * 0.3;
  
  vec3 ro = vec3(
    cos(camAngle) * camDist,
    sin(time * 0.2) * 1.0 + 1.5,
    sin(camAngle) * camDist
  );
  
  // Look at center
  vec3 lookAt = vec3(0.0);
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  
  // Ray direction
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);
  
  // Light setup - moving light
  float lightAngle = time * 0.5;
  vec3 lightPos = vec3(
    cos(lightAngle) * 4.0,
    3.0 + sin(time * 0.7),
    sin(lightAngle) * 4.0
  );
  
  // Raymarch
  float dist = raymarch(ro, rd);
  
  vec3 col = vec3(0.0);
  
  if (dist < MAX_DIST) {
    vec3 p = ro + rd * dist;
    vec3 n = calcNormal(p);
    SceneResult sceneData = map(p);
    
    // Get base color from blend
    vec3 baseCol = sceneData.blend;
    
    // View and light directions
    vec3 viewDir = normalize(ro - p);
    vec3 lightDir = normalize(lightPos - p);
    
    // Fresnel
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
    
    // Iridescent color shift
    vec3 iriCol = iridescence(viewDir, n, time);
    
    // Mix base color with iridescence based on fresnel
    vec3 matCol = mix(baseCol, iriCol, fresnel * 0.6);
    
    // Diffuse lighting
    float diff = max(dot(n, lightDir), 0.0);
    
    // Specular (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 64.0);
    
    // Subsurface scattering
    float sss = subsurface(p, n, lightDir);
    
    // Ambient occlusion
    float ao = calcAO(p, n);
    
    // Soft shadows
    float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);
    
    // Combine lighting
    vec3 ambient = vec3(0.1, 0.12, 0.15);
    vec3 lightCol = vec3(1.0, 0.95, 0.9);
    
    col = ambient * matCol * ao;
    col += matCol * lightCol * diff * shadow;
    col += matCol * sss; // Subsurface adds translucent glow
    col += lightCol * spec * shadow * 0.7;
    
    // Rim light with iridescence
    col += iriCol * fresnel * 0.4;
    
    // Inner glow effect
    float glowAmount = 1.0 - smoothstep(0.0, 0.3, dist);
    col += baseCol * glowAmount * 0.2;
    
    // Fog
    float fogAmount = 1.0 - exp(-dist * 0.05);
    vec3 fogColor = vec3(0.05, 0.07, 0.1);
    col = mix(col, fogColor, fogAmount);
    
  } else {
    // Background gradient
    float bgGrad = rd.y * 0.5 + 0.5;
    col = mix(vec3(0.08, 0.1, 0.15), vec3(0.02, 0.03, 0.06), bgGrad);
    
    // Subtle radial gradient for depth
    float radialDist = length(uv);
    col = mix(col, vec3(0.15, 0.12, 0.2), (1.0 - radialDist) * 0.2);
  }
  
  // Tone mapping (ACES)
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

// Metaballs shader with smooth minimum blending
const metaballs = ctx.pass(\`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Smooth minimum for organic blending
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float map(vec3 p) {
  float d = 100.0;
  
  // Multiple animated spheres
  for (int i = 0; i < 5; i++) {
    float t = u_time + float(i) * 0.7;
    vec3 pos = vec3(
      sin(t) * 2.0,
      cos(t * 0.8) * 1.5,
      sin(t * 1.2) * 2.0
    );
    
    float sphere = sdSphere(p - pos, 0.5);
    d = smin(d, sphere, 0.8);  // Smooth union
  }
  
  return d;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  
  // Raymarch...
  // Lighting with subsurface scattering...
  
  fragColor = vec4(color, 1.0);
}
\`)

function animate() {
  ctx.time = performance.now() / 1000
  metaballs.draw()
  requestAnimationFrame(animate)
}`

export default function MetaballsExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let ctx: GLContext | null = null
    let metaballsPass: Pass | null = null
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

        metaballsPass = ctx.pass(METABALLS_SHADER)

        const startTime = performance.now()
        const animate = () => {
          if (!ctx || !metaballsPass) return
          
          ctx.time = (performance.now() - startTime) / 1000
          
          const glCtx = ctx.gl
          glCtx.clearColor(0.0, 0.0, 0.0, 1.0)
          glCtx.clear(glCtx.COLOR_BUFFER_BIT)
          
          metaballsPass.draw()
          
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
      metaballsPass?.dispose()
    }
  }, [])

  return (
    <FullscreenExample
      title="Metaballs"
      description="Organic blob-like shapes that smoothly blend together using polynomial smooth minimum. Features subsurface scattering, iridescence, and animated orbiting motion."
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
            <h3 className="text-lg font-semibold text-white mb-2">Smooth Minimum Blending</h3>
            <p className="text-zinc-400 text-sm mb-2">
              Metaballs use a polynomial smooth minimum function to blend multiple spheres organically:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">smin(a, b, k)</strong> - Polynomial smooth union operator</li>
              <li>• <strong className="text-white">k parameter</strong> - Controls blend radius (higher = more blending)</li>
              <li>• <strong className="text-white">7 animated spheres</strong> - Each with unique orbital paths and pulsing</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Advanced Effects</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• <strong className="text-white">Subsurface Scattering</strong> - Simulates light passing through translucent material</li>
              <li>• <strong className="text-white">Iridescence</strong> - Rainbow color shifts based on viewing angle</li>
              <li>• <strong className="text-white">Color Blending</strong> - Each sphere contributes its color based on distance</li>
              <li>• <strong className="text-white">Inner Glow</strong> - Emissive effect when blobs merge</li>
              <li>• <strong className="text-white">Fresnel Rim Light</strong> - Edge highlighting effect</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Lighting Model</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li>• Diffuse lighting with soft shadows</li>
              <li>• Specular highlights (Blinn-Phong, 64 shininess)</li>
              <li>• Ambient occlusion in crevices</li>
              <li>• Moving point light orbiting the scene</li>
              <li>• ACES tone mapping for HDR-like appearance</li>
            </ul>
          </div>

          <div className="rounded-lg border border-emerald-900 bg-emerald-900/20 p-4">
            <h3 className="text-lg font-semibold text-emerald-400 mb-2">Performance</h3>
            <p className="text-zinc-400 text-sm">
              This example uses 100 raymarching steps and multiple lighting passes. The smooth minimum 
              operation is computed for 7 spheres per raymarch step, making it computationally intensive 
              but producing beautiful organic results.
            </p>
          </div>
        </div>
      }
    />
  )
}
