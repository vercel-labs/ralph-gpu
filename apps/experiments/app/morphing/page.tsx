'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function MorphingPage() {
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

        const morphing = ctx.pass(/* wgsl */ `
          // Constants
          const MAX_STEPS: i32 = 100;
          const MAX_DIST: f32 = 50.0;
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

          fn sdOctahedron(p: vec3f, s: f32) -> f32 {
            let q = abs(p);
            return (q.x + q.y + q.z - s) * 0.57735027;
          }

          fn sdCylinder(p: vec3f, h: f32, r: f32) -> f32 {
            let d = abs(vec2f(length(p.xz), p.y)) - vec2f(r, h);
            return min(max(d.x, d.y), 0.0) + length(max(d, vec2f(0.0)));
          }

          // ========================================
          // Domain Distortions
          // ========================================
          
          fn opTwist(p: vec3f, k: f32) -> vec3f {
            let c = cos(k * p.y);
            let s = sin(k * p.y);
            let q = vec2f(c * p.x - s * p.z, s * p.x + c * p.z);
            return vec3f(q.x, p.y, q.y);
          }

          fn opBend(p: vec3f, k: f32) -> vec3f {
            let c = cos(k * p.x);
            let s = sin(k * p.x);
            let q = vec2f(c * p.y - s * p.z, s * p.y + c * p.z);
            return vec3f(p.x, q.x, q.y);
          }

          fn opDisplace(p: vec3f, time: f32) -> f32 {
            return sin(p.x * 5.0 + time) * sin(p.y * 5.0 + time * 1.3) * sin(p.z * 5.0 + time * 0.7) * 0.03;
          }

          // ========================================
          // Morphing Scene
          // ========================================

          fn map(p: vec3f) -> f32 {
            let time = globals.time;
            
            // Cycle through shapes every 3 seconds
            let cycleTime = 3.0;
            let totalCycle = cycleTime * 5.0; // 5 shapes
            let t = time % totalCycle;
            let shapeIndex = i32(t / cycleTime);
            let morphT = fract(t / cycleTime); // 0 to 1 within each transition
            
            // Smooth easing function
            let easedT = smoothstep(0.0, 1.0, morphT);
            
            // Apply twist/bend during transitions
            let transitionIntensity = sin(morphT * PI); // peaks at 0.5
            var distortedP = p;
            
            distortedP = opTwist(distortedP, transitionIntensity * 1.5);
            distortedP = opBend(distortedP, transitionIntensity * 0.8);
            
            // SDFs for each shape (scaled to similar sizes)
            let sphere = sdSphere(distortedP, 1.0);
            let box = sdBox(distortedP, vec3f(0.8));
            let torus = sdTorus(distortedP, vec2f(0.8, 0.3));
            let octahedron = sdOctahedron(distortedP, 1.3);
            let cylinder = sdCylinder(distortedP, 0.8, 0.6);
            
            // Morph between shapes
            var d: f32;
            
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
          fn calcNormal(p: vec3f) -> vec3f {
            let e = vec2f(0.001, 0.0);
            return normalize(vec3f(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
            ));
          }

          // Raymarching
          fn raymarch(ro: vec3f, rd: vec3f) -> f32 {
            var t: f32 = 0.0;
            
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let d = map(p);
              
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
          fn edgeGlow(p: vec3f, n: vec3f) -> f32 {
            let e = 0.05;
            let d1 = map(p + n * e);
            let d2 = map(p - n * e);
            let curvature = abs(d1 + d2 - 2.0 * map(p)) / (e * e);
            return clamp(curvature * 0.5, 0.0, 1.0);
          }

          // Wireframe effect based on position
          fn wireframe(p: vec3f, n: vec3f) -> f32 {
            let scale = 10.0;
            let thickness = 0.05;
            
            // Grid lines on each axis
            let gridX = abs(fract(p.x * scale + 0.5) - 0.5);
            let gridY = abs(fract(p.y * scale + 0.5) - 0.5);
            let gridZ = abs(fract(p.z * scale + 0.5) - 0.5);
            
            // Weight by normal to show lines perpendicular to surface
            let nx = abs(n.x);
            let ny = abs(n.y);
            let nz = abs(n.z);
            
            var wire = min(gridY, gridZ) * nx;
            wire = min(wire, min(gridX, gridZ) * ny);
            wire = min(wire, min(gridX, gridY) * nz);
            
            return 1.0 - smoothstep(0.0, thickness, wire);
          }

          // Soft shadow
          fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32) -> f32 {
            var res: f32 = 1.0;
            var t = mint;
            
            for (var i = 0; i < 24; i++) {
              if (t >= maxt) { break; }
              let h = map(ro + rd * t);
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
              let d = map(pos + h * nor);
              occ += (h - d) * sca;
              sca *= 0.8;
            }
            
            return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
          }

          // Get shape color based on current transition
          fn getShapeColor(time: f32) -> vec3f {
            let cycleTime = 3.0;
            let totalCycle = cycleTime * 5.0;
            let t = time % totalCycle;
            let shapeIndex = i32(t / cycleTime);
            let morphT = fract(t / cycleTime);
            
            // Colors for each shape
            let sphereCol = vec3f(0.9, 0.3, 0.4);   // Red
            let boxCol = vec3f(0.3, 0.7, 0.9);      // Cyan
            let torusCol = vec3f(0.4, 0.9, 0.4);    // Green
            let octaCol = vec3f(0.9, 0.6, 0.2);     // Orange
            let cylCol = vec3f(0.7, 0.3, 0.9);      // Purple
            
            var col1: vec3f;
            var col2: vec3f;
            
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

          @fragment
          fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
            var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time;
            
            // Camera setup - slow orbit
            let camDist = 4.0;
            let camAngle = time * 0.2;
            
            let ro = vec3f(
              cos(camAngle) * camDist,
              sin(time * 0.15) * 1.0 + 0.5,
              sin(camAngle) * camDist
            );
            
            // Look at center
            let lookAt = vec3f(0.0, 0.0, 0.0);
            let forward = normalize(lookAt - ro);
            let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
            let up = cross(forward, right);
            
            // Ray direction
            let rd = normalize(forward + uv.x * right + uv.y * up);
            
            // Light
            let lightDir = normalize(vec3f(1.0, 1.0, -0.5));
            let lightCol = vec3f(1.0, 0.98, 0.95);
            
            // Raymarch
            let dist = raymarch(ro, rd);
            
            var col = vec3f(0.0);
            
            if (dist < MAX_DIST) {
              let p = ro + rd * dist;
              let n = calcNormal(p);
              
              // Base material color
              let matCol = getShapeColor(time);
              
              // View direction
              let viewDir = normalize(ro - p);
              
              // Diffuse
              let diff = max(dot(n, lightDir), 0.0);
              
              // Specular
              let halfDir = normalize(lightDir + viewDir);
              let spec = pow(max(dot(n, halfDir), 0.0), 64.0);
              
              // Fresnel
              let fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
              
              // Edge glow
              let edge = edgeGlow(p, n);
              
              // Wireframe overlay
              let wire = wireframe(p, n);
              
              // Ambient occlusion
              let ao = calcAO(p, n);
              
              // Soft shadow
              let shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);
              
              // Ambient
              let ambient = vec3f(0.08, 0.1, 0.15);
              
              // Combine base lighting
              col = ambient * matCol * ao;
              col += matCol * lightCol * diff * shadow;
              col += lightCol * spec * shadow * 0.6;
              
              // Add holographic rim
              let rimCol = vec3f(0.5, 0.8, 1.0);
              col += rimCol * fresnel * 0.5;
              
              // Add edge glow (bright at edges/corners)
              let edgeCol = vec3f(1.0, 0.8, 0.4);
              col += edgeCol * edge * 0.3;
              
              // Add wireframe overlay
              let wireCol = mix(vec3f(0.2, 0.6, 1.0), vec3f(1.0, 0.4, 0.8), sin(time * 2.0) * 0.5 + 0.5);
              col = mix(col, wireCol, wire * 0.4 * (0.5 + fresnel * 0.5));
              
              // Scanline effect for holographic look
              let scanline = sin(p.y * 50.0 + time * 5.0) * 0.5 + 0.5;
              col += wireCol * scanline * wire * 0.1;
              
              // Fog
              let fogAmount = 1.0 - exp(-dist * 0.08);
              let fogColor = vec3f(0.02, 0.04, 0.08);
              col = mix(col, fogColor, fogAmount);
              
            } else {
              // Background
              let bgGrad = rd.y * 0.5 + 0.5;
              col = mix(vec3f(0.05, 0.07, 0.12), vec3f(0.02, 0.03, 0.06), bgGrad);
              
              // Grid floor
              if (rd.y < 0.0) {
                let floorDist = -ro.y / rd.y;
                let floorP = ro + rd * floorDist;
                
                if (floorDist < 50.0 && floorDist > 0.0) {
                  let gridScale = 2.0;
                  let gridX = abs(fract(floorP.x / gridScale + 0.5) - 0.5);
                  let gridZ = abs(fract(floorP.z / gridScale + 0.5) - 0.5);
                  let grid = min(gridX, gridZ);
                  let gridLine = 1.0 - smoothstep(0.0, 0.02, grid);
                  
                  let gridFade = exp(-floorDist * 0.05);
                  col += vec3f(0.1, 0.2, 0.4) * gridLine * gridFade * 0.5;
                }
              }
            }
            
            // Tone mapping
            col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
            
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
          morphing.draw();
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
      <h1 style={{ marginBottom: '1rem' }}>Morphing Primitives</h1>
      <p style={{ marginBottom: '1rem' }}>
        Smooth morphing between 3D primitives: Sphere → Cube → Torus → Octahedron → Cylinder. 
        Features twist and bend distortions during transitions with a holographic wireframe overlay.
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
