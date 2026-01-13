"use client";

import { useEffect, useRef } from "react";
import { useControls } from "leva";
import {
  gpu,
  GPUContext,
  Material,
  ComputeShader,
  StorageBuffer,
  Pass,
  Sampler,
} from "ralph-gpu";

// ============================================================================
// Constants - Tweak these to change the visual feeling
// ============================================================================

// Particle system
const NUM_PARTICLES = 12000;
const MAX_LIFETIME = 10;
const TRIANGLE_RADIUS = 3;
const VELOCITY_SCALE = 0.04;

// Initial spawn randomness
const POSITION_JITTER = 0.03; // Random offset from edge position
const INITIAL_VELOCITY_JITTER = 0.4; // Initial velocity randomness

// Physics
const SDF_EPSILON = 0.01; // SDF gradient sampling distance
const FORCE_STRENGTH = 0.13; // How strongly SDF pushes particles
const VELOCITY_DAMPING = 0.99; // Velocity decay per frame (0-1)
const RESPAWN_VELOCITY_JITTER = INITIAL_VELOCITY_JITTER; // Velocity randomness on respawn
const SDF_UPDATE_INTERVAL = 1.; // Update SDF texture once per second

// Rendering
const POINT_SIZE = 0.3;
const FADE_DURATION = MAX_LIFETIME * .4; // How long the fade-out takes
const PARTICLE_OFFSET_Y = -0.95; // Y offset for particle rendering

// Postprocessing blur
const BLUR_MAX_SAMPLES = 16;
const BLUR_MAX_SIZE = 0.02; // Maximum blur radius in NDC

// ============================================================================
// Shared WGSL Code - SDF and Blur Functions
// ============================================================================

// Extracted SDF functions for use in compute shader and debug pass
const SDF_FUNCTIONS_WGSL = /* wgsl */ `
  // Simple hash function for pseudo-random
  fn hash(seed: f32) -> f32 {
    let s = fract(seed * 0.1031);
    let s2 = s * (s + 33.33);
    return fract(s2 * (s2 + s2));
  }

  // Simple 3D noise approximation
  fn noise3d(p: vec3f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(
      mix(hash(i.x + i.y * 57.0 + i.z * 113.0),
          hash(i.x + 1.0 + i.y * 57.0 + i.z * 113.0), u.x),
      mix(hash(i.x + (i.y + 1.0) * 57.0 + i.z * 113.0),
          hash(i.x + 1.0 + (i.y + 1.0) * 57.0 + i.z * 113.0), u.x),
      u.y
    );
  }

  // Triangle SDF (Inigo Quilez)
  fn triangleSdf(p: vec2f, r: f32) -> f32 {
    let k = sqrt(3.0);
    var px = abs(p.x) - r;
    var py = p.y + r / k;
    
    if (px + k * py > 0.0) {
      let newPx = (px - k * py) / 2.0;
      let newPy = (-k * px - py) / 2.0;
      px = newPx;
      py = newPy;
    }
    
    px -= clamp(px, -2.0 * r, 0.0);
    let len = sqrt(px * px + py * py);
    return -len * sign(py) - 0.7;
  }

  fn animatedSdf(p: vec2f, r: f32, time: f32) -> f32 {
    let sdf = triangleSdf(p, r);

    // Noise-based force modulation
    let noisePos = vec3f(p.x * 1., p.y * 1., time * 0.21);
    let noiseSample = noise3d(noisePos) * 2.;
    let noiseScale = step(sdf, 0.) * (1. - u.focused);

    return sdf - noiseSample * noiseScale;
  }
`;

// Extracted blur size calculation for consistency between blur and debug shaders
const BLUR_CALCULATION_WGSL = /* wgsl */ `
  // Calculate blur size with diagonal split through center at a given angle
  // One side has no blur, other side has radial blur
  fn calculateBlurSize(uv: vec2f, maxBlurSize: f32, angleRadians: f32) -> f32 {
    // Calculate distance from center (circular component)
    let centerDist = length(uv - 0.5) * sqrt(2.0);
    
    // Convert UV to centered coordinates
    let centered = uv - 0.5;
    
    // Rotate the split line by the given angle
    // We calculate signed distance to a line through origin at the given angle
    // Line perpendicular to angle: cos(angle)*x + sin(angle)*y = 0
    let diagonalDist = cos(angleRadians) * centered.x + sin(angleRadians) * centered.y;
    
    // Convert to 0-1 factor with smooth transition
    // smoothstep gives smooth transition across the diagonal line
    let diagonalFactor = smoothstep(-0.1, 0.1, diagonalDist);
    
    // Multiply circular blur by diagonal factor
    // Result: blur=0 on one side, full radial blur on the other
    return centerDist * maxBlurSize * diagonalFactor;
  }
  
  // Get normalized blur amount for visualization (0 to 1)
  fn getBlurNormalized(uv: vec2f, maxBlurSize: f32, angleRadians: f32) -> f32 {
    let blurSize = calculateBlurSize(uv, maxBlurSize, angleRadians);
    return blurSize / maxBlurSize;
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

// Helper: Generate random point on triangle edge
function randomPointOnTriangleEdge(radius: number): [number, number] {
  const edge = Math.floor(Math.random() * 3);
  const t = Math.random();

  // Equilateral triangle vertices matching IQ SDF (pointing up)
  const k = Math.sqrt(3.0);
  const vertices: [number, number][] = [
    [0, (2 * radius) / k], // Top
    [-radius, -radius / k], // Bottom left
    [radius, -radius / k], // Bottom right
  ];

  const v1 = vertices[edge];
  const v2 = vertices[(edge + 1) % 3];

  return [v1[0] + (v2[0] - v1[0]) * t, v1[1] + (v2[1] - v1[1]) * t];
}

// ============================================================================
// Page Component
// ============================================================================

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusedRef = useRef(0);
  const bumpIntensityRef = useRef(0);
  const bumpProgressRef = useRef(0);
  const debugSdfRef = useRef(false);
  const debugSdfTextureRef = useRef(false);
  const debugBlurRef = useRef(false);
  const blurAngleRef = useRef(26);

  // Leva controls
  useControls({
    debugSdfTexture: {
      value: false,
      label: "Debug SDF Texture",
      onChange: (v) => { debugSdfTextureRef.current = v; },
    },
    debugBlur: {
      value: false,
      label: "Debug Blur Size",
      onChange: (v) => { debugBlurRef.current = v; },
    },
    blurAngle: {
      value: 26,
      min: -180,
      max: 180,
      step: 1,
      label: "Blur Angle (deg)",
      onChange: (v) => { blurAngleRef.current = v; },
    },
  });

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    // Particle data
    let positionBuffer: StorageBuffer;
    let originalPositionBuffer: StorageBuffer;
    let velocityBufferA: StorageBuffer;
    let velocityBufferB: StorageBuffer;
    let lifetimeBuffer: StorageBuffer;

    // Shaders
    let computeAtoB: ComputeShader;
    let computeBtoA: ComputeShader;
    let particleMaterial: Material;
    let debugPass: Pass;
    let sdfTextureDebugPass: Pass;
    let blurPass: Pass;
    let blurDebugPass: Pass;
    let sdfPass: Pass;

    // Render targets
    let renderTarget: ReturnType<GPUContext["target"]>;
    let sdfTarget: ReturnType<GPUContext["target"]> | null = null;

    // Custom samplers
    let blurSampler: Sampler;
    let sdfSampler: Sampler;

    // SDF texture state
    let needsSdfUpdate = true;
    let currentCanvasWidth = 0;
    let currentCanvasHeight = 0;
    let lastSdfUpdateTime = 0;

    // Ping-pong state
    let pingPong = 0;

    // ResizeObserver for tracking canvas size
    let resizeObserver: ResizeObserver;

    async function init() {
      if (!canvasRef.current) return;

      // Check WebGPU support
      if (!gpu.isSupported()) {
        console.error("WebGPU is not supported");
        return;
      }

      ctx = await gpu.init(canvasRef.current, {
        autoResize: true,
        dpr: 2, // Test with DPR 2 - should work without texture size issues now
      });

      if (disposed) {
        ctx.dispose();
        return;
      }

      // Initialize particle data
      // Note: We still use Float32Array for CPU-side initialization, but GPU will read as vec2f
      const positionArray = new Float32Array(NUM_PARTICLES * 2);
      const originalPositionArray = new Float32Array(NUM_PARTICLES * 2);
      const velocityArrayA = new Float32Array(NUM_PARTICLES * 2);
      const velocityArrayB = new Float32Array(NUM_PARTICLES * 2);
      const lifetimeArray = new Float32Array(NUM_PARTICLES);

      for (let i = 0; i < NUM_PARTICLES; i++) {
        const [x, y] = randomPointOnTriangleEdge(TRIANGLE_RADIUS * 1.2);

        // Random offset for initial position
        const offsetX = (Math.random() - 0.5) * POSITION_JITTER;
        const offsetY = (Math.random() - 0.5) * POSITION_JITTER;

        // Position with offset
        positionArray[i * 2 + 0] = x + offsetX;
        positionArray[i * 2 + 1] = y + offsetY;

        // Original position (for reset)
        originalPositionArray[i * 2 + 0] = x + offsetX;
        originalPositionArray[i * 2 + 1] = y + offsetY;

        // Random initial lifetime for staggered effect
        lifetimeArray[i] = Math.random() * MAX_LIFETIME;

        // Small random initial velocity
        velocityArrayA[i * 2 + 0] =
          (Math.random() - 0.5) * INITIAL_VELOCITY_JITTER;
        velocityArrayA[i * 2 + 1] =
          (Math.random() - 0.5) * INITIAL_VELOCITY_JITTER;
        velocityArrayB[i * 2 + 0] = velocityArrayA[i * 2 + 0];
        velocityArrayB[i * 2 + 1] = velocityArrayA[i * 2 + 1];
      }

      // Create storage buffers (same size, but GPU will read as structured vec2f)
      positionBuffer = ctx.storage(NUM_PARTICLES * 2 * 4); // vec2f array
      originalPositionBuffer = ctx.storage(NUM_PARTICLES * 2 * 4);
      velocityBufferA = ctx.storage(NUM_PARTICLES * 2 * 4);
      velocityBufferB = ctx.storage(NUM_PARTICLES * 2 * 4);
      lifetimeBuffer = ctx.storage(NUM_PARTICLES * 4); // 1 float × 4 bytes

      // Write initial data
      positionBuffer.write(positionArray);
      originalPositionBuffer.write(originalPositionArray);
      velocityBufferA.write(velocityArrayA);
      velocityBufferB.write(velocityArrayB);
      lifetimeBuffer.write(lifetimeArray);

      // Create SDF target at half resolution (must be before compute shaders)
      const initialSdfWidth = Math.max(1, Math.floor(canvasRef.current.width / 2));
      const initialSdfHeight = Math.max(1, Math.floor(canvasRef.current.height / 2));
      
      // Use 16-bit float format to properly store negative SDF values with good precision
      sdfTarget = ctx.target(initialSdfWidth, initialSdfHeight, { format: "r16float" });
      currentCanvasWidth = canvasRef.current.width;
      currentCanvasHeight = canvasRef.current.height;
      needsSdfUpdate = true;
      
      // Helper to resize SDF target when canvas size changes
      function resizeSdfTarget(width: number, height: number) {
        if (!sdfTarget) return;
        
        const sdfWidth = Math.max(1, Math.floor(width / 2));
        const sdfHeight = Math.max(1, Math.floor(height / 2));
        
        // Use built-in resize method instead of creating new target
        sdfTarget.resize(sdfWidth, sdfHeight);
        
        currentCanvasWidth = width;
        currentCanvasHeight = height;
        needsSdfUpdate = true;
      }

      // Create custom samplers
      // SDF sampler with linear filtering for smooth gradient sampling
      sdfSampler = ctx.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      // Create compute shaders
      const computeShaderCode = /* wgsl */ `
        struct ComputeUniforms {
          deltaTime: f32,
          time: f32,
          focused: f32,
          triangleRadius: f32,
          sdfEpsilon: f32,
          forceStrength: f32,
          velocityDamping: f32,
          velocityScale: f32,
          maxLifetime: f32,
          offsetY: f32,
        }
        @group(1) @binding(0) var<uniform> u: ComputeUniforms;
        @group(1) @binding(1) var sdfTexture: texture_2d<f32>;
        @group(1) @binding(2) var sdfSampler: sampler;
        @group(1) @binding(3) var<storage, read_write> positions: array<vec2f>;
        @group(1) @binding(4) var<storage, read> originalPositions: array<vec2f>;
        @group(1) @binding(5) var<storage, read> velocityRead: array<vec2f>;
        @group(1) @binding(6) var<storage, read_write> velocityWrite: array<vec2f>;
        @group(1) @binding(7) var<storage, read_write> lifetimes: array<f32>;

        fn hash(seed: f32) -> f32 {
          let s = fract(seed * 0.1031);
          let s2 = s * (s + 33.33);
          return fract(s2 * (s2 + s2));
        }

        fn randomSigned(seed: f32) -> f32 {
          return hash(seed) * 2.0 - 1.0;
        }

        // Convert world position to UV coordinates for SDF texture sampling
        fn worldToUV(worldPos: vec2f) -> vec2f {
          // World space is centered at origin, ranging roughly [-aspect*5, aspect*5] x [-5, 5]
          // Convert to NDC [-1, 1]
          let ndc = worldPos / vec2f(globals.aspect * 5.0, 5.0);
          // Convert NDC to UV [0, 1] (flip Y because texture origin is top-left)
          let uv = ndc * vec2f(0.5, -0.5) + 0.5;
          return uv;
        }

        // Sample SDF from pre-rendered texture
        fn sampleSdf(worldPos: vec2f) -> f32 {
          // Adjust for SDF texture coordinate space (subtract same offset used when rendering SDF)
          let adjustedPos = worldPos + vec2f(0.0, u.offsetY);
          let uv = worldToUV(adjustedPos);
          // Read SDF directly from r16float texture (no unpacking needed!)
          let sdf = textureSampleLevel(sdfTexture, sdfSampler, uv, 0.0).r;
          return sdf;
        }

        @compute @workgroup_size(64, 1, 1)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          if (index >= arrayLength(&positions)) { return; }
          
          // Read current position and velocity (clean vec2f access)
          var pos = positions[index];
          var vel = velocityRead[index];
          var life = lifetimes[index];

          // Sample SDF gradient from texture (much faster than computing!)
          let sdfCenter = sampleSdf(pos);
          let sdfRight = sampleSdf(pos + vec2f(u.sdfEpsilon, 0.0));
          let sdfTop = sampleSdf(pos + vec2f(0.0, u.sdfEpsilon));

          let gradX = (sdfRight - sdfCenter) / u.sdfEpsilon;
          let gradY = (sdfTop - sdfCenter) / u.sdfEpsilon;
          let gradient = vec2f(gradX, gradY);

          let sdfSign = sign(sdfCenter);

          // Apply force
          let force = gradient * u.forceStrength * sdfSign;

          // Update velocity with damping
          vel *= u.velocityDamping;
          vel += force;

          // Update position
          pos += vel * u.deltaTime * u.velocityScale;

          // Update lifetime
          life += u.deltaTime;

          // Reset if lifetime exceeded
          if (life > u.maxLifetime) {
            pos = originalPositions[index];
            
            // Random velocity on reset
            let seedX = f32(index) + u.time * 1000.0;
            let seedY = f32(index) + u.time * 1000.0 + 12345.0;
            vel = vec2f(
              randomSigned(seedX) * ${RESPAWN_VELOCITY_JITTER},
              randomSigned(seedY) * ${RESPAWN_VELOCITY_JITTER}
            );
            
            life = 0.0;
          }

          // Write back
          positions[index] = pos;
          velocityWrite[index] = vel;
          lifetimes[index] = life;
        }
      `;

      const computeUniforms = {
        deltaTime: { value: 0.016 },
        time: { value: 0.0 },
        focused: { value: 0.0 },
        triangleRadius: { value: TRIANGLE_RADIUS },
        sdfEpsilon: { value: SDF_EPSILON },
        forceStrength: { value: FORCE_STRENGTH },
        velocityDamping: { value: VELOCITY_DAMPING },
        velocityScale: { value: VELOCITY_SCALE },
        maxLifetime: { value: MAX_LIFETIME },
        offsetY: { value: PARTICLE_OFFSET_Y },
      };

      const computeUniformsAtoB = {
        ...computeUniforms,
        sdfTexture: { value: sdfTarget!.texture },
        sdfSampler: { value: sdfSampler },
      };

      const computeUniformsBtoA = {
        ...computeUniforms,
        sdfTexture: { value: sdfTarget!.texture },
        sdfSampler: { value: sdfSampler },
      };

      computeAtoB = ctx.compute(computeShaderCode, {
        uniforms: computeUniformsAtoB,
      });
      computeAtoB.storage("positions", positionBuffer);
      computeAtoB.storage("originalPositions", originalPositionBuffer);
      computeAtoB.storage("velocityRead", velocityBufferA);
      computeAtoB.storage("velocityWrite", velocityBufferB);
      computeAtoB.storage("lifetimes", lifetimeBuffer);

      computeBtoA = ctx.compute(computeShaderCode, {
        uniforms: computeUniformsBtoA,
      });
      computeBtoA.storage("positions", positionBuffer);
      computeBtoA.storage("originalPositions", originalPositionBuffer);
      computeBtoA.storage("velocityRead", velocityBufferB);
      computeBtoA.storage("velocityWrite", velocityBufferA);
      computeBtoA.storage("lifetimes", lifetimeBuffer);

      // Create particle rendering material
      const particleShaderCode = /* wgsl */ `
        struct RenderUniforms {
          offsetY: f32,
          pointSize: f32,
          fadeStart: f32,
          fadeEnd: f32,
          triangleRadius: f32,
          bumpIntensity: f32,
          bumpProgress: f32,
        }
        @group(1) @binding(0) var<uniform> u: RenderUniforms;
        @group(1) @binding(1) var<storage, read> positions: array<vec2f>;
        @group(1) @binding(2) var<storage, read> lifetimes: array<f32>;

        struct VertexOutput {
          @builtin(position) pos: vec4f,
          @location(0) uv: vec2f,
          @location(1) @interpolate(flat) life: f32,
          @location(2) @interpolate(flat) sdfDist: f32,
        }

        // Triangle SDF
        fn triangleSdf(p: vec2f, r: f32) -> f32 {
          let k = sqrt(3.0);
          var px = abs(p.x) - r;
          var py = p.y + r / k;
          
          if (px + k * py > 0.0) {
            let newPx = (px - k * py) / 2.0;
            let newPy = (-k * px - py) / 2.0;
            px = newPx;
            py = newPy;
          }
          
          px -= clamp(px, -2.0 * r, 0.0);
          let len = sqrt(px * px + py * py);
          return -len * sign(py) - 0.7;
        }

        @vertex
        fn vs_main(
          @builtin(vertex_index) vid: u32,
          @builtin(instance_index) iid: u32
        ) -> VertexOutput {
          // Read particle position (clean vec2f access)
          let pos2d = positions[iid];
          let life = lifetimes[iid];

          // Calculate SDF distance for bump effect
          let sdf = triangleSdf(pos2d, u.triangleRadius);

          // Quad vertices (two triangles)
          var quad = array<vec2f, 6>(
            vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
            vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
          );

          // Get vertex position for this quad corner
          let quadPos = quad[vid];
          
          // Calculate particle size in clip space
          let aspect = globals.aspect;
          let particleSize = u.pointSize * 0.01; // Scale down to clip space
          let localPos = quadPos * vec2f(particleSize / aspect, particleSize);

          // Apply offset and convert to clip space
          let worldPos = pos2d + vec2f(0.0, u.offsetY);
          let clipPos = worldPos / vec2f(aspect * 5.0, 5.0) + localPos;

          var out: VertexOutput;
          out.pos = vec4f(clipPos, 0.0, 1.0);
          out.uv = quadPos * 0.5 + 0.5; // Convert -1..1 to 0..1
          out.life = life;
          out.sdfDist = abs(sdf);
          return out;
        }

        @fragment
        fn fs_main(in: VertexOutput) -> @location(0) vec4f {
          // Create circular particles
          let d = length(in.uv - 0.5);
          if (d > 0.5) { discard; }
          
          // Smooth edge for anti-aliasing
          let edgeSoftness = smoothstep(0.5, 0.3, d);

          // Lifetime fade
          let lifetimeOpacity = 1.0 - smoothstep(u.fadeStart, u.fadeEnd, in.life);

          // Bump effect based on SDF distance
          let bumpDist = abs(in.sdfDist - u.bumpProgress);
          let bumpEffect = smoothstep(0.7, 0.0, bumpDist) * u.bumpIntensity;

          // Base opacity 0.4, bumped opacity 1.0
          let baseOpacity = 0.4;
          let finalOpacity = mix(baseOpacity, 1.0, bumpEffect);

          let alpha = lifetimeOpacity * finalOpacity * edgeSoftness;
          return vec4f(1.0, 1.0, 1.0, alpha);
        }
      `;

      const renderUniforms = {
        offsetY: { value: PARTICLE_OFFSET_Y },
        pointSize: { value: POINT_SIZE },
        fadeStart: { value: MAX_LIFETIME - FADE_DURATION },
        fadeEnd: { value: MAX_LIFETIME },
        triangleRadius: { value: TRIANGLE_RADIUS },
        bumpIntensity: { value: 0.0 },
        bumpProgress: { value: 0.0 },
      };

      particleMaterial = ctx.material(particleShaderCode, {
        vertexCount: 6,
        instances: NUM_PARTICLES,
        blend: "additive",
        uniforms: renderUniforms,
      });

      particleMaterial.storage("positions", positionBuffer);
      particleMaterial.storage("lifetimes", lifetimeBuffer);

      // Create render target for postprocessing (auto-sized to canvas)
      renderTarget = ctx.target();

      // Create blur sampler
      blurSampler = ctx.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      // Create SDF render pass - renders SDF to texture for compute shader sampling
      const sdfShaderCode = /* wgsl */ `
        struct SdfUniforms {
          time: f32,
          triangleRadius: f32,
          focused: f32,
          offsetY: f32,
        }
        @group(1) @binding(0) var<uniform> u: SdfUniforms;

        ${SDF_FUNCTIONS_WGSL}

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert pixel coords to world space (matching particle system scale)
          let uv = pos.xy / globals.resolution;
          // Map pixel coordinate to normalized device coordinates (NDC): [-1,1] with y up
          let centered = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
          // Apply offsetY to match particle rendering coordinate space
          let worldPos = centered * vec2f(globals.aspect * 5.0, 5.0) - vec2f(0.0, u.offsetY);

          // Sample the animated SDF
          let sdf = animatedSdf(worldPos, u.triangleRadius, u.time);

          // Store SDF value directly in r16float texture (supports negative values!)
          return vec4f(sdf, 0.0, 0.0, 1.0);
        }
      `;

      const sdfUniforms = {
        time: { value: 0.0 },
        triangleRadius: { value: TRIANGLE_RADIUS },
        focused: { value: 0.0 },
        offsetY: { value: PARTICLE_OFFSET_Y },
      };

      sdfPass = ctx.pass(sdfShaderCode, {
        uniforms: sdfUniforms,
      });

      // Create debug pass for visualizing the SDF
      const debugShaderCode = /* wgsl */ `
        struct DebugUniforms {
          time: f32,
          triangleRadius: f32,
          focused: f32,
        }
        @group(1) @binding(0) var<uniform> u: DebugUniforms;

        ${SDF_FUNCTIONS_WGSL}

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert pixel coords to world space (matching particle system scale)
          let uv = pos.xy / globals.resolution;
          // Map pixel coordinate to normalized device coordinates (NDC): [-1,1] with y up
          let centered = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
          let worldPos = centered * vec2f(globals.aspect * 5.0, 5.0);

          // Sample the animated SDF
          let sdf = animatedSdf(worldPos, u.triangleRadius, u.time);

          // Visualize: negative (inside) = blue, positive (outside) = red
          // Gradient shows distance
          let inside = sdf < 0.0;
          let dist = abs(sdf);
          let normalizedDist = 1.0 - exp(-dist * 0.5);

          var color: vec3f;
          if (inside) {
            color = vec3f(0.0, 0.2, 0.8) * (1.0 - normalizedDist);
          } else {
            color = vec3f(0.8, 0.2, 0.0) * (1.0 - normalizedDist);
          }

          // Add contour lines
          let contourFreq = 0.5;
          let contour = abs(fract(sdf * contourFreq) - 0.5) * 2.0;
          let contourLine = smoothstep(0.9, 1.0, contour);
          color = mix(color, vec3f(1.0), contourLine * 0.3);

          // Highlight the zero crossing (edge)
          let edge = smoothstep(0.1, 0.0, abs(sdf));
          color = mix(color, vec3f(1.0, 1.0, 1.0), edge);

          return vec4f(color, 1.0);
        }
      `;

      const debugUniforms = {
        time: { value: 0.0 },
        triangleRadius: { value: TRIANGLE_RADIUS },
        focused: { value: 0.0 },
      };

      debugPass = ctx.pass(debugShaderCode, {
        uniforms: debugUniforms,
      });

      // Create SDF texture debug pass - visualizes the precomputed SDF texture
      const sdfTextureDebugShaderCode = /* wgsl */ `
        @group(1) @binding(0) var sdfTexture: texture_2d<f32>;
        @group(1) @binding(1) var sdfSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Sample SDF texture at full resolution (upscaled from half-res)
          let uv = pos.xy / globals.resolution;
          let sdf = textureSample(sdfTexture, sdfSampler, uv).r;

          // Visualize: negative (inside) = blue, positive (outside) = red
          // Gradient shows distance
          let inside = sdf < 0.0;
          let dist = abs(sdf);
          let normalizedDist = 1.0 - exp(-dist * 0.5);

          var color: vec3f;
          if (inside) {
            color = vec3f(0.0, 0.2, 0.8) * (1.0 - normalizedDist);
          } else {
            color = vec3f(0.8, 0.2, 0.0) * (1.0 - normalizedDist);
          }

          // Add contour lines
          let contourFreq = 0.5;
          let contour = abs(fract(sdf * contourFreq) - 0.5) * 2.0;
          let contourLine = smoothstep(0.9, 1.0, contour);
          color = mix(color, vec3f(1.0), contourLine * 0.3);

          // Highlight the zero crossing (edge)
          let edge = smoothstep(0.1, 0.0, abs(sdf));
          color = mix(color, vec3f(1.0, 1.0, 1.0), edge);

          return vec4f(color, 1.0);
        }
      `;

      const sdfTextureDebugUniforms = {
        sdfTexture: { value: sdfTarget!.texture },
        sdfSampler: { value: sdfSampler },
      };

      sdfTextureDebugPass = ctx.pass(sdfTextureDebugShaderCode, {
        uniforms: sdfTextureDebugUniforms,
      });

      // Create blur postprocessing pass
      const blurShaderCode = /* wgsl */ `
        struct BlurUniforms {
          maxBlurSize: f32,
          samples: f32,
          angle: f32,
        }
        @group(1) @binding(0) var<uniform> u: BlurUniforms;
        @group(1) @binding(1) var inputTex: texture_2d<f32>;
        @group(1) @binding(2) var inputSampler: sampler;

        ${BLUR_CALCULATION_WGSL}

        // Pixel hash for random rotation
        fn pixelHash(p: vec2u) -> f32 {
          var n = p.x * 3u + p.y * 113u;
          n = (n << 13u) ^ n;
          n = n * (n * n * 15731u + 789221u) + 1376312589u;
          return f32(n) * (1.0 / f32(0xffffffffu));
        }

        // Vogel disk sampling pattern
        fn vogelDisk(sampleIndex: f32, samplesCount: f32, phi: f32) -> vec2f {
          let goldenAngle = 2.399963; // radians
          let r = sqrt(sampleIndex + 0.5) / sqrt(samplesCount);
          let theta = sampleIndex * goldenAngle + phi;
          return vec2f(cos(theta), sin(theta)) * r;
        }

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert to UV coordinates
          let uv = pos.xy / globals.resolution;
          
          // Use shared blur size calculation with angle
          let blurSize = calculateBlurSize(uv, u.maxBlurSize, u.angle);
          
          // Generate random rotation per pixel using hash
          let hash = pixelHash(vec2u(pos.xy));
          let rotation = hash * 6.28318; // 0 to 2π
          
          // Accumulate samples using Vogel disk - OPTIMIZED: single sample per iteration
          var color = vec3f(0.0);
          let sampleCount = i32(u.samples);
          
          // Chromatic aberration strength (applied mathematically after sampling)
          let chromaticStrength = 1.9;
          
          for (var i = 0; i < sampleCount; i++) {
            let offset = vogelDisk(f32(i), u.samples, rotation);
            // Scale offset.x by aspect ratio to create circular disk instead of elliptical
            let aspectCorrectedOffset = vec2f(offset.x / globals.aspect, offset.y);
            
            // Single texture sample per iteration (3x faster than before)
            let sampleUV = uv + aspectCorrectedOffset * blurSize;
            let sampledColor = textureSample(inputTex, inputSampler, sampleUV).rgb;
            
            // Apply chromatic aberration mathematically based on sample offset
            // Samples on the right (+x) are more red, samples on the left are more blue
            let chromaticFactor = offset.x * chromaticStrength;
            let channelWeights = vec3f(
              1.2 + chromaticFactor,  // Red boosted for positive x offset
              1.1,                     // Green neutral
              1.0 - chromaticFactor    // Blue boosted for negative x offset
            );
            
            color += sampledColor * channelWeights;
          }
          
          // Average the samples
          let finalColor = color / u.samples;
          
          return vec4f(finalColor, 1.0);
        }
      `;

      const blurUniforms = {
        // Use the new sampler API - pass texture and sampler separately
        inputTex: { value: renderTarget.texture }, // Pass just the texture
        inputSampler: { value: blurSampler }, // Pass custom sampler
        maxBlurSize: { value: BLUR_MAX_SIZE },
        samples: { value: BLUR_MAX_SAMPLES },
        angle: { value: 0 }, // Will be updated in render loop
      };

      blurPass = ctx.pass(blurShaderCode, {
        uniforms: blurUniforms,
      });

      // Create blur debug pass to visualize blur size calculation
      const blurDebugShaderCode = /* wgsl */ `
        struct BlurDebugUniforms {
          maxBlurSize: f32,
          angle: f32,
        }
        @group(1) @binding(0) var<uniform> u: BlurDebugUniforms;

        ${BLUR_CALCULATION_WGSL}

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert to UV coordinates
          let uv = pos.xy / globals.resolution;
          
          // Use shared blur size calculation with angle
          let normalized = getBlurNormalized(uv, u.maxBlurSize, u.angle);
          
          // Color scheme: Blue (no blur) → Red (max blur)
          var color = vec3f(normalized, 0.0, 1.0 - normalized);
          
          // Add grid lines to show blur size contours
          let gridFreq = 10.0;
          let grid = fract(normalized * gridFreq);
          let gridLine = smoothstep(0.05, 0.1, grid) * smoothstep(0.95, 0.9, grid);
          color = mix(vec3f(1.0), color, gridLine);
          
          // Add a scale bar at the bottom
          if (uv.y > 0.9) {
            let barPos = uv.x;
            color = vec3f(barPos, 0.0, 1.0 - barPos);
          }
          
          return vec4f(color, 1.0);
        }
      `;

      const blurDebugUniforms = {
        maxBlurSize: { value: BLUR_MAX_SIZE },
        angle: { value: (blurAngleRef.current * Math.PI) / 180 }, // Convert degrees to radians
      };

      blurDebugPass = ctx.pass(blurDebugShaderCode, {
        uniforms: blurDebugUniforms,
      });

      // Add ResizeObserver to track canvas size changes
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const canvas = entry.target as HTMLCanvasElement;
          const width = canvas.width;
          const height = canvas.height;
          
          // Check if size changed (ignoring DPR as requested)
          if (width !== currentCanvasWidth || height !== currentCanvasHeight) {
            resizeSdfTarget(width, height);
            
            // Update compute shader uniforms with resized texture
            // Note: resize() destroys old texture and creates new one, so we need to update references
            if (sdfTarget) {
              computeUniformsAtoB.sdfTexture.value = sdfTarget.texture;
              computeUniformsBtoA.sdfTexture.value = sdfTarget.texture;
              sdfTextureDebugUniforms.sdfTexture.value = sdfTarget.texture;
            }
          }
        }
      });
      resizeObserver.observe(canvasRef.current);

      // Render loop
      let lastTime = performance.now();
      let totalTime = 0;

      function frame() {
        if (disposed || !ctx || !canvasRef.current) return;

        const now = performance.now();
        const deltaTime = Math.min((now - lastTime) / 1000, 0.07);
        lastTime = now;
        totalTime += deltaTime;

        // Render SDF texture only once per second OR when size changed
        // This saves GPU cycles since the SDF animates slowly
        const timeSinceLastSdfUpdate = totalTime - lastSdfUpdateTime;
        const shouldUpdateSdf = needsSdfUpdate || timeSinceLastSdfUpdate >= SDF_UPDATE_INTERVAL;
        
        if (sdfTarget && shouldUpdateSdf) {
          sdfUniforms.time.value = totalTime;
          sdfUniforms.focused.value = focusedRef.current;
          
          ctx.setTarget(sdfTarget);
          sdfPass.draw();
          
          lastSdfUpdateTime = totalTime;
          needsSdfUpdate = false;
        }

        // Update compute uniforms
        computeUniforms.deltaTime.value = deltaTime;
        computeUniforms.time.value = totalTime;
        computeUniforms.focused.value = focusedRef.current;

        // Update debug uniforms
        debugUniforms.time.value = totalTime;
        debugUniforms.focused.value = focusedRef.current;

        // Dispatch compute shader (ping-pong)
        if (pingPong === 0) {
          computeAtoB.dispatch(Math.ceil(NUM_PARTICLES / 64));
        } else {
          computeBtoA.dispatch(Math.ceil(NUM_PARTICLES / 64));
        }
        pingPong = 1 - pingPong;

        // Update render uniforms
        renderUniforms.bumpIntensity.value = bumpIntensityRef.current;
        renderUniforms.bumpProgress.value = bumpProgressRef.current;

        // Update blur angle (convert degrees to radians)
        const angleRadians = (blurAngleRef.current * Math.PI) / 180;
        blurUniforms.angle.value = angleRadians;
        blurDebugUniforms.angle.value = angleRadians;

        if (debugSdfRef.current) {
          // SDF Debug mode: render the SDF visualization directly to canvas
          ctx.setTarget(null);
          debugPass.draw();
        } else if (debugSdfTextureRef.current) {
          // SDF Texture Debug mode: visualize the precomputed SDF texture with particles on top
          ctx.setTarget(null);
          ctx.clear()
          ctx.autoClear = false;
          
          // Step 1: Draw SDF debug visualization
          sdfTextureDebugPass.draw();
          
          // Step 2: Draw particles on top (without clearing!)
          particleMaterial.draw();

          ctx.autoClear = true;
        } else if (debugBlurRef.current) {
          // Blur Debug mode: visualize blur size calculation
          ctx.setTarget(null);
          blurDebugPass.draw();
        } else {
          // Normal mode: render particles to target, then apply blur
          // Step 1: Render particles to render target
          ctx.setTarget(renderTarget);
          particleMaterial.draw();

          // Step 2: Apply blur postprocessing to canvas
          ctx.setTarget(null);
          blurPass.draw();
        }

        animationId = requestAnimationFrame(frame);
      }
      frame();
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      if (resizeObserver) {
        if (canvasRef.current) {
          resizeObserver.unobserve(canvasRef.current);
        }
        resizeObserver.disconnect();
      }
      ctx?.dispose();
    };
  }, []);

  return (
    <div 
      className="w-screen h-screen bg-black" 
      style={{ width: "100vw", height: "100vh", backgroundColor: "black" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
