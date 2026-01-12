'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function MandelbulbPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
          debug: true,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        const mandelbulb = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 128;
          const MAX_DIST: f32 = 20.0;
          const SURF_DIST: f32 = 0.0005;
          const PI: f32 = 3.14159265359;
          const POWER: f32 = 8.0;
          const MAX_ITERATIONS: i32 = 8;
          const BAILOUT: f32 = 2.0;

          // Mandelbulb distance estimator with orbit trap data
          struct MandelbulbResult {
            dist: f32,
            iterations: f32,
            orbitTrap: vec3f,
          }

          fn mandelbulb(pos: vec3f) -> MandelbulbResult {
            var z = pos;
            var dr: f32 = 1.0;
            var r: f32 = 0.0;
            var iterations: f32 = 0.0;
            var orbitTrap = vec3f(1e10);
            
            for (var i = 0; i < MAX_ITERATIONS; i++) {
              r = length(z);
              
              if (r > BAILOUT) {
                break;
              }
              
              iterations = f32(i);
              
              // Orbit trap - track minimum distance to coordinate planes
              orbitTrap = min(orbitTrap, abs(z));
              
              // Convert to spherical coordinates
              let theta = acos(z.z / r);
              let phi = atan2(z.y, z.x);
              
              // Scale the derivative
              dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
              
              // Mandelbulb formula: z^n + c
              let zr = pow(r, POWER);
              let newTheta = theta * POWER;
              let newPhi = phi * POWER;
              
              z = zr * vec3f(
                sin(newTheta) * cos(newPhi),
                sin(newTheta) * sin(newPhi),
                cos(newTheta)
              );
              z += pos;
            }
            
            var result: MandelbulbResult;
            result.dist = 0.5 * log(r) * r / dr;
            result.iterations = iterations;
            result.orbitTrap = orbitTrap;
            return result;
          }

          // Scene map
          fn map(p: vec3f) -> MandelbulbResult {
            return mandelbulb(p);
          }

          // Calculate normal using gradient
          fn calcNormal(p: vec3f) -> vec3f {
            let e = vec2f(0.0001, 0.0);
            return normalize(vec3f(
              mandelbulb(p + e.xyy).dist - mandelbulb(p - e.xyy).dist,
              mandelbulb(p + e.yxy).dist - mandelbulb(p - e.yxy).dist,
              mandelbulb(p + e.yyx).dist - mandelbulb(p - e.yyx).dist
            ));
          }

          // Raymarching with iteration tracking
          struct RayResult {
            dist: f32,
            steps: i32,
            iterations: f32,
            orbitTrap: vec3f,
          }

          fn raymarch(ro: vec3f, rd: vec3f) -> RayResult {
            var t: f32 = 0.0;
            var result: RayResult;
            result.dist = MAX_DIST;
            result.steps = 0;
            result.iterations = 0.0;
            result.orbitTrap = vec3f(1.0);
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let res = map(p);
              
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
          fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32) -> f32 {
            var res: f32 = 1.0;
            var t = mint;
            
            for (var i = 0; i < 32; i++) {
              if (t >= maxt) { break; }
              let h = mandelbulb(ro + rd * t).dist;
              if (h < 0.001) {
                return 0.0;
              }
              res = min(res, k * h / t);
              t += clamp(h, 0.02, 0.2);
            }
            
            return clamp(res, 0.0, 1.0);
          }

          // Ambient occlusion
          fn calcAO(pos: vec3f, nor: vec3f) -> f32 {
            var occ: f32 = 0.0;
            var sca: f32 = 1.0;
            
            for (var i = 0; i < 5; i++) {
              let h = 0.01 + 0.08 * f32(i);
              let d = mandelbulb(pos + h * nor).dist;
              occ += (h - d) * sca;
              sca *= 0.85;
            }
            
            return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
          }

          // Color palette function
          fn palette(t: f32) -> vec3f {
            let a = vec3f(0.5, 0.5, 0.5);
            let b = vec3f(0.5, 0.5, 0.5);
            let c = vec3f(1.0, 1.0, 1.0);
            let d = vec3f(0.0, 0.33, 0.67);
            return a + b * cos(6.28318 * (c * t + d));
          }

          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time * 0.2;
            
            // Camera orbit around the Mandelbulb
            let camDist = 2.8 + sin(time * 0.5) * 0.3;
            let camAngleY = time * 0.4;
            let camAngleX = sin(time * 0.3) * 0.3 + 0.3;
            
            let ro = vec3f(
              cos(camAngleY) * cos(camAngleX) * camDist,
              sin(camAngleX) * camDist,
              sin(camAngleY) * cos(camAngleX) * camDist
            );
            
            // Look at center
            let lookAt = vec3f(0.0, 0.0, 0.0);
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction with slight fish-eye for drama
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Light setup
            let lightDir = normalize(vec3f(1.0, 0.8, -0.5));
            let lightCol = vec3f(1.0, 0.95, 0.9);
            
            // Raymarch
            let hit = raymarch(ro, rd);
            
            var col = vec3f(0.0);
            
            if (hit.dist < MAX_DIST) {
              let p = ro + rd * hit.dist;
              let n = calcNormal(p);
              
              // Base color from orbit trap
              let trapCol = palette(length(hit.orbitTrap) * 2.0 + time * 0.5);
              
              // Iteration-based coloring
              let iterCol = palette(hit.iterations / f32(MAX_ITERATIONS) + 0.3);
              
              // Mix colors
              var matCol = mix(trapCol, iterCol, 0.5);
              
              // Ambient occlusion
              let ao = calcAO(p, n);
              
              // Diffuse lighting
              let diff = max(dot(n, lightDir), 0.0);
              
              // Soft shadow
              let shadow = softShadow(p + n * 0.002, lightDir, 0.01, 5.0, 8.0);
              
              // Specular
              let viewDir = normalize(ro - p);
              let halfDir = normalize(lightDir + viewDir);
              let spec = pow(max(dot(n, halfDir), 0.0), 64.0);
              
              // Fresnel rim
              let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
              
              // Ambient
              let ambient = vec3f(0.05, 0.08, 0.12);
              
              // Combine
              col = ambient * matCol * ao;
              col += matCol * lightCol * diff * shadow;
              col += lightCol * spec * shadow * 0.5;
              col += vec3f(0.4, 0.6, 1.0) * fresnel * 0.3;
              
              // Glow based on step count (edges glow more)
              let glowAmount = f32(hit.steps) / f32(MAX_STEPS);
              let glowCol = palette(glowAmount + time * 0.2);
              col += glowCol * glowAmount * 0.15;
              
              // Fog
              let fogAmount = 1.0 - exp(-hit.dist * 0.15);
              let fogColor = vec3f(0.01, 0.02, 0.04);
              col = mix(col, fogColor, fogAmount);
            } else {
              // Background with glow based on closest approach
              let bgGrad = rd.y * 0.5 + 0.5;
              col = mix(vec3f(0.01, 0.02, 0.04), vec3f(0.02, 0.04, 0.08), bgGrad);
              
              // Glow based on how many steps we took (indicates near-miss)
              let glowIntensity = f32(hit.steps) / f32(MAX_STEPS);
              let glowCol = palette(glowIntensity + time * 0.2);
              col += glowCol * glowIntensity * glowIntensity * 0.5;
            }
            
            // Tone mapping (ACES approximation)
            col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
            
            // Gamma correction
            col = pow(col, vec3f(1.0 / 2.2));
            
            // Vignette
            let vignette = 1.0 - 0.4 * length(uv);
            col *= vignette;
            
            return vec4f(col, 1.0);
          }
        `);

        function frame() {
          if (disposed) return;
          mandelbulb.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Mandelbulb Fractal</h1>
      <p style={{ marginBottom: '1rem' }}>
        A 3D fractal raymarched in real-time. The Mandelbulb is the 3D equivalent of the Mandelbrot set, 
        featuring orbit trapping for coloring and glow effects based on iteration count.
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
