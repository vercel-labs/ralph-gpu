'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function AlienPlanetPage() {
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
          dpr: 1,
          autoResize: true
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        const alienPlanet = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 128;
          const MAX_DIST: f32 = 200.0;
          const SURF_DIST: f32 = 0.001;
          const PI: f32 = 3.14159265359;
          
          // Planet parameters
          const PLANET_RADIUS: f32 = 8.0;
          const PLANET_POS: vec3f = vec3f(0.0, 0.0, 30.0);
          const ATMOSPHERE_RADIUS: f32 = 9.5;
          const RING_INNER: f32 = 11.0;
          const RING_OUTER: f32 = 16.0;
          const MOON_RADIUS: f32 = 1.2;

          // ========================================
          // Hash functions for procedural generation
          // ========================================
          
          fn hash21(p: vec2f) -> f32 {
            var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }

          fn hash31(p: vec3f) -> f32 {
            var p3 = fract(p * 0.1031);
            p3 += dot(p3, p3.zyx + 31.32);
            return fract((p3.x + p3.y) * p3.z);
          }

          fn hash33(p: vec3f) -> vec3f {
            var p3 = fract(p * vec3f(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yxz + 33.33);
            return fract((p3.xxy + p3.yxx) * p3.zyx);
          }

          // ========================================
          // Noise functions
          // ========================================
          
          fn noise3D(p: vec3f) -> f32 {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * (3.0 - 2.0 * f);
            
            return mix(
              mix(
                mix(hash31(i), hash31(i + vec3f(1.0, 0.0, 0.0)), u.x),
                mix(hash31(i + vec3f(0.0, 1.0, 0.0)), hash31(i + vec3f(1.0, 1.0, 0.0)), u.x),
                u.y
              ),
              mix(
                mix(hash31(i + vec3f(0.0, 0.0, 1.0)), hash31(i + vec3f(1.0, 0.0, 1.0)), u.x),
                mix(hash31(i + vec3f(0.0, 1.0, 1.0)), hash31(i + vec3f(1.0, 1.0, 1.0)), u.x),
                u.y
              ),
              u.z
            );
          }

          fn fbm(p: vec3f) -> f32 {
            var value: f32 = 0.0;
            var amplitude: f32 = 0.5;
            var frequency: f32 = 1.0;
            var pos = p;
            
            for (var i = 0; i < 5; i++) {
              value += amplitude * noise3D(pos * frequency);
              amplitude *= 0.5;
              frequency *= 2.0;
            }
            
            return value;
          }

          // ========================================
          // SDF Primitives
          // ========================================
          
          fn sdSphere(p: vec3f, r: f32) -> f32 {
            return length(p) - r;
          }

          fn sdTorus(p: vec3f, t: vec2f) -> f32 {
            let q = vec2f(length(p.xz) - t.x, p.y);
            return length(q) - t.y;
          }

          // Planet with surface detail
          fn sdPlanet(p: vec3f) -> f32 {
            let localP = p - PLANET_POS;
            let baseSphere = sdSphere(localP, PLANET_RADIUS);
            
            // Add surface detail using noise
            let noiseScale = 0.3;
            let surfaceNoise = fbm(normalize(localP) * 8.0) * noiseScale;
            
            // Add craters
            let craterNoise = pow(fbm(normalize(localP) * 4.0 + 10.0), 2.0) * 0.2;
            
            return baseSphere - surfaceNoise + craterNoise;
          }

          // Rings (flat torus)
          fn sdRings(p: vec3f) -> f32 {
            let localP = p - PLANET_POS;
            
            // Tilt the rings
            let tiltAngle = 0.3;
            let c = cos(tiltAngle);
            let s = sin(tiltAngle);
            let tiltedP = vec3f(localP.x, localP.y * c - localP.z * s, localP.y * s + localP.z * c);
            
            let distFromCenter = length(tiltedP.xz);
            let ringDist = abs(tiltedP.y) - 0.05;
            
            // Check if within ring bounds
            if (distFromCenter < RING_INNER || distFromCenter > RING_OUTER) {
              return MAX_DIST;
            }
            
            return ringDist;
          }

          // Moon
          fn getMoonPos(time: f32) -> vec3f {
            let orbitRadius = 14.0;
            let orbitSpeed = 0.15;
            let orbitTilt = 0.4;
            
            return PLANET_POS + vec3f(
              cos(time * orbitSpeed) * orbitRadius,
              sin(time * orbitSpeed * 0.7) * orbitRadius * 0.3,
              sin(time * orbitSpeed) * orbitRadius * cos(orbitTilt)
            );
          }

          fn sdMoon(p: vec3f, time: f32) -> f32 {
            let moonPos = getMoonPos(time);
            let localP = p - moonPos;
            let baseSphere = sdSphere(localP, MOON_RADIUS);
            
            // Add some crater detail
            let craters = fbm(normalize(localP) * 6.0) * 0.08;
            
            return baseSphere - craters;
          }

          // ========================================
          // Scene
          // ========================================
          
          struct SceneResult {
            dist: f32,
            materialId: i32,
          }

          fn map(p: vec3f, time: f32) -> SceneResult {
            var result: SceneResult;
            result.dist = MAX_DIST;
            result.materialId = 0;
            
            // Planet
            let planetDist = sdPlanet(p);
            if (planetDist < result.dist) {
              result.dist = planetDist;
              result.materialId = 1;
            }
            
            // Rings
            let ringsDist = sdRings(p);
            if (ringsDist < result.dist) {
              result.dist = ringsDist;
              result.materialId = 2;
            }
            
            // Moon
            let moonDist = sdMoon(p, time);
            if (moonDist < result.dist) {
              result.dist = moonDist;
              result.materialId = 3;
            }
            
            return result;
          }

          // Calculate normals
          fn calcNormal(p: vec3f, time: f32) -> vec3f {
            let e = vec2f(0.001, 0.0);
            return normalize(vec3f(
              map(p + e.xyy, time).dist - map(p - e.xyy, time).dist,
              map(p + e.yxy, time).dist - map(p - e.yxy, time).dist,
              map(p + e.yyx, time).dist - map(p - e.yyx, time).dist
            ));
          }

          // ========================================
          // Raymarching
          // ========================================
          
          fn raymarch(ro: vec3f, rd: vec3f, time: f32) -> SceneResult {
            var t: f32 = 0.0;
            var result: SceneResult;
            result.dist = MAX_DIST;
            result.materialId = 0;
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let res = map(p, time);
              
              if (res.dist < SURF_DIST) {
                result.dist = t;
                result.materialId = res.materialId;
                break;
              }
              
              if (t > MAX_DIST) {
                break;
              }
              
              t += res.dist * 0.8;
            }
            
            return result;
          }

          // ========================================
          // Starfield
          // ========================================
          
          fn stars(rd: vec3f, time: f32) -> vec3f {
            var col = vec3f(0.0);
            
            // Layer 1: Dense small stars
            let gridSize1 = 100.0;
            let starGrid1 = floor(rd * gridSize1);
            let starHash1 = hash31(starGrid1);
            
            if (starHash1 > 0.97) {
              let starCenter = (starGrid1 + 0.5) / gridSize1;
              let dist = length(rd - normalize(starCenter)) * gridSize1;
              let brightness = smoothstep(1.5, 0.0, dist);
              let twinkle = sin(time * 3.0 + starHash1 * 100.0) * 0.3 + 0.7;
              col += vec3f(brightness * twinkle * 0.5);
            }
            
            // Layer 2: Bright stars
            let gridSize2 = 50.0;
            let starGrid2 = floor(rd * gridSize2);
            let starHash2 = hash31(starGrid2 + 100.0);
            
            if (starHash2 > 0.99) {
              let starCenter = (starGrid2 + 0.5) / gridSize2;
              let dist = length(rd - normalize(starCenter)) * gridSize2;
              let brightness = smoothstep(2.0, 0.0, dist);
              let twinkle = sin(time * 2.0 + starHash2 * 50.0) * 0.2 + 0.8;
              
              // Color variation
              let colorVar = hash33(starGrid2);
              let starColor = mix(vec3f(1.0, 0.9, 0.8), vec3f(0.8, 0.9, 1.0), colorVar.x);
              col += starColor * brightness * twinkle;
            }
            
            // Layer 3: Rare bright stars with color
            let gridSize3 = 30.0;
            let starGrid3 = floor(rd * gridSize3);
            let starHash3 = hash31(starGrid3 + 200.0);
            
            if (starHash3 > 0.995) {
              let starCenter = (starGrid3 + 0.5) / gridSize3;
              let dist = length(rd - normalize(starCenter)) * gridSize3;
              let brightness = smoothstep(3.0, 0.0, dist);
              
              let colorVar = hash33(starGrid3 + 300.0);
              var starColor = vec3f(1.0);
              if (colorVar.x > 0.7) {
                starColor = vec3f(1.0, 0.6, 0.3); // Orange
              } else if (colorVar.x > 0.4) {
                starColor = vec3f(0.6, 0.8, 1.0); // Blue
              }
              col += starColor * brightness * 1.5;
            }
            
            return col;
          }

          // ========================================
          // Atmospheric scattering
          // ========================================
          
          fn atmosphere(ro: vec3f, rd: vec3f, planetPos: vec3f, planetR: f32, atmosR: f32) -> vec3f {
            // Ray-sphere intersection for atmosphere
            let oc = ro - planetPos;
            let b = dot(oc, rd);
            let c = dot(oc, oc) - atmosR * atmosR;
            let h = b * b - c;
            
            if (h < 0.0) {
              return vec3f(0.0);
            }
            
            let t1 = -b - sqrt(h);
            let t2 = -b + sqrt(h);
            
            if (t2 < 0.0) {
              return vec3f(0.0);
            }
            
            let tEnter = max(t1, 0.0);
            let tExit = t2;
            
            // Check if we hit the planet
            let oc2 = ro - planetPos;
            let b2 = dot(oc2, rd);
            let c2 = dot(oc2, oc2) - planetR * planetR;
            let h2 = b2 * b2 - c2;
            
            var actualExit = tExit;
            if (h2 > 0.0) {
              let planetHit = -b2 - sqrt(h2);
              if (planetHit > 0.0 && planetHit < tExit) {
                actualExit = planetHit;
              }
            }
            
            // Sample atmosphere
            let numSamples = 8;
            var scatter = vec3f(0.0);
            let stepSize = (actualExit - tEnter) / f32(numSamples);
            
            for (var i = 0; i < numSamples; i++) {
              let t = tEnter + (f32(i) + 0.5) * stepSize;
              let samplePos = ro + rd * t;
              let altitude = length(samplePos - planetPos) - planetR;
              let normalizedAlt = altitude / (atmosR - planetR);
              
              // Density decreases with altitude
              let density = exp(-normalizedAlt * 4.0);
              
              // Rayleigh scattering colors (more blue at edges)
              let rayleigh = vec3f(0.2, 0.5, 1.0) * density;
              
              // Mie scattering (sunset colors)
              let mie = vec3f(1.0, 0.4, 0.2) * density * 0.3;
              
              scatter += (rayleigh + mie) * stepSize * 0.15;
            }
            
            return scatter;
          }

          // ========================================
          // God rays
          // ========================================
          
          fn godRays(ro: vec3f, rd: vec3f, sunDir: vec3f, time: f32) -> vec3f {
            let sunDot = max(dot(rd, sunDir), 0.0);
            
            // Main sun glow
            let sunGlow = pow(sunDot, 256.0) * 2.0;
            
            // Corona
            let corona = pow(sunDot, 8.0) * 0.3;
            
            // Rays
            let rays = pow(sunDot, 2.0) * 0.15;
            
            let sunColor = vec3f(1.0, 0.9, 0.7);
            
            return sunColor * (sunGlow + corona + rays);
          }

          // ========================================
          // Materials
          // ========================================
          
          fn getPlanetColor(p: vec3f, n: vec3f, time: f32) -> vec3f {
            let localP = p - PLANET_POS;
            let sphereCoord = normalize(localP);
            
            // Base terrain colors
            let noise1 = fbm(sphereCoord * 4.0);
            let noise2 = fbm(sphereCoord * 8.0 + 10.0);
            
            // Alien planet colors
            let color1 = vec3f(0.6, 0.2, 0.4);  // Purple/magenta
            let color2 = vec3f(0.2, 0.5, 0.4);  // Teal
            let color3 = vec3f(0.8, 0.6, 0.3);  // Orange/sand
            let color4 = vec3f(0.1, 0.2, 0.3);  // Deep blue
            
            var col = mix(color1, color2, noise1);
            col = mix(col, color3, noise2 * 0.5);
            
            // Add polar ice caps
            let polarAmount = abs(sphereCoord.y);
            if (polarAmount > 0.7) {
              let iceCol = vec3f(0.7, 0.8, 0.9);
              col = mix(col, iceCol, smoothstep(0.7, 0.9, polarAmount));
            }
            
            // Add some bioluminescent patches
            let bioNoise = fbm(sphereCoord * 12.0 + time * 0.05);
            if (bioNoise > 0.65) {
              let bioCol = vec3f(0.2, 1.0, 0.6);
              col += bioCol * (bioNoise - 0.65) * 0.5;
            }
            
            return col;
          }

          fn getRingColor(p: vec3f, time: f32) -> vec3f {
            let localP = p - PLANET_POS;
            let dist = length(localP.xz);
            
            // Ring pattern
            let ringPattern = sin(dist * 8.0) * 0.5 + 0.5;
            let noise = hash21(vec2f(dist * 10.0, atan2(localP.x, localP.z) * 5.0));
            
            // Base ring color
            let color1 = vec3f(0.8, 0.7, 0.6);
            let color2 = vec3f(0.4, 0.35, 0.3);
            
            var col = mix(color1, color2, ringPattern);
            col *= 0.5 + noise * 0.5;
            
            // Add gaps
            let gapNoise = sin(dist * 30.0);
            if (gapNoise > 0.7) {
              col *= 0.3;
            }
            
            return col;
          }

          fn getMoonColor(p: vec3f, n: vec3f) -> vec3f {
            // Gray lunar surface with variation
            let noise = fbm(n * 8.0);
            let baseCol = vec3f(0.5, 0.5, 0.55);
            let darkCol = vec3f(0.2, 0.2, 0.25);
            
            return mix(darkCol, baseCol, noise);
          }

          // ========================================
          // Main Fragment Shader
          // ========================================
          
          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time;
            
            // Camera setup - slowly approaching the planet
            let camDist = 50.0 - time * 0.5;
            let camAngle = time * 0.05;
            
            let ro = vec3f(
              sin(camAngle) * 15.0,
              sin(time * 0.1) * 3.0 + 5.0,
              camDist
            );
            
            // Look at planet
            let lookAt = PLANET_POS;
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Sun direction (behind and to the side)
            let sunDir = normalize(vec3f(0.5, 0.3, -1.0));
            
            // Start with starfield background
            var col = stars(rd, time);
            
            // Add god rays from sun
            col += godRays(ro, rd, sunDir, time);
            
            // Add nebula-like background
            let nebulaCoord = rd * 2.0;
            let nebula1 = fbm(nebulaCoord + vec3f(0.0, 0.0, time * 0.01));
            let nebula2 = fbm(nebulaCoord * 2.0 + vec3f(100.0, 0.0, time * 0.02));
            let nebulaCol = mix(
              vec3f(0.1, 0.0, 0.15),
              vec3f(0.0, 0.1, 0.2),
              nebula1
            );
            col += nebulaCol * nebula2 * 0.15;
            
            // Raymarch the scene
            let hit = raymarch(ro, rd, time);
            
            if (hit.dist < MAX_DIST) {
              let p = ro + rd * hit.dist;
              let n = calcNormal(p, time);
              
              var matCol = vec3f(0.5);
              
              // Get material color
              if (hit.materialId == 1) {
                matCol = getPlanetColor(p, n, time);
              } else if (hit.materialId == 2) {
                matCol = getRingColor(p, time);
              } else if (hit.materialId == 3) {
                matCol = getMoonColor(p, n);
              }
              
              // Lighting
              let diff = max(dot(n, sunDir), 0.0);
              let ambient = vec3f(0.02, 0.03, 0.05);
              
              // Specular
              let viewDir = normalize(ro - p);
              let halfDir = normalize(sunDir + viewDir);
              let spec = pow(max(dot(n, halfDir), 0.0), 32.0);
              
              // Fresnel for rim lighting
              let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 4.0);
              
              // Combine lighting
              var surfaceCol = ambient * matCol;
              surfaceCol += matCol * vec3f(1.0, 0.95, 0.9) * diff;
              surfaceCol += vec3f(1.0, 0.9, 0.8) * spec * 0.3;
              
              // Add rim light (atmospheric glow for planet)
              if (hit.materialId == 1) {
                let rimCol = vec3f(0.3, 0.5, 1.0);
                surfaceCol += rimCol * fresnel * 0.5;
              }
              
              // Rings are partially transparent
              if (hit.materialId == 2) {
                let ringAlpha = 0.7;
                col = mix(col, surfaceCol, ringAlpha);
              } else {
                col = surfaceCol;
              }
            }
            
            // Add atmospheric glow around planet
            let atmosCol = atmosphere(ro, rd, PLANET_POS, PLANET_RADIUS, ATMOSPHERE_RADIUS);
            col += atmosCol;
            
            // Tone mapping
            col = col / (col + vec3f(1.0));
            
            // Slight color grading
            col = pow(col, vec3f(0.95, 1.0, 1.05));
            
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
          alienPlanet.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Alien Planet</h1>
      <p style={{ marginBottom: '1rem' }}>
        A procedurally generated alien world with atmospheric scattering, Saturn-like rings, 
        an orbiting moon, twinkling starfield, and volumetric god rays from a distant sun.
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
