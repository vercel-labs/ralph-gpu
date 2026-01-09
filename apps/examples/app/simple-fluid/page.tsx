'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

/**
 * Simple Fluid Simulation using the NEW simplified API
 * 
 * Notice how clean the shader code is - no need to manually write:
 * - @group(1) @binding(N) declarations
 * - struct definitions for uniforms
 * - sampler declarations
 * 
 * Just write the shader logic and pass uniforms as plain values!
 */
export default function SimpleFluidPage() {
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

        // Resolution for simulation
        const simRes = 256;
        const dyeRes = 1024;

        // Simulation parameters
        const densityDissipation = 0.97;
        const velocityDissipation = 0.98;
        const splatRadius = 0.3;

        // Create ping-pong buffers
        const velocity = ctx.pingPong(simRes, simRes, {
          format: "rg16float",
          filter: "linear",
          wrap: "clamp"
        });

        const density = ctx.pingPong(dyeRes, dyeRes, {
          format: "rgba16float",
          filter: "linear",
          wrap: "clamp"
        });

        // =====================================================
        // SPLAT PASS - Look how clean this is!
        // No @group/@binding declarations needed!
        // =====================================================
        const splatPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let point = uniforms.point;
            let aspectRatio = uniforms.aspectRatio;
            let radius = uniforms.radius;
            let color = uniforms.color;
            
            var p = uv - point;
            p.x *= aspectRatio;
            let splat = exp(-dot(p, p) / radius) * color;
            let base = textureSample(uTarget, uTargetSampler, uv).xyz;
            return vec4f(base + splat, 1.0);
          }
        `, {
          // Just pass values directly - no { value: T } wrapper!
          uTarget: velocity.read,
          point: [0.5, 0.5] as [number, number],
          aspectRatio: ctx.width / ctx.height,
          radius: splatRadius / 100,
          color: [0, 0, 0] as [number, number, number],
        });

        // =====================================================
        // ADVECTION PASS - Also simplified!
        // =====================================================
        const advectionPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let dt = uniforms.dt;
            let dissipation = uniforms.dissipation;
            let texelSize = uniforms.texelSize;
            
            // Get velocity at this point
            let vel = textureSample(uVelocity, uVelocitySampler, uv).xy;
            
            // Trace back in time
            let coord = uv - dt * vel * texelSize;
            
            // Sample source at traced position
            var result = dissipation * textureSample(uSource, uSourceSampler, coord);
            result.a = 1.0;
            return result;
          }
        `, {
          uVelocity: velocity.read,
          uSource: velocity.read,
          dt: 0.016,
          dissipation: velocityDissipation,
          texelSize: [1/simRes, 1/simRes] as [number, number],
        });

        // =====================================================
        // DISPLAY PASS - Render the final result
        // =====================================================
        const displayPass = ctx.pass(/* wgsl */ `
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let fluid = textureSample(uDensity, uDensitySampler, uv).rgb;
            
            // Apply tone mapping
            let color = fluid / (1.0 + fluid);
            
            // Add subtle background
            let bg = mix(
              vec3f(0.02, 0.02, 0.05),
              vec3f(0.05, 0.02, 0.08),
              uv.y
            );
            
            let finalColor = color + bg * (1.0 - min(length(color), 1.0));
            return vec4f(finalColor, 1.0);
          }
        `, {
          uDensity: density.read,
        });

        // Helper: HSL to RGB
        function hslToRgb(h: number, s: number, l: number): [number, number, number] {
          let r, g, b;
          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          return [r, g, b];
        }

        // Splat helper - using the clean set() API
        function splat(x: number, y: number, dx: number, dy: number) {
          // Splat velocity
          splatPass.set('uTarget', velocity.read);
          splatPass.set('aspectRatio', ctx!.width / ctx!.height);
          splatPass.set('point', [x, y]);
          splatPass.set('color', [dx, dy, 1]);
          splatPass.set('radius', splatRadius / 100);

          ctx!.setTarget(velocity.write);
          ctx!.autoClear = false;
          splatPass.draw();
          velocity.swap();

          // Splat density with rainbow colors
          splatPass.set('uTarget', density.read);
          const hue = (x * 2 + ctx!.time * 0.2) % 1;
          const color = hslToRgb(hue, 0.9, 0.6);
          splatPass.set('color', [color[0] * 15, color[1] * 15, color[2] * 15]);

          ctx!.setTarget(density.write);
          splatPass.draw();
          density.swap();
        }

        // Track fake mouse
        let lastMouseX = 0.5;
        let lastMouseY = 0.5;
        let lastTime = 0;

        function frame(timestamp: number) {
          if (disposed) return;

          const dt = Math.min((timestamp - lastTime) / 1000, 0.016);
          lastTime = timestamp;

          // Fake mouse movement using sin/cos
          const time = timestamp * 0.001;
          const mouseX = 0.5 + 0.3 * Math.sin(time);
          const mouseY = 0.5 + 0.3 * Math.cos(time * 4);

          const dx = (mouseX - lastMouseX) * 500;
          const dy = (mouseY - lastMouseY) * 500;

          lastMouseX = mouseX;
          lastMouseY = mouseY;

          // Add splat
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            splat(mouseX, 1 - mouseY, dx, -dy);
          }

          // Advect velocity
          advectionPass.set('dt', dt);
          advectionPass.set('dissipation', velocityDissipation);
          advectionPass.set('texelSize', [1/simRes, 1/simRes]);
          advectionPass.set('uVelocity', velocity.read);
          advectionPass.set('uSource', velocity.read);
          ctx!.setTarget(velocity.write);
          ctx!.autoClear = false;
          advectionPass.draw();
          velocity.swap();

          // Advect density
          advectionPass.set('dissipation', densityDissipation);
          advectionPass.set('texelSize', [1/dyeRes, 1/dyeRes]);
          advectionPass.set('uVelocity', velocity.read);
          advectionPass.set('uSource', density.read);
          ctx!.setTarget(density.write);
          advectionPass.draw();
          density.swap();

          // Display
          displayPass.set('uDensity', density.read);
          ctx!.setTarget(null);
          ctx!.autoClear = true;
          displayPass.draw();

          animationId = requestAnimationFrame(frame);
        }

        frame(0);

      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationId) cancelAnimationFrame(animationId);
      if (ctx) ctx.dispose();
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        zIndex: 1,
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Simple Fluid (New API)</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.7, fontSize: 14 }}>
          Using the simplified uniform API - no manual @group/@binding!
        </p>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}
