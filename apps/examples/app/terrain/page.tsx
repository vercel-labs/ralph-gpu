'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function TerrainPage() {
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

        const terrain = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 200;
          const MAX_DIST: f32 = 300.0;
          const SURF_DIST: f32 = 0.01;
          const PI: f32 = 3.14159265359;
          const WATER_LEVEL: f32 = 0.2;

          // Hash function for noise
          fn hash(p: vec2f) -> f32 {
            var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
            p3 += dot(p3, p3.yzx + 3.333);
            return fract((p3.x + p3.y) * p3.z);
          }

          // Value noise
          fn noise(p: vec2f) -> f32 {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * (3.0 - 2.0 * f);
            
            return mix(
              mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
              mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
              u.y
            );
          }

          // Fractal Brownian Motion
          fn fbm(p: vec2f) -> f32 {
            var value: f32 = 0.0;
            var amplitude: f32 = 0.5;
            var frequency: f32 = 1.0;
            var pos = p;
            
            for (var i = 0; i < 6; i++) {
              value += amplitude * noise(pos * frequency);
              amplitude *= 0.5;
              frequency *= 2.0;
              // Rotate for each octave to reduce artifacts
              pos = vec2f(pos.x * 0.8 - pos.y * 0.6, pos.x * 0.6 + pos.y * 0.8);
            }
            
            return value;
          }

          // Terrain height function
          fn terrainHeight(p: vec2f) -> f32 {
            let scale = 0.03;
            var h = fbm(p * scale);
            
            // Add ridges
            h += pow(abs(noise(p * scale * 2.0) - 0.5) * 2.0, 2.0) * 0.3;
            
            // Scale and offset
            h = h * 8.0 - 1.0;
            
            return h;
          }

          // Terrain SDF
          fn mapTerrain(p: vec3f) -> f32 {
            return p.y - terrainHeight(p.xz);
          }

          // Water plane SDF
          fn mapWater(p: vec3f, time: f32) -> f32 {
            // Add small waves
            let waveTime = time * 0.5;
            let waves = sin(p.x * 0.5 + waveTime) * cos(p.z * 0.3 + waveTime * 0.7) * 0.05;
            return p.y - WATER_LEVEL - waves;
          }

          // Combined scene
          struct SceneResult {
            dist: f32,
            material: i32, // 0 = terrain, 1 = water
          }

          fn map(p: vec3f, time: f32) -> SceneResult {
            let terrain = mapTerrain(p);
            let water = mapWater(p, time);
            
            var result: SceneResult;
            if (terrain < water) {
              result.dist = terrain;
              result.material = 0;
            } else {
              result.dist = water;
              result.material = 1;
            }
            return result;
          }

          // Terrain normal
          fn terrainNormal(p: vec3f) -> vec3f {
            let e = vec2f(0.01, 0.0);
            return normalize(vec3f(
              terrainHeight(p.xz - e.xy) - terrainHeight(p.xz + e.xy),
              2.0 * e.x,
              terrainHeight(p.xz - e.yx) - terrainHeight(p.xz + e.yx)
            ));
          }

          // Water normal with waves
          fn waterNormal(p: vec3f, time: f32) -> vec3f {
            let e = 0.01;
            let waveTime = time * 0.5;
            
            let h0 = sin(p.x * 0.5 + waveTime) * cos(p.z * 0.3 + waveTime * 0.7) * 0.05;
            let hx = sin((p.x + e) * 0.5 + waveTime) * cos(p.z * 0.3 + waveTime * 0.7) * 0.05;
            let hz = sin(p.x * 0.5 + waveTime) * cos((p.z + e) * 0.3 + waveTime * 0.7) * 0.05;
            
            return normalize(vec3f(h0 - hx, e, h0 - hz));
          }

          // Raymarching - optimized for terrain
          fn raymarch(ro: vec3f, rd: vec3f, time: f32) -> SceneResult {
            var t: f32 = 0.1;
            var result: SceneResult;
            result.dist = MAX_DIST;
            result.material = -1;
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let res = map(p, time);
              
              if (res.dist < SURF_DIST * t) {
                result.dist = t;
                result.material = res.material;
                break;
              }
              
              if (t > MAX_DIST) {
                break;
              }
              
              // Adaptive step size
              t += res.dist * 0.8;
            }
            
            return result;
          }

          // Sun disk
          fn sun(rd: vec3f, sunDir: vec3f) -> vec3f {
            let sunDot = max(dot(rd, sunDir), 0.0);
            var sunCol = pow(sunDot, 256.0) * vec3f(1.0, 0.9, 0.7) * 10.0;
            sunCol += pow(sunDot, 8.0) * vec3f(1.0, 0.6, 0.3) * 0.5;
            return sunCol;
          }

          // Sky gradient
          fn sky(rd: vec3f, sunDir: vec3f) -> vec3f {
            // Base sky gradient
            var skyCol = mix(
              vec3f(0.6, 0.7, 0.9),  // Horizon
              vec3f(0.2, 0.4, 0.8),   // Zenith
              pow(max(rd.y, 0.0), 0.5)
            );
            
            // Atmospheric scattering near horizon
            let horizonGlow = pow(1.0 - abs(rd.y), 8.0);
            skyCol = mix(skyCol, vec3f(0.9, 0.7, 0.5), horizonGlow * 0.5);
            
            // Add sun
            skyCol += sun(rd, sunDir);
            
            return skyCol;
          }

          // Fog
          fn applyFog(col: vec3f, dist: f32, rd: vec3f, sunDir: vec3f) -> vec3f {
            let fogAmount = 1.0 - exp(-dist * 0.008);
            var fogCol = sky(rd, sunDir) * 0.8;
            
            // Volumetric-like effect - brighter fog towards sun
            let sunAmount = max(dot(rd, sunDir), 0.0);
            fogCol += vec3f(1.0, 0.8, 0.5) * pow(sunAmount, 4.0) * 0.3;
            
            return mix(col, fogCol, fogAmount);
          }

          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time;
            
            // Camera flying forward over terrain
            let flySpeed = time * 8.0;
            let camHeight = 5.0 + sin(time * 0.3) * 2.0;
            
            let ro = vec3f(flySpeed, camHeight + terrainHeight(vec2f(flySpeed, 0.0)) + 3.0, 0.0);
            
            // Look forward and slightly down
            let lookAt = vec3f(flySpeed + 20.0, camHeight - 2.0, sin(time * 0.2) * 10.0);
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Sun direction
            let sunAngle = time * 0.05;
            let sunDir = normalize(vec3f(cos(sunAngle), 0.3 + sin(time * 0.1) * 0.1, sin(sunAngle)));
            
            // Raymarch
            let hit = raymarch(ro, rd, time);
            
            var col = vec3f(0.0);
            
            if (hit.dist < MAX_DIST) {
              let p = ro + rd * hit.dist;
              
              if (hit.material == 0) {
                // Terrain
                let n = terrainNormal(p);
                
                // Terrain coloring based on height and slope
                let height = p.y;
                let slope = 1.0 - n.y;
                
                // Snow on high peaks
                var terrainCol = vec3f(0.15, 0.12, 0.08); // Base dirt
                
                if (height > 3.0) {
                  let snowAmount = smoothstep(3.0, 5.0, height) * (1.0 - slope * 2.0);
                  terrainCol = mix(terrainCol, vec3f(0.95, 0.95, 1.0), clamp(snowAmount, 0.0, 1.0));
                }
                
                // Grass on moderate heights
                if (height > WATER_LEVEL && height < 4.0) {
                  let grassAmount = smoothstep(WATER_LEVEL, 1.0, height) * (1.0 - smoothstep(2.0, 4.0, height));
                  let grassMod = 1.0 - slope * 1.5;
                  terrainCol = mix(terrainCol, vec3f(0.2, 0.4, 0.15), clamp(grassAmount * grassMod, 0.0, 1.0));
                }
                
                // Rock on steep slopes
                if (slope > 0.5) {
                  let rockAmount = smoothstep(0.5, 0.8, slope);
                  terrainCol = mix(terrainCol, vec3f(0.35, 0.32, 0.3), rockAmount);
                }
                
                // Lighting
                let diff = max(dot(n, sunDir), 0.0);
                let ambient = vec3f(0.15, 0.2, 0.3);
                
                // Simple shadow (just check if sun is blocked)
                var shadow = 1.0;
                let shadowRay = raymarch(p + n * 0.1, sunDir, time);
                if (shadowRay.dist < MAX_DIST) {
                  shadow = 0.3;
                }
                
                col = ambient * terrainCol + terrainCol * diff * shadow * vec3f(1.0, 0.95, 0.9);
                
              } else {
                // Water
                let n = waterNormal(p, time);
                let viewDir = normalize(ro - p);
                
                // Reflection
                let reflDir = reflect(-viewDir, n);
                let reflCol = sky(reflDir, sunDir);
                
                // Fresnel
                let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 4.0);
                
                // Water color
                let waterColor = vec3f(0.1, 0.3, 0.5);
                
                // Check depth (how far to terrain below)
                let underwaterHit = raymarch(p - vec3f(0.0, 0.1, 0.0), vec3f(0.0, -1.0, 0.0), time);
                let depth = min(underwaterHit.dist, 5.0);
                let depthFade = exp(-depth * 0.3);
                
                // Mix reflection and water color based on fresnel and depth
                col = mix(waterColor * depthFade, reflCol, fresnel * 0.8);
                
                // Specular sun reflection
                let specular = pow(max(dot(reflDir, sunDir), 0.0), 256.0);
                col += vec3f(1.0, 0.9, 0.8) * specular * 2.0;
              }
              
              // Apply fog
              col = applyFog(col, hit.dist, rd, sunDir);
              
            } else {
              // Sky
              col = sky(rd, sunDir);
            }
            
            // Tone mapping
            col = col / (col + vec3f(1.0));
            
            // Gamma correction
            col = pow(col, vec3f(1.0 / 2.2));
            
            // Slight vignette
            let vignette = 1.0 - 0.2 * length(uv);
            col *= vignette;
            
            return vec4f(col, 1.0);
          }
        `);

        function frame() {
          if (disposed) return;
          terrain.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Infinite Terrain</h1>
      <p style={{ marginBottom: '1rem' }}>
        Procedural infinite terrain using raymarching with FBM noise for height, 
        atmospheric fog, water with reflections, and a dynamic sky with sun.
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
