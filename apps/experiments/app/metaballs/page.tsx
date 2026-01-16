'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function MetaballsPage() {
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
          autoResize: true
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        const metaballs = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 100;
          const MAX_DIST: f32 = 50.0;
          const SURF_DIST: f32 = 0.001;
          const PI: f32 = 3.14159265359;
          const NUM_BALLS: i32 = 7;

          // Smooth minimum (polynomial)
          fn smin(a: f32, b: f32, k: f32) -> f32 {
            let h = max(k - abs(a - b), 0.0) / k;
            return min(a, b) - h * h * h * k * (1.0 / 6.0);
          }

          // Sphere SDF
          fn sdSphere(p: vec3f, r: f32) -> f32 {
            return length(p) - r;
          }

          // Get ball position at time
          fn getBallPos(index: i32, time: f32) -> vec3f {
            let t = time * 0.5;
            let i = f32(index);
            
            // Each ball has unique orbital motion
            let phase1 = i * 0.7 + t;
            let phase2 = i * 1.3 + t * 0.8;
            let phase3 = i * 0.5 + t * 1.2;
            
            let radius = 1.5 + sin(i * 2.0) * 0.5;
            
            return vec3f(
              sin(phase1) * cos(phase2 * 0.5) * radius,
              sin(phase2) * cos(phase3 * 0.7) * radius * 0.7,
              cos(phase1) * sin(phase3) * radius
            );
          }

          // Get ball radius at time
          fn getBallRadius(index: i32, time: f32) -> f32 {
            let i = f32(index);
            let baseRadius = 0.4 + sin(i * 1.5) * 0.15;
            let pulse = sin(time * 2.0 + i * 0.8) * 0.1;
            return baseRadius + pulse;
          }

          // Scene map - returns distance and color blend info
          struct SceneResult {
            dist: f32,
            blend: vec3f, // For color blending
          }

          fn map(p: vec3f) -> SceneResult {
            let time = globals.time;
            var result: SceneResult;
            result.dist = MAX_DIST;
            result.blend = vec3f(0.0);
            
            let blendK = 0.8; // Blend factor
            
            // Add all metaballs with smooth union
            for (var i = 0; i < NUM_BALLS; i++) {
              let ballPos = getBallPos(i, time);
              let ballRadius = getBallRadius(i, time);
              let d = sdSphere(p - ballPos, ballRadius);
              
              // Color influence (closer balls have more influence)
              let influence = 1.0 / (1.0 + d * d);
              let hue = f32(i) / f32(NUM_BALLS);
              
              // Convert hue to RGB for blending
              let ballCol = vec3f(
                sin(hue * 6.28 + 0.0) * 0.5 + 0.5,
                sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
                sin(hue * 6.28 + 4.19) * 0.5 + 0.5
              );
              
              result.blend += ballCol * influence;
              result.dist = smin(result.dist, d, blendK);
            }
            
            // Normalize blend colors
            result.blend = normalize(result.blend + vec3f(0.001));
            
            return result;
          }

          // Simple distance map
          fn mapDist(p: vec3f) -> f32 {
            return map(p).dist;
          }

          // Normal calculation
          fn calcNormal(p: vec3f) -> vec3f {
            let e = vec2f(0.001, 0.0);
            return normalize(vec3f(
              mapDist(p + e.xyy) - mapDist(p - e.xyy),
              mapDist(p + e.yxy) - mapDist(p - e.yxy),
              mapDist(p + e.yyx) - mapDist(p - e.yyx)
            ));
          }

          // Raymarching
          fn raymarch(ro: vec3f, rd: vec3f) -> f32 {
            var t: f32 = 0.0;
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let d = mapDist(p);
              
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
          fn subsurface(p: vec3f, n: vec3f, lightDir: vec3f) -> f32 {
            // Sample behind the surface
            let thickness = 0.5;
            var scatter: f32 = 0.0;
            
            for (var i = 1; i <= 3; i++) {
              let fi = f32(i);
              let samplePos = p - n * fi * 0.1;
              let d = mapDist(samplePos);
              scatter += smoothstep(0.0, 1.0, d) / fi;
            }
            
            // Directional component
            let backlight = max(dot(-n, lightDir), 0.0);
            
            return scatter * backlight * 0.3;
          }

          // Soft shadow
          fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32) -> f32 {
            var res: f32 = 1.0;
            var t = mint;
            
            for (var i = 0; i < 24; i++) {
              if (t >= maxt) { break; }
              let h = mapDist(ro + rd * t);
              if (h < 0.001) {
                return 0.0;
              }
              res = min(res, k * h / t);
              t += h;
            }
            
            return clamp(res, 0.0, 1.0);
          }

          // Ambient occlusion
          fn calcAO(pos: vec3f, nor: vec3f) -> f32 {
            var occ: f32 = 0.0;
            var sca: f32 = 1.0;
            
            for (var i = 0; i < 5; i++) {
              let h = 0.01 + 0.1 * f32(i);
              let d = mapDist(pos + h * nor);
              occ += (h - d) * sca;
              sca *= 0.8;
            }
            
            return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
          }

          // Iridescence based on view angle and normal
          fn iridescence(viewDir: vec3f, normal: vec3f, time: f32) -> vec3f {
            let NdotV = dot(normal, viewDir);
            let t = NdotV * 3.0 + time * 0.5;
            
            return vec3f(
              sin(t + 0.0) * 0.5 + 0.5,
              sin(t + 2.1) * 0.5 + 0.5,
              sin(t + 4.2) * 0.5 + 0.5
            );
          }

          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time;
            
            // Camera orbiting the metaballs
            let camDist = 5.0;
            let camAngle = time * 0.3;
            
            let ro = vec3f(
              cos(camAngle) * camDist,
              sin(time * 0.2) * 1.0 + 1.5,
              sin(camAngle) * camDist
            );
            
            // Look at center
            let lookAt = vec3f(0.0, 0.0, 0.0);
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Light setup - moving light
            let lightAngle = time * 0.5;
            let lightPos = vec3f(
              cos(lightAngle) * 4.0,
              3.0 + sin(time * 0.7),
              sin(lightAngle) * 4.0
            );
            
            // Raymarch
            let dist = raymarch(ro, rd);
            
            var col = vec3f(0.0);
            
            if (dist < MAX_DIST) {
              let p = ro + rd * dist;
              let n = calcNormal(p);
              let sceneData = map(p);
              
              // Get base color from blend
              let baseCol = sceneData.blend;
              
              // View and light directions
              let viewDir = normalize(ro - p);
              let lightDir = normalize(lightPos - p);
              
              // Fresnel
              let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
              
              // Iridescent color shift
              let iriCol = iridescence(viewDir, n, time);
              
              // Mix base color with iridescence based on fresnel
              var matCol = mix(baseCol, iriCol, fresnel * 0.6);
              
              // Diffuse lighting
              let diff = max(dot(n, lightDir), 0.0);
              
              // Specular (Blinn-Phong)
              let halfDir = normalize(lightDir + viewDir);
              let spec = pow(max(dot(n, halfDir), 0.0), 64.0);
              
              // Subsurface scattering
              let sss = subsurface(p, n, lightDir);
              
              // Ambient occlusion
              let ao = calcAO(p, n);
              
              // Soft shadows
              let shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);
              
              // Combine lighting
              let ambient = vec3f(0.1, 0.12, 0.15);
              let lightCol = vec3f(1.0, 0.95, 0.9);
              
              col = ambient * matCol * ao;
              col += matCol * lightCol * diff * shadow;
              col += matCol * sss; // Subsurface adds translucent glow
              col += lightCol * spec * shadow * 0.7;
              
              // Rim light with iridescence
              col += iriCol * fresnel * 0.4;
              
              // Inner glow effect
              let glowAmount = 1.0 - smoothstep(0.0, 0.3, dist);
              col += baseCol * glowAmount * 0.2;
              
              // Fog
              let fogAmount = 1.0 - exp(-dist * 0.05);
              let fogColor = vec3f(0.05, 0.07, 0.1);
              col = mix(col, fogColor, fogAmount);
              
            } else {
              // Background gradient
              let bgGrad = rd.y * 0.5 + 0.5;
              col = mix(vec3f(0.08, 0.1, 0.15), vec3f(0.02, 0.03, 0.06), bgGrad);
              
              // Subtle radial gradient for depth
              let radialDist = length(uv);
              col = mix(col, vec3f(0.15, 0.12, 0.2), (1.0 - radialDist) * 0.2);
            }
            
            // Tone mapping (ACES)
            col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
            
            // Gamma correction
            col = pow(col, vec3f(1.0 / 2.2));
            
            // Chromatic aberration at edges
            let aberrationStrength = length(uv) * 0.01;
            
            // Vignette
            let vignette = 1.0 - 0.3 * length(uv);
            col *= vignette;
            
            return vec4f(col, 1.0);
          }
        `);

        function frame() {
          if (disposed) return;
          metaballs.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Metaballs</h1>
      <p style={{ marginBottom: '1rem' }}>
        Organic blob shapes that smoothly blend together using smooth minimum. Features 
        subsurface scattering, iridescent coloring, and animated motion.
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
