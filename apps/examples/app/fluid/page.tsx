'use client';

import { useEffect, useRef } from 'react';
import { gpu, GPUContext } from 'ralph-gpu';

// Simulation parameters
const SIM_RESOLUTION = 256;
const DYE_RESOLUTION = 512;
const PRESSURE_ITERATIONS = 3;
const CURL_STRENGTH = 20;
const PRESSURE_DISSIPATION = 0.8;
const VELOCITY_DISSIPATION = 0.99;
const SPLAT_RADIUS = 0.003;
const SPLAT_FORCE = 6000;

export default function FluidPage() {
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
          autoResize: true
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        const simWidth = SIM_RESOLUTION;
        const simHeight = SIM_RESOLUTION;
        const dyeWidth = DYE_RESOLUTION;
        const dyeHeight = DYE_RESOLUTION;
        
        // Create ping-pong buffers for velocity (rg16float for x,y components)
        const velocity = ctx.pingPong(simWidth, simHeight, { 
          format: "rg16float",
          filter: "linear",
          wrap: "clamp"
        });
        
        // Create ping-pong buffers for dye (rgba16float for color)
        const dye = ctx.pingPong(dyeWidth, dyeHeight, { 
          format: "rgba16float",
          filter: "linear",
          wrap: "clamp"
        });
        
        // Create single-channel targets for pressure, divergence, curl
        const pressure = ctx.pingPong(simWidth, simHeight, { 
          format: "r16float",
          filter: "linear",
          wrap: "clamp"
        });
        
        const divergence = ctx.target(simWidth, simHeight, { 
          format: "r16float",
          filter: "nearest",
          wrap: "clamp"
        });
        
        const curl = ctx.target(simWidth, simHeight, { 
          format: "r16float",
          filter: "nearest",
          wrap: "clamp"
        });

        // ===== SPLAT PASS =====
        // Adds velocity and dye at the mouse/input position
        const splatVelocityUniforms = {
          uTarget: { value: velocity.read },
          uPoint: { value: [0.5, 0.5] as [number, number] },
          uColor: { value: [0, 0, 0] as [number, number, number] },
          uRadius: { value: SPLAT_RADIUS },
        };
        
        const splatVelocityPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uTarget: texture_2d<f32>;
          @group(1) @binding(1) var uTargetSampler: sampler;
          
          struct Params {
            point: vec2f,
            color: vec3f,
            radius: f32,
          }
          @group(1) @binding(2) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let base = textureSample(uTarget, uTargetSampler, uv).xy;
            
            var p = uv - params.point;
            p.x *= globals.aspect;
            
            let splat = exp(-dot(p, p) / params.radius) * params.color.xy;
            
            return vec4f(base + splat, 0.0, 1.0);
          }
        `, { uniforms: splatVelocityUniforms });

        const splatDyeUniforms = {
          uTarget: { value: dye.read },
          uPoint: { value: [0.5, 0.5] as [number, number] },
          uColor: { value: [1, 0, 0] as [number, number, number] },
          uRadius: { value: SPLAT_RADIUS },
        };
        
        const splatDyePass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uTarget: texture_2d<f32>;
          @group(1) @binding(1) var uTargetSampler: sampler;
          
          struct Params {
            point: vec2f,
            color: vec3f,
            radius: f32,
          }
          @group(1) @binding(2) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let base = textureSample(uTarget, uTargetSampler, uv).rgb;
            
            var p = uv - params.point;
            p.x *= globals.aspect;
            
            let splat = exp(-dot(p, p) / params.radius) * params.color;
            
            return vec4f(base + splat, 1.0);
          }
        `, { uniforms: splatDyeUniforms });

        // ===== CURL PASS =====
        // Calculates the curl (vorticity) of the velocity field
        const curlUniforms = {
          uVelocity: { value: velocity.read },
        };
        
        const curlPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uVelocity: texture_2d<f32>;
          @group(1) @binding(1) var uVelocitySampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let L = textureSample(uVelocity, uVelocitySampler, uv - vec2f(texelSize.x, 0.0)).y;
            let R = textureSample(uVelocity, uVelocitySampler, uv + vec2f(texelSize.x, 0.0)).y;
            let B = textureSample(uVelocity, uVelocitySampler, uv - vec2f(0.0, texelSize.y)).x;
            let T = textureSample(uVelocity, uVelocitySampler, uv + vec2f(0.0, texelSize.y)).x;
            
            let vorticity = R - L - T + B;
            
            return vec4f(0.5 * vorticity, 0.0, 0.0, 1.0);
          }
        `, { uniforms: curlUniforms });

        // ===== VORTICITY PASS =====
        // Applies vorticity confinement to enhance swirling motion
        const vorticityUniforms = {
          uVelocity: { value: velocity.read },
          uCurl: { value: curl },
          uCurlStrength: { value: CURL_STRENGTH },
          uDt: { value: 0.016 },
        };
        
        const vorticityPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uVelocity: texture_2d<f32>;
          @group(1) @binding(1) var uVelocitySampler: sampler;
          @group(1) @binding(2) var uCurl: texture_2d<f32>;
          @group(1) @binding(3) var uCurlSampler: sampler;
          
          struct Params {
            curlStrength: f32,
            dt: f32,
          }
          @group(1) @binding(4) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let L = textureSample(uCurl, uCurlSampler, uv - vec2f(texelSize.x, 0.0)).x;
            let R = textureSample(uCurl, uCurlSampler, uv + vec2f(texelSize.x, 0.0)).x;
            let B = textureSample(uCurl, uCurlSampler, uv - vec2f(0.0, texelSize.y)).x;
            let T = textureSample(uCurl, uCurlSampler, uv + vec2f(0.0, texelSize.y)).x;
            let C = textureSample(uCurl, uCurlSampler, uv).x;
            
            var force = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
            force = force / (length(force) + 0.0001);
            force = force * params.curlStrength * C;
            force.y = -force.y;
            
            let velocity = textureSample(uVelocity, uVelocitySampler, uv).xy;
            let result = velocity + force * params.dt;
            
            return vec4f(result, 0.0, 1.0);
          }
        `, { uniforms: vorticityUniforms });

        // ===== DIVERGENCE PASS =====
        // Calculates the divergence of the velocity field
        const divergenceUniforms = {
          uVelocity: { value: velocity.read },
        };
        
        const divergencePass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uVelocity: texture_2d<f32>;
          @group(1) @binding(1) var uVelocitySampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let uvL = uv - vec2f(texelSize.x, 0.0);
            let uvR = uv + vec2f(texelSize.x, 0.0);
            let uvB = uv - vec2f(0.0, texelSize.y);
            let uvT = uv + vec2f(0.0, texelSize.y);
            
            var L = textureSample(uVelocity, uVelocitySampler, uvL).x;
            var R = textureSample(uVelocity, uVelocitySampler, uvR).x;
            var B = textureSample(uVelocity, uVelocitySampler, uvB).y;
            var T = textureSample(uVelocity, uVelocitySampler, uvT).y;
            let C = textureSample(uVelocity, uVelocitySampler, uv).xy;
            
            // Boundary conditions - negate velocity at walls
            if (uvL.x < 0.0) { L = -C.x; }
            if (uvR.x > 1.0) { R = -C.x; }
            if (uvT.y > 1.0) { T = -C.y; }
            if (uvB.y < 0.0) { B = -C.y; }
            
            let div = 0.5 * (R - L + T - B);
            
            return vec4f(div, 0.0, 0.0, 1.0);
          }
        `, { uniforms: divergenceUniforms });

        // ===== PRESSURE PASS (Jacobi iteration) =====
        // Solves for pressure using Jacobi iteration
        const pressureUniforms = {
          uPressure: { value: pressure.read },
          uDivergence: { value: divergence },
        };
        
        const pressurePass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uPressure: texture_2d<f32>;
          @group(1) @binding(1) var uPressureSampler: sampler;
          @group(1) @binding(2) var uDivergence: texture_2d<f32>;
          @group(1) @binding(3) var uDivergenceSampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let L = textureSample(uPressure, uPressureSampler, uv - vec2f(texelSize.x, 0.0)).x;
            let R = textureSample(uPressure, uPressureSampler, uv + vec2f(texelSize.x, 0.0)).x;
            let B = textureSample(uPressure, uPressureSampler, uv - vec2f(0.0, texelSize.y)).x;
            let T = textureSample(uPressure, uPressureSampler, uv + vec2f(0.0, texelSize.y)).x;
            let divergence = textureSample(uDivergence, uDivergenceSampler, uv).x;
            
            let pressure = (L + R + B + T - divergence) * 0.25;
            
            return vec4f(pressure, 0.0, 0.0, 1.0);
          }
        `, { uniforms: pressureUniforms });

        // ===== GRADIENT SUBTRACT PASS =====
        // Subtracts the pressure gradient from velocity to make it divergence-free
        const gradientUniforms = {
          uPressure: { value: pressure.read },
          uVelocity: { value: velocity.read },
        };
        
        const gradientPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uPressure: texture_2d<f32>;
          @group(1) @binding(1) var uPressureSampler: sampler;
          @group(1) @binding(2) var uVelocity: texture_2d<f32>;
          @group(1) @binding(3) var uVelocitySampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let L = textureSample(uPressure, uPressureSampler, uv - vec2f(texelSize.x, 0.0)).x;
            let R = textureSample(uPressure, uPressureSampler, uv + vec2f(texelSize.x, 0.0)).x;
            let B = textureSample(uPressure, uPressureSampler, uv - vec2f(0.0, texelSize.y)).x;
            let T = textureSample(uPressure, uPressureSampler, uv + vec2f(0.0, texelSize.y)).x;
            
            var velocity = textureSample(uVelocity, uVelocitySampler, uv).xy;
            velocity -= vec2f(R - L, T - B);
            
            return vec4f(velocity, 0.0, 1.0);
          }
        `, { uniforms: gradientUniforms });

        // ===== ADVECTION PASS =====
        // Moves the field (velocity or dye) along the velocity field
        const advectVelocityUniforms = {
          uVelocity: { value: velocity.read },
          uSource: { value: velocity.read },
          uDissipation: { value: VELOCITY_DISSIPATION },
          uDt: { value: 0.016 },
        };
        
        const advectVelocityPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uVelocity: texture_2d<f32>;
          @group(1) @binding(1) var uVelocitySampler: sampler;
          @group(1) @binding(2) var uSource: texture_2d<f32>;
          @group(1) @binding(3) var uSourceSampler: sampler;
          
          struct Params {
            dissipation: f32,
            dt: f32,
          }
          @group(1) @binding(4) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let texelSize = 1.0 / globals.resolution;
            let uv = pos.xy / globals.resolution;
            
            let velocity = textureSample(uVelocity, uVelocitySampler, uv).xy;
            var coord = uv - params.dt * velocity * texelSize;
            
            let result = textureSample(uSource, uSourceSampler, coord).xy * params.dissipation;
            
            return vec4f(result, 0.0, 1.0);
          }
        `, { uniforms: advectVelocityUniforms });

        const advectDyeUniforms = {
          uVelocity: { value: velocity.read },
          uSource: { value: dye.read },
          uDissipation: { value: 0.98 },
          uDt: { value: 0.016 },
        };
        
        const advectDyePass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uVelocity: texture_2d<f32>;
          @group(1) @binding(1) var uVelocitySampler: sampler;
          @group(1) @binding(2) var uSource: texture_2d<f32>;
          @group(1) @binding(3) var uSourceSampler: sampler;
          
          struct Params {
            dissipation: f32,
            dt: f32,
          }
          @group(1) @binding(4) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let dyeTexelSize = 1.0 / vec2f(${dyeWidth}.0, ${dyeHeight}.0);
            let velTexelSize = 1.0 / vec2f(${simWidth}.0, ${simHeight}.0);
            let uv = pos.xy / globals.resolution;
            
            let velocity = textureSample(uVelocity, uVelocitySampler, uv).xy;
            var coord = uv - params.dt * velocity * velTexelSize;
            
            let result = textureSample(uSource, uSourceSampler, coord).rgb * params.dissipation;
            
            return vec4f(result, 1.0);
          }
        `, { uniforms: advectDyeUniforms });

        // ===== CLEAR PRESSURE PASS =====
        const clearPressureUniforms = {
          uPressure: { value: pressure.read },
          uDissipation: { value: PRESSURE_DISSIPATION },
        };
        
        const clearPressurePass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uPressure: texture_2d<f32>;
          @group(1) @binding(1) var uPressureSampler: sampler;
          
          struct Params {
            dissipation: f32,
          }
          @group(1) @binding(2) var<uniform> params: Params;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let value = textureSample(uPressure, uPressureSampler, uv).x * params.dissipation;
            return vec4f(value, 0.0, 0.0, 1.0);
          }
        `, { uniforms: clearPressureUniforms });

        // ===== DISPLAY PASS =====
        // Renders the dye to the screen
        const displayUniforms = {
          uDye: { value: dye.read },
        };
        
        const displayPass = ctx.pass(/* wgsl */ `
          @group(1) @binding(0) var uDye: texture_2d<f32>;
          @group(1) @binding(1) var uDyeSampler: sampler;

          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            let uv = pos.xy / globals.resolution;
            let color = textureSample(uDye, uDyeSampler, uv).rgb;
            
            // Tone mapping and gamma correction
            let mapped = color / (1.0 + color);
            let gamma = pow(mapped, vec3f(1.0 / 2.2));
            
            return vec4f(gamma, 1.0);
          }
        `, { uniforms: displayUniforms });

        // State for fake mouse
        let lastMouseX = 0.5;
        let lastMouseY = 0.5;

        function frame() {
          if (disposed || !ctx) return;
          
          const dt = 0.016; // Fixed timestep
          const time = ctx.time;
          
          // Fake mouse using sin/cos for testing
          const mouseX = 0.5 + 0.3 * Math.sin(time);
          const mouseY = 0.5 + 0.2 * Math.cos(time * 4);
          const deltaX = (mouseX - lastMouseX) * SPLAT_FORCE;
          const deltaY = (mouseY - lastMouseY) * SPLAT_FORCE;
          
          // Generate color based on time
          const hue = (time * 0.1) % 1.0;
          const color = hslToRgb(hue, 1.0, 0.5);
          
          // ===== SPLAT STEP =====
          // Update splat uniforms
          splatVelocityUniforms.uTarget.value = velocity.read;
          splatVelocityUniforms.uPoint.value = [mouseX, mouseY];
          splatVelocityUniforms.uColor.value = [deltaX, deltaY, 0];
          
          ctx.setTarget(velocity.write);
          ctx.autoClear = false;
          splatVelocityPass.draw();
          velocity.swap();
          
          splatDyeUniforms.uTarget.value = dye.read;
          splatDyeUniforms.uPoint.value = [mouseX, mouseY];
          splatDyeUniforms.uColor.value = color;
          
          ctx.setTarget(dye.write);
          splatDyePass.draw();
          dye.swap();
          
          // ===== CURL STEP =====
          curlUniforms.uVelocity.value = velocity.read;
          ctx.setTarget(curl);
          curlPass.draw();
          
          // ===== VORTICITY STEP =====
          vorticityUniforms.uVelocity.value = velocity.read;
          vorticityUniforms.uCurl.value = curl;
          vorticityUniforms.uDt.value = dt;
          
          ctx.setTarget(velocity.write);
          vorticityPass.draw();
          velocity.swap();
          
          // ===== DIVERGENCE STEP =====
          divergenceUniforms.uVelocity.value = velocity.read;
          ctx.setTarget(divergence);
          divergencePass.draw();
          
          // ===== CLEAR PRESSURE =====
          clearPressureUniforms.uPressure.value = pressure.read;
          ctx.setTarget(pressure.write);
          clearPressurePass.draw();
          pressure.swap();
          
          // ===== PRESSURE SOLVE (Jacobi iterations) =====
          pressureUniforms.uDivergence.value = divergence;
          for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
            pressureUniforms.uPressure.value = pressure.read;
            ctx.setTarget(pressure.write);
            pressurePass.draw();
            pressure.swap();
          }
          
          // ===== GRADIENT SUBTRACT =====
          gradientUniforms.uPressure.value = pressure.read;
          gradientUniforms.uVelocity.value = velocity.read;
          ctx.setTarget(velocity.write);
          gradientPass.draw();
          velocity.swap();
          
          // ===== ADVECTION STEP =====
          // Advect velocity
          advectVelocityUniforms.uVelocity.value = velocity.read;
          advectVelocityUniforms.uSource.value = velocity.read;
          advectVelocityUniforms.uDt.value = dt;
          
          ctx.setTarget(velocity.write);
          advectVelocityPass.draw();
          velocity.swap();
          
          // Advect dye
          advectDyeUniforms.uVelocity.value = velocity.read;
          advectDyeUniforms.uSource.value = dye.read;
          advectDyeUniforms.uDt.value = dt;
          
          ctx.setTarget(dye.write);
          advectDyePass.draw();
          dye.swap();
          
          // ===== DISPLAY =====
          displayUniforms.uDye.value = dye.read;
          ctx.setTarget(null);
          ctx.autoClear = true;
          displayPass.draw();
          
          // Update last mouse position
          lastMouseX = mouseX;
          lastMouseY = mouseY;
          
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
    <div style={{ 
      padding: '0', 
      margin: '0',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#000'
    }}>
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 10,
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 600 }}>
          Fluid Simulation
        </h1>
        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
          WebGPU Navier-Stokes • Curl, Vorticity & Pressure Solve
        </p>
      </div>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100vw', 
          height: '100vh',
          display: 'block',
        }}
        width={1024}
        height={768}
      />
    </div>
  );
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

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
