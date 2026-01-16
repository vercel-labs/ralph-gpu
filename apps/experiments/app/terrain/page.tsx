'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

export default function TerrainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let animationId: number;
    let ctx: GPUContext | null = null;
    let disposed = false;
    let lastTime = performance.now();
    let frameCount = 0;
    
    async function init() {
      if (!canvasRef.current) return;
      
      try {
        if (!gpu.isSupported()) {
          console.error('WebGPU is not supported in this browser');
          return;
        }

        // Use autoResize - defaults to DPR capped at 2
        ctx = await gpu.init(canvasRef.current, {
          autoResize: true,
          dpr: 1,
          debug: false,
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        const terrain = ctx.pass(/* wgsl */ `
          // Lunar Landscape - Original implementation by Ralph-GPU AI
          const MAX_STEPS: i32 = 160; 
          const MAX_DIST: f32 = 400.0;
          const SURF_DIST: f32 = 0.01; 
          const SUN_DIR: vec3f = vec3f(-0.4, 0.6, -0.5); // Higher sun angle for more light

          fn hash21(p: vec2f) -> f32 {
            var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
            p3 += dot(p3, p3.yzx + 3.333);
            return fract((p3.x + p3.y) * p3.z);
          }

          fn hash33(p: vec3f) -> vec3f {
            var p3 = fract(p * vec3f(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.xxy + p3.yzz) * p3.zyx);
          }

          // Value noise with analytical derivatives
          fn moonNoise(p: vec2f) -> vec3f {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            let du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
            
            let a = hash21(i + vec2f(0.0, 0.0));
            let b = hash21(i + vec2f(1.0, 0.0));
            let c = hash21(i + vec2f(0.0, 1.0));
            let d = hash21(i + vec2f(1.0, 1.0));

            let k0 = a;
            let k1 = b - a;
            let k2 = c - a;
            let k3 = a - b - c + d;

            let val = k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y;
            let deriv = du * vec2f(k1 + k3 * u.y, k2 + k3 * u.x);

            return vec3f(val, deriv);
          }

          // Optimized procedural crater function (single loop layer)
          fn crater(p: vec2f) -> f32 {
            let i = floor(p);
            let f = fract(p);
            var dist = 1.0;
            
            for (var y = -1.0; y <= 1.0; y += 1.0) {
              for (var x = -1.0; x <= 1.0; x += 1.0) {
                let g = vec2f(x, y);
                let o = hash33(vec3f(i + g, 0.0)).xy * 0.7;
                let r = length(g + o - f);
                dist = min(dist, r);
              }
            }
            // Safer crater shape to avoid raymarching holes
            return -exp(-dist * dist * 4.0) * 2.0;
          }

          // Lunar surface displacement - balanced for performance
          fn moonSurface(p: vec2f) -> vec3f {
            var h: f32 = 0.0;
            var d = vec2f(0.0);
            var a: f32 = 0.5;
            var pos = p * 0.05;
            let m = mat2x2f(0.8, 0.6, -0.6, 0.8);
            
            for (var i = 0; i < 5; i++) { 
              let n = moonNoise(pos);
              d += a * n.yz;
              h += a * n.x / (1.0 + dot(d, d)); 
              a *= 0.5;
              pos = m * pos * 2.2;
            }
            
            // Single pass of craters
            h += crater(p * 0.03) * 1.2;
            
            return vec3f(pow(h, 1.) * 3.0 - 5.0, d * 15.0 * 0.05);
          }

          fn skyBackdrop(rd: vec3f) -> vec3f {
            var col = vec3f(0.0);
            
            // Distant sharp stars
            let res = globals.resolution.x * 0.5;
            var p = rd;
            for (var i: f32 = 0.0; i < 3.0; i += 1.0) {
              let q = fract(p * (0.2 * res)) - 0.5;
              let id = floor(p * (0.2 * res));
              let rn = hash33(id).xy;
              var c2 = 1.0 - smoothstep(0.0, 0.5, length(q));
              c2 *= step(rn.x, 0.0004 + i * 0.0005);
              col += c2 * (mix(vec3f(1.0, 0.9, 0.8), vec3f(0.8, 0.9, 1.0), rn.y));
              p *= 1.5;
            }
            
            // Earth-glow
            let earthDir = normalize(vec3f(0.5, 0.3, 0.8));
            let earthDot = max(0.0, dot(rd, earthDir));
            col += pow(earthDot, 100.0) * vec3f(0.2, 0.5, 1.0) * 3.0;
            col += pow(earthDot, 10.0) * vec3f(0.1, 0.2, 0.5) * 0.8;
            
            return col;
          }

          struct MoonHit {
            dist: f32,
            derivs: vec2f,
          }

          fn mapMoon(p: vec3f) -> MoonHit {
            let ms = moonSurface(p.xz);
            var r: MoonHit;
            r.dist = p.y - ms.x;
            r.derivs = ms.yz;
            return r;
          }

          fn raymarchMoon(ro: vec3f, rd: vec3f) -> MoonHit {
            var t: f32 = 0.0;
            var res: MoonHit;
            res.dist = MAX_DIST;
            
            var precis = 0.001;
            for (var i = 0; i < MAX_STEPS; i++) {
              let p = ro + rd * t;
              let m = mapMoon(p);
              if (abs(m.dist) < precis || t > MAX_DIST) {
                res = m;
                res.dist = t;
                break;
              }
              // More conservative stepping to avoid holes
              t += m.dist * 0.8; 
            }
            return res;
          }

          @fragment
          fn main(@builtin(position) fc: vec4f) -> @location(0) vec4f {
            let q = fc.xy / globals.resolution;
            var uv = (fc.xy - 0.5 * globals.resolution) / globals.resolution.y;
            uv.y = -uv.y;
            
            let time = globals.time;
            
            let ro = vec3f(time * 8.0, 10.0 + sin(time * 0.1) * 2.0, 0.0);
            let lookAt = vec3f(time * 8.0 + 20.0, 5.0, sin(time * 0.05) * 5.0);
            let fwd = normalize(lookAt - ro);
            let rgt = normalize(cross(vec3f(0.0, 1.0, 0.0), fwd));
            let up = cross(fwd, rgt);
            let rd = normalize(uv.x * rgt + uv.y * up + fwd * 1.2);
            
            let bg = skyBackdrop(rd);
            var col = bg;
            
            let hit = raymarchMoon(ro, rd);
            
            if (hit.dist < MAX_DIST) {
              let p = ro + rd * hit.dist;
              let n = normalize(vec3f(-hit.derivs.x, 1.0, -hit.derivs.y));
              
              let sunLgt = normalize(-SUN_DIR);
              let dif = max(0.0, dot(n, sunLgt));
              
              // Brighter regolith with more variation
              let noiseVar = hash21(p.xz * 0.2);
              let regolith = mix(vec3f(0.55, 0.55, 0.58), vec3f(0.7, 0.7, 0.75), noiseVar);
              
              // Stronger fill light (Earth glow contribution)
              let earthDir = normalize(vec3f(0.5, 0.3, 0.8));
              let earthFill = max(0.0, dot(n, earthDir)) * vec3f(0.1, 0.2, 0.4) * 0.5;
              
              let bounce = max(0.0, 0.5 + 0.5 * n.y) * 0.05;
              
              col = regolith * (dif + bounce) + earthFill;
              
              col = mix(col, bg, smoothstep(MAX_DIST * 0.7, MAX_DIST, hit.dist));
            }
            
            col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14); // ACES
            col = pow(col, vec3f(0.4545)); // Gamma
            col *= 1.0 - 0.15 * length(uv);
            
            return vec4f(col, 1.0);
          }
        `);

        let lastFps = 0

        function frame() {
          if (disposed) return;
          terrain.draw();
          
          // FPS counter
          frameCount++;
          const now = performance.now();
          if (now - lastTime >= 1000) {
            const newFps = Math.round(frameCount * 1000 / (now - lastTime))
            if(newFps !== lastFps) {
              lastFps = newFps
              setFps(newFps);
            }
            frameCount = 0;
            lastTime = now;
          }
          
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
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        right: '2rem', 
        background: 'rgba(0,0,0,0.7)', 
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '1.2rem',
        color: fps > 30 ? '#4f4' : fps > 15 ? '#ff4' : '#f44'
      }}>
        {fps} FPS
      </div>
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
