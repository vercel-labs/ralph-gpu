'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function RaymarchingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        // Check WebGPU support
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        // Initialize context
        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        // Check if we were disposed during async init
        if (disposed) {
          ctx.dispose();
          return;
        }

        // Create raymarching pass
        const raymarch = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 100;
          const MAX_DIST: f32 = 100.0;
          const SURF_DIST: f32 = 0.001;
          const PI: f32 = 3.14159265359;

          // ========================================
          // SDF Primitives
          // ========================================
          
          fn sdSphere(p: vec3f, r: f32) -> f32 {
            return length(p) - r;
          }

          fn sdBox(p: vec3f, b: vec3f) -> f32 {
            let q = abs(p) - b;
            return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
          }

          fn sdTorus(p: vec3f, t: vec2f) -> f32 {
            let q = vec2f(length(p.xz) - t.x, p.y);
            return length(q) - t.y;
          }

          fn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
            let pa = p - a;
            let ba = b - a;
            let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h) - r;
          }

          fn sdOctahedron(p: vec3f, s: f32) -> f32 {
            let q = abs(p);
            return (q.x + q.y + q.z - s) * 0.57735027;
          }

          // ========================================
          // SDF Operations
          // ========================================
          
          fn opUnion(d1: f32, d2: f32) -> f32 {
            return min(d1, d2);
          }

          fn opSubtraction(d1: f32, d2: f32) -> f32 {
            return max(-d1, d2);
          }

          fn opIntersection(d1: f32, d2: f32) -> f32 {
            return max(d1, d2);
          }

          fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
            let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) - k * h * (1.0 - h);
          }

          fn opSmoothSubtraction(d1: f32, d2: f32, k: f32) -> f32 {
            let h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
            return mix(d2, -d1, h) + k * h * (1.0 - h);
          }

          fn opSmoothIntersection(d1: f32, d2: f32, k: f32) -> f32 {
            let h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) + k * h * (1.0 - h);
          }

          // ========================================
          // Rotation helpers
          // ========================================
          
          fn rot2D(angle: f32) -> mat2x2f {
            let c = cos(angle);
            let s = sin(angle);
            return mat2x2f(c, -s, s, c);
          }

          fn rotateX(p: vec3f, angle: f32) -> vec3f {
            let c = cos(angle);
            let s = sin(angle);
            return vec3f(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
          }

          fn rotateY(p: vec3f, angle: f32) -> vec3f {
            let c = cos(angle);
            let s = sin(angle);
            return vec3f(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
          }

          fn rotateZ(p: vec3f, angle: f32) -> vec3f {
            let c = cos(angle);
            let s = sin(angle);
            return vec3f(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
          }

          // ========================================
          // Scene Definition
          // ========================================

          struct SceneResult {
            dist: f32,
            materialId: f32,
          }

          fn map(p: vec3f) -> SceneResult {
            let time = globals.time;
            var result: SceneResult;
            
            // Animated central sphere that pulses
            let spherePos = vec3f(0.0, sin(time * 2.0) * 0.3, 0.0);
            let sphereRadius = 0.8 + sin(time * 3.0) * 0.1;
            let sphere = sdSphere(p - spherePos, sphereRadius);
            
            // Rotating torus around the sphere
            var torusP = p;
            torusP = rotateY(torusP, time * 0.7);
            torusP = rotateX(torusP, time * 0.5);
            let torus = sdTorus(torusP, vec2f(1.5, 0.15));
            
            // Another torus at different angle
            var torus2P = p;
            torus2P = rotateZ(torus2P, time * 0.6);
            torus2P = rotateX(torus2P, PI * 0.5 + time * 0.4);
            let torus2 = sdTorus(torus2P, vec2f(1.5, 0.15));
            
            // Orbiting smaller spheres
            let orbitRadius = 2.2;
            let orbit1 = vec3f(
              cos(time * 1.5) * orbitRadius,
              sin(time * 2.0) * 0.5,
              sin(time * 1.5) * orbitRadius
            );
            let orbit2 = vec3f(
              cos(time * 1.2 + PI * 0.66) * orbitRadius,
              sin(time * 1.8 + PI) * 0.5,
              sin(time * 1.2 + PI * 0.66) * orbitRadius
            );
            let orbit3 = vec3f(
              cos(time * 1.0 + PI * 1.33) * orbitRadius,
              sin(time * 1.5 + PI * 0.5) * 0.5,
              sin(time * 1.0 + PI * 1.33) * orbitRadius
            );
            
            let orbitSphere1 = sdSphere(p - orbit1, 0.3);
            let orbitSphere2 = sdSphere(p - orbit2, 0.3);
            let orbitSphere3 = sdSphere(p - orbit3, 0.3);
            
            // Rotating box
            var boxP = p - vec3f(0.0, -1.5, 0.0);
            boxP = rotateY(boxP, time * 0.8);
            boxP = rotateX(boxP, time * 0.3);
            let box = sdBox(boxP, vec3f(0.4, 0.4, 0.4));
            
            // Octahedron floating above
            var octP = p - vec3f(0.0, 1.8 + sin(time * 2.5) * 0.2, 0.0);
            octP = rotateY(octP, time);
            let oct = sdOctahedron(octP, 0.5);
            
            // Ground plane (very far below to not interfere)
            let ground = p.y + 3.5;
            
            // Combine everything with smooth union for organic look
            var d = sphere;
            var matId = 1.0;
            
            // Smooth blend tori with sphere
            d = opSmoothUnion(d, torus, 0.3);
            d = opSmoothUnion(d, torus2, 0.3);
            
            // Add orbiting spheres (different material)
            let orbitDist = min(min(orbitSphere1, orbitSphere2), orbitSphere3);
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
          fn mapDist(p: vec3f) -> f32 {
            return map(p).dist;
          }

          // ========================================
          // Normal Calculation
          // ========================================
          
          fn calcNormal(p: vec3f) -> vec3f {
            let e = vec2f(0.001, 0.0);
            return normalize(vec3f(
              mapDist(p + e.xyy) - mapDist(p - e.xyy),
              mapDist(p + e.yxy) - mapDist(p - e.yxy),
              mapDist(p + e.yyx) - mapDist(p - e.yyx)
            ));
          }

          // ========================================
          // Raymarching
          // ========================================
          
          fn raymarch(ro: vec3f, rd: vec3f) -> SceneResult {
            var t = 0.0;
            var result: SceneResult;
            result.dist = MAX_DIST;
            result.materialId = -1.0;
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let res = map(p);
              
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
          
          fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32) -> f32 {
            var res = 1.0;
            var t = mint;
            
            for (var i = 0; i < 32; i++) {
              if (t >= maxt) { break; }
              let h = mapDist(ro + rd * t);
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
          
          fn calcAO(pos: vec3f, nor: vec3f) -> f32 {
            var occ = 0.0;
            var sca = 1.0;
            
            for (var i = 0; i < 5; i++) {
              let h = 0.01 + 0.12 * f32(i) / 4.0;
              let d = mapDist(pos + h * nor);
              occ += (h - d) * sca;
              sca *= 0.95;
            }
            
            return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
          }

          // ========================================
          // Material Colors
          // ========================================
          
          fn getMaterial(matId: f32, p: vec3f) -> vec3f {
            let time = globals.time;
            
            if (matId < 0.5) {
              // Ground - checkerboard
              let checker = step(0.0, sin(p.x * 2.0) * sin(p.z * 2.0));
              return mix(vec3f(0.1, 0.1, 0.12), vec3f(0.15, 0.15, 0.18), checker);
            } else if (matId < 1.5) {
              // Main sphere + tori - gradient based on position
              let h = sin(p.y * 2.0 + time) * 0.5 + 0.5;
              return mix(vec3f(0.8, 0.2, 0.4), vec3f(0.2, 0.4, 0.9), h);
            } else if (matId < 2.5) {
              // Orbiting spheres - emissive-like warm colors
              return vec3f(1.0, 0.6, 0.2);
            } else if (matId < 3.5) {
              // Box - cool cyan
              return vec3f(0.2, 0.8, 0.8);
            } else {
              // Octahedron - golden
              return vec3f(0.95, 0.8, 0.3);
            }
          }

          // ========================================
          // Main Fragment Shader
          // ========================================
          
          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            // Normalized coordinates (-1 to 1, aspect corrected)
            let uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            
            let time = globals.time;
            
            // Camera setup - orbit around scene
            let camDist = 6.0;
            let camAngle = time * 0.3;
            let camHeight = 2.0 + sin(time * 0.5) * 0.5;
            
            let ro = vec3f(
              cos(camAngle) * camDist,
              camHeight,
              sin(camAngle) * camDist
            );
            
            // Look at center
            let lookAt = vec3f(0.0, 0.0, 0.0);
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Light positions
            let lightPos1 = vec3f(5.0, 8.0, -5.0);
            let lightPos2 = vec3f(-4.0, 3.0, 4.0);
            let lightCol1 = vec3f(1.0, 0.95, 0.9);
            let lightCol2 = vec3f(0.4, 0.5, 0.8);
            
            // Raymarch
            let hit = raymarch(ro, rd);
            
            var col = vec3f(0.0);
            
            if (hit.dist < MAX_DIST) {
              // Hit point
              let p = ro + rd * hit.dist;
              let n = calcNormal(p);
              
              // Material
              let matCol = getMaterial(hit.materialId, p);
              
              // Ambient occlusion
              let ao = calcAO(p, n);
              
              // Lighting
              let l1Dir = normalize(lightPos1 - p);
              let l2Dir = normalize(lightPos2 - p);
              
              // Diffuse
              let diff1 = max(dot(n, l1Dir), 0.0);
              let diff2 = max(dot(n, l2Dir), 0.0);
              
              // Specular (Blinn-Phong)
              let viewDir = normalize(ro - p);
              let h1 = normalize(l1Dir + viewDir);
              let h2 = normalize(l2Dir + viewDir);
              let spec1 = pow(max(dot(n, h1), 0.0), 32.0);
              let spec2 = pow(max(dot(n, h2), 0.0), 32.0);
              
              // Soft shadows
              let shadow1 = softShadow(p + n * 0.01, l1Dir, 0.02, 10.0, 16.0);
              let shadow2 = softShadow(p + n * 0.01, l2Dir, 0.02, 10.0, 16.0);
              
              // Ambient
              let ambient = vec3f(0.03, 0.04, 0.06);
              
              // Combine lighting
              col = ambient * matCol;
              col += matCol * lightCol1 * diff1 * shadow1;
              col += matCol * lightCol2 * diff2 * shadow2;
              col += lightCol1 * spec1 * shadow1 * 0.3;
              col += lightCol2 * spec2 * shadow2 * 0.2;
              
              // Apply AO
              col *= ao;
              
              // Fresnel rim light
              let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
              col += fresnel * vec3f(0.3, 0.4, 0.6) * 0.5;
              
              // Fog
              let fogAmount = 1.0 - exp(-hit.dist * 0.04);
              let fogColor = vec3f(0.02, 0.03, 0.05);
              col = mix(col, fogColor, fogAmount);
            } else {
              // Background - subtle gradient
              let bgGrad = rd.y * 0.5 + 0.5;
              col = mix(vec3f(0.02, 0.02, 0.04), vec3f(0.05, 0.08, 0.15), bgGrad);
              
              // Add some subtle "stars"
              let stars = fract(sin(dot(floor(rd * 500.0), vec3f(12.9898, 78.233, 45.543))) * 43758.5453);
              if (stars > 0.998) {
                col += vec3f(0.5) * (stars - 0.998) * 500.0;
              }
            }
            
            // Tone mapping
            col = col / (col + vec3f(1.0));
            
            // Gamma correction
            col = pow(col, vec3f(1.0 / 2.2));
            
            // Vignette
            let vignette = 1.0 - 0.3 * length(uv);
            col *= vignette;
            
            return vec4f(col, 1.0);
          }
        `);

        function frame() {
          if (disposed) return;
          raymarch.draw();
          animationId = requestAnimationFrame(frame);
        }
        
        frame();
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (ctx) {
        ctx.dispose();
      }
    };
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>3D Raymarching</h1>
      <p style={{ marginBottom: '1rem' }}>
        Real-time raymarched scene with SDF primitives, smooth blending, soft shadows, and ambient occlusion.
      </p>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 150px)',
          border: '1px solid #333',
          display: 'block',
          background: '#000'
        }}
        width={1280}
        height={720}
      />
    </div>
  );
}
