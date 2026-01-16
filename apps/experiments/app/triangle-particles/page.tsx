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
const NUM_PARTICLES = 30000;
const MAX_LIFETIME = 8;
const TRIANGLE_RADIUS = 2;
const VELOCITY_SCALE = 0.04;

// Initial spawn randomness
const POSITION_JITTER = 0.03; // Random offset from edge position
const INITIAL_VELOCITY_JITTER = 0.4; // Initial velocity randomness

// Physics
const SDF_EPSILON = 0.01; // SDF gradient sampling distance
const FORCE_STRENGTH = 0.13; // How strongly SDF pushes particles
const VELOCITY_DAMPING = 0.995; // Velocity decay per frame (0-1)
const RESPAWN_VELOCITY_JITTER = INITIAL_VELOCITY_JITTER; // Velocity randomness on respawn
const SDF_UPDATE_INTERVAL = 0.6; // Update SDF texture once per second
const SHOOT_LINE_WIDTH = 0.3; // Width of the shoot line effect

// Rendering
const POINT_SIZE = 0.3;
const FADE_IN_DURATION = MAX_LIFETIME * 0.1; // How long the fade-in takes
const FADE_DURATION = MAX_LIFETIME * 1.4; // How long the fade-out takes
const PARTICLE_OFFSET_Y = -0.95; // Y offset for particle rendering

// Postprocessing chromatic aberration
const CHROMATIC_MAX_OFFSET = 0.02; // Maximum chromatic offset in NDC
const CHROMATIC_ANGLE = -23;

// Render target options for debug selector
type RenderTargetOption =
  | "final"
  | "final-no-post"
  | "sdf-texture"
  | "gradient-texture"
  | "blur-size";

const DEFAULT_RENDER_TARGET: RenderTargetOption = "final";

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
    return -len * sign(py);
  }

  fn animatedSdf(p: vec2f, r: f32, time: f32) -> f32 {
    let sdf = triangleSdf(p, r + 0.7) - 0.1;

    // Noise-based force modulation
    let noiseSampleScale = 1.;
    let noisePos = vec3f(p.x * noiseSampleScale, p.y * noiseSampleScale - time * 0.1, sin(time * 1.) * 0.5 + .5);
    let noiseSample = noise3d(noisePos) * 2.;
    var noiseScale = step(sdf, 0.) * (1. - u.focused);
    noiseScale = noiseScale * pow(clamp(1. - sdf * 0.1 - 0.2, 0., 1.), 0.5);

    return sdf;
  }
`;

// Extracted blur size calculation for consistency between blur and debug shaders
const BLUR_CALCULATION_WGSL = /* wgsl */ `
  // Calculate blur size based on rotated absolute X value
  // Blur increases as you move away from the center line (rotated by angle)
  fn calculateBlurSize(uv: vec2f, maxBlurSize: f32, angleRadians: f32) -> f32 {
    // Convert UV to centered coordinates (-0.5 to 0.5)
    let centered = uv - 0.5;
    
    // Rotate coordinates by the angle
    let cosA = cos(angleRadians);
    let sinA = sin(angleRadians);
    let rotatedX = centered.x * cosA - centered.y * sinA;
    
    // Use absolute value of rotated X, scaled to 0-1 range
    // Multiply by 2 since centered goes from -0.5 to 0.5
    let blurFactor = clamp(abs(rotatedX) * 2.0, 0.0, 1.0);
    
    return blurFactor * maxBlurSize;
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
  const renderTargetRef = useRef<RenderTargetOption>(DEFAULT_RENDER_TARGET);
  const chromaticAngleRef = useRef(CHROMATIC_ANGLE);
  const useZoomBlurRef = useRef(false);
  const darkModeRef = useRef(true);

  // Mouse interaction refs
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const mouseForceRef = useRef(0.5);
  const mouseRadiusRef = useRef(1.0);

  // Leva controls
  useControls({
    renderTarget: {
      value: DEFAULT_RENDER_TARGET,
      options: {
        "Final (Postprocessing)": "final",
        "Final (No Postprocessing)": "final-no-post",
        "SDF Texture": "sdf-texture",
        "Gradient Texture": "gradient-texture",
        "Blur Size": "blur-size",
      },
      label: "Render Target",
      onChange: (v: RenderTargetOption) => {
        renderTargetRef.current = v;
      },
    },
    chromaticAngle: {
      value: CHROMATIC_ANGLE,
      min: -180,
      max: 180,
      step: 1,
      label: "Chromatic Angle (deg)",
      onChange: (v) => {
        chromaticAngleRef.current = v;
      },
    },
    useZoomBlur: {
      value: false,
      label: "Zoom Blur (vs Radial)",
      onChange: (v) => {
        useZoomBlurRef.current = v;
      },
    },
    darkMode: {
      value: true,
      label: "Dark Mode",
      onChange: (v: boolean) => {
        darkModeRef.current = v;
      },
    },
    mouseForce: {
      value: 0.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: "Mouse Force",
      onChange: (v: number) => {
        mouseForceRef.current = v;
      },
    },
    mouseRadius: {
      value: 1.0,
      min: 0.5,
      max: 10,
      step: 0.1,
      label: "Mouse Radius",
      onChange: (v: number) => {
        mouseRadiusRef.current = v;
      },
    },
  });

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let animationId: number;
    let disposed = false;

    // Capture canvas ref for cleanup
    const canvas = canvasRef.current;

    // Particle data
    let positionBuffer: StorageBuffer;
    let originalPositionBuffer: StorageBuffer;
    let velocityBufferA: StorageBuffer;
    let velocityBufferB: StorageBuffer;
    let lifetimeBuffer: StorageBuffer;

    // Shaders
    let computeAtoB: ComputeShader;
    let computeBtoA: ComputeShader;
    let particleMaterialDark: Material;
    let particleMaterialLight: Material;
    let sdfTextureDebugPass: Pass;
    let gradientTextureDebugPass: Pass;
    let blurPass: Pass;
    let blurDebugPass: Pass;
    let sdfPass: Pass;
    let gradientPass: Pass;

    // Render targets
    let renderTarget: ReturnType<GPUContext["target"]>;
    let sdfTarget: ReturnType<GPUContext["target"]> | null = null;
    let gradientTarget: ReturnType<GPUContext["target"]> | null = null;

    // Custom samplers
    let blurSampler: Sampler;
    let sdfSampler: Sampler;
    let sdfNearestSampler: Sampler;
    let gradientSampler: Sampler;

    // SDF texture state
    let needsSdfUpdate = true;
    let currentCanvasWidth = 0;
    let currentCanvasHeight = 0;
    let lastSdfUpdateTime = 0;

    // Ping-pong state
    let pingPong = 0;

    // ResizeObserver for tracking canvas size
    let resizeObserver: ResizeObserver;

    // Mouse event handler - just converts screen coords to world space
    function handleMouseMove(e: MouseEvent) {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      // Normalize to [0, 1]
      const normalizedX = (e.clientX - rect.left) / rect.width;
      const normalizedY = (e.clientY - rect.top) / rect.height;

      // Convert to clip space [-1, 1], with Y flipped
      const clipX = normalizedX * 2 - 1;
      const clipY = -(normalizedY * 2 - 1);

      // Convert to world space (matching particle coordinate system)
      const aspect = rect.width / rect.height;
      const worldX = clipX * aspect * 5;
      const worldY = clipY * 5 - PARTICLE_OFFSET_Y;

      mousePositionRef.current = { x: worldX, y: worldY };
    }

    async function init() {
      if (!canvasRef.current) return;

      // Add mouse event listener
      window.addEventListener("mousemove", handleMouseMove);

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
      const initialSdfWidth = Math.max(
        1,
        Math.floor(canvasRef.current.width / 2)
      );
      const initialSdfHeight = Math.max(
        1,
        Math.floor(canvasRef.current.height / 2)
      );

      // Use 16-bit float format to properly store negative SDF values with good precision
      sdfTarget = ctx.target(initialSdfWidth, initialSdfHeight, {
        format: "r16float",
      });

      // Gradient target - same size as SDF, uses RG16float for negative gradient values
      gradientTarget = ctx.target(initialSdfWidth, initialSdfHeight, {
        format: "rg16float",
      });

      currentCanvasWidth = canvasRef.current.width;
      currentCanvasHeight = canvasRef.current.height;
      needsSdfUpdate = true;

      // Helper to resize SDF target when canvas size changes
      function resizeSdfTarget(width: number, height: number) {
        if (!sdfTarget || !gradientTarget) return;

        const sdfWidth = Math.max(1, Math.floor(width / 2));
        const sdfHeight = Math.max(1, Math.floor(height / 2));

        // Use built-in resize method instead of creating new target
        sdfTarget.resize(sdfWidth, sdfHeight);
        gradientTarget.resize(sdfWidth, sdfHeight);

        currentCanvasWidth = width;
        currentCanvasHeight = height;
        needsSdfUpdate = true;
      }

      // Create custom samplers
      // SDF sampler with linear filtering for smooth gradient sampling (used for debug visualization)
      sdfSampler = ctx.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      // SDF nearest sampler for fast gradient calculation pass
      sdfNearestSampler = ctx.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      // Gradient sampler with nearest filtering for fast particle sampling
      gradientSampler = ctx.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
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
          forceStrength: f32,
          velocityDamping: f32,
          velocityScale: f32,
          maxLifetime: f32,
          offsetY: f32,
          mouseX: f32,
          mouseY: f32,
          mouseDirX: f32,
          mouseDirY: f32,
          mouseForce: f32,
          mouseRadius: f32,
        }
        @group(1) @binding(0) var<uniform> u: ComputeUniforms;
        @group(1) @binding(1) var gradientTexture: texture_2d<f32>;
        @group(1) @binding(2) var gradientSampler: sampler;
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

        // Convert world position to UV coordinates for texture sampling
        fn worldToUV(worldPos: vec2f) -> vec2f {
          // World space is centered at origin, ranging roughly [-aspect*5, aspect*5] x [-5, 5]
          // Convert to NDC [-1, 1]
          let ndc = worldPos / vec2f(globals.aspect * 5.0, 5.0);
          // Convert NDC to UV [0, 1] (flip Y because texture origin is top-left)
          let uv = ndc * vec2f(0.5, -0.5) + 0.5;
          return uv;
        }

        // Sample gradient from pre-rendered gradient texture
        // Returns vec3f: (gradX, gradY, sdfSign)
        fn sampleGradient(worldPos: vec2f) -> vec3f {
          // Adjust for texture coordinate space (subtract same offset used when rendering)
          let adjustedPos = worldPos + vec2f(0.0, u.offsetY);
          let uv = worldToUV(adjustedPos);
          // Read gradient directly from rg16float texture - R=gradX, G=gradY
          // The B channel contains the SDF sign encoded as 0.0 (negative) or 1.0 (positive)
          let sample = textureSampleLevel(gradientTexture, gradientSampler, uv, 0.0);
          // Decode sdfSign: B channel is 0.5 + 0.5 * sign, so sign = (B - 0.5) * 2
          let sdfSign = sign(sample.b - 0.5);
          return vec3f(sample.r, sample.g, sdfSign);
        }

        @compute @workgroup_size(64, 1, 1)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          if (index >= arrayLength(&positions)) { return; }
          
          // Read current position and velocity (clean vec2f access)
          var pos = positions[index];
          var vel = velocityRead[index];
          var life = lifetimes[index];

          // Sample precomputed gradient from texture (single sample instead of 3!)
          let gradientData = sampleGradient(pos);
          let gradient = vec2f(gradientData.x, gradientData.y);
          let sdfSign = gradientData.z;

          // Apply SDF force
          let force = gradient * u.forceStrength * sdfSign;

          // Update velocity with damping and SDF force
          vel *= u.velocityDamping;
          vel += force;

          // Mouse push force (applied after damping so it's not weakened)
          // Particles are pushed in the direction the mouse is moving
          let mousePos = vec2f(u.mouseX, u.mouseY);
          let mouseDir = vec2f(u.mouseDirX, u.mouseDirY);
          let toMouse = mousePos - pos;
          let distToMouse = length(toMouse);
          
          // Apply push force if within radius
          if (distToMouse < u.mouseRadius && distToMouse > 0.01) {
            // Strength falls off with distance from mouse
            let falloff = 1.0 - (distToMouse / u.mouseRadius);
            // Push in the direction the mouse is moving
            let pushForce = mouseDir * u.mouseForce * falloff * falloff;
            vel += pushForce;
          }

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
        forceStrength: { value: FORCE_STRENGTH },
        velocityDamping: { value: VELOCITY_DAMPING },
        velocityScale: { value: VELOCITY_SCALE },
        maxLifetime: { value: MAX_LIFETIME },
        offsetY: { value: PARTICLE_OFFSET_Y },
        mouseX: { value: 0.0 },
        mouseY: { value: 0.0 },
        mouseDirX: { value: 0.0 },
        mouseDirY: { value: 0.0 },
        mouseForce: { value: 0.5 },
        mouseRadius: { value: 1.0 },
      };

      const computeUniformsAtoB = {
        ...computeUniforms,
        gradientTexture: { value: gradientTarget!.texture },
        gradientSampler: { value: gradientSampler },
      };

      const computeUniformsBtoA = {
        ...computeUniforms,
        gradientTexture: { value: gradientTarget!.texture },
        gradientSampler: { value: gradientSampler },
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
          fadeInEnd: f32,
          fadeStart: f32,
          fadeEnd: f32,
          triangleRadius: f32,
          bumpIntensity: f32,
          bumpProgress: f32,
          maxBlurSize: f32,
          blurAngle: f32,
          postprocessingEnabled: f32,
          particleColor: vec3f,
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

        ${BLUR_CALCULATION_WGSL}

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
          
          // Calculate blur size at this particle's screen position
          let aspect = globals.aspect;
          let worldPos = pos2d + vec2f(0.0, u.offsetY);
          let clipPos = worldPos / vec2f(aspect * 5.0, 5.0);
          let screenUV = clipPos * vec2f(0.5, -0.5) + 0.5;
          
          // Get normalized blur amount (0 to 1)
          let blurFactor = getBlurNormalized(screenUV, u.maxBlurSize, u.blurAngle);
          
          // Scale particle from 1x to 2x based on blur, but only when postprocessing is enabled
          let sizeMultiplier = select(1.0, 1.0 + blurFactor, u.postprocessingEnabled > 0.5);
          
          // Calculate particle size in clip space with blur scaling
          let particleSize = u.pointSize * 0.01 * sizeMultiplier;
          let localPos = quadPos * vec2f(particleSize / aspect, particleSize);

          // Final clip position
          let finalClipPos = clipPos + localPos;

          var out: VertexOutput;
          out.pos = vec4f(finalClipPos, 0.0, 1.0);
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

          // Lifetime fade (in and out)
          let fadeIn = smoothstep(0.0, u.fadeInEnd, in.life);
          let fadeOut = 1.0 - smoothstep(u.fadeStart, u.fadeEnd, in.life);
          let lifetimeOpacity = fadeIn * fadeOut;

          // Bump effect based on SDF distance
          let bumpDist = abs(in.sdfDist - u.bumpProgress);
          let bumpEffect = smoothstep(0.7, 0.0, bumpDist) * u.bumpIntensity;

          // Base opacity 0.4, bumped opacity 1.0
          let baseOpacity = 0.4;
          let finalOpacity = mix(baseOpacity, 1.0, bumpEffect);

          let alpha = lifetimeOpacity * finalOpacity * edgeSoftness;
          return vec4f(u.particleColor, alpha);
        }
      `;

      const renderUniforms = {
        offsetY: { value: PARTICLE_OFFSET_Y },
        pointSize: { value: POINT_SIZE },
        fadeInEnd: { value: FADE_IN_DURATION },
        fadeStart: { value: MAX_LIFETIME - FADE_DURATION },
        fadeEnd: { value: MAX_LIFETIME },
        triangleRadius: { value: TRIANGLE_RADIUS },
        bumpIntensity: { value: 0.0 },
        bumpProgress: { value: 0.0 },
        maxBlurSize: { value: CHROMATIC_MAX_OFFSET },
        blurAngle: { value: 0 }, // Will be updated in render loop
        postprocessingEnabled: { value: 1.0 }, // Will be updated in render loop
        particleColor: { value: [1.0, 1.0, 1.0] }, // Will be updated based on dark mode
      };

      // Dark mode material (additive blending - white on black)
      particleMaterialDark = ctx.material(particleShaderCode, {
        vertexCount: 6,
        instances: NUM_PARTICLES,
        blend: "additive",
        uniforms: renderUniforms,
      });
      particleMaterialDark.storage("positions", positionBuffer);
      particleMaterialDark.storage("lifetimes", lifetimeBuffer);

      // Light mode material (alpha blending - black on white)
      particleMaterialLight = ctx.material(particleShaderCode, {
        vertexCount: 6,
        instances: NUM_PARTICLES,
        blend: "alpha",
        uniforms: renderUniforms,
      });
      particleMaterialLight.storage("positions", positionBuffer);
      particleMaterialLight.storage("lifetimes", lifetimeBuffer);

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

      // Create gradient pass - calculates SDF gradients from the SDF texture
      const gradientShaderCode = /* wgsl */ `
        struct GradientUniforms {
          sdfEpsilon: f32,
          triangleRadius: f32,
          shootLineStrength: f32,
          shootLineWidth: f32,
          offsetY: f32,
        }
        @group(1) @binding(0) var<uniform> u: GradientUniforms;
        @group(1) @binding(1) var sdfTexture: texture_2d<f32>;
        @group(1) @binding(2) var sdfSampler: sampler;

        // Calculate signed distance from point to line segment
        fn distToLineSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
          let pa = p - a;
          let ba = b - a;
          let t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          return length(pa - ba * t);
        }

        // Calculate projection parameter t (0 = at center, 1 = at vertex)
        fn projectOnLine(p: vec2f, a: vec2f, b: vec2f) -> f32 {
          let pa = p - a;
          let ba = b - a;
          return dot(pa, ba) / dot(ba, ba);
        }

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Get texture dimensions for proper pixel offset calculation
          let texSize = vec2f(textureDimensions(sdfTexture));
          let pixelSize = 1.0 / texSize;
          
          // Convert pixel coords to UV
          let uv = pos.xy / globals.resolution;
          
          // Convert UV to world space (matching the SDF pass coordinate system)
          let centered = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
          let worldPos = centered * vec2f(globals.aspect * 5.0, 5.0) - vec2f(0.0, u.offsetY);
          
          // Sample SDF at center
          let sdfCenter = textureSample(sdfTexture, sdfSampler, uv).r;
          
          // Sample SDF at offset positions using world-space epsilon
          // The SDF texture covers world space [-aspect*5, aspect*5] x [-5, 5]
          // So we need to convert world-space epsilon to UV-space offset
          let worldToUvScaleX = 0.5 / (globals.aspect * 5.0);
          let worldToUvScaleY = 0.5 / 5.0;
          let uvEpsilonX = u.sdfEpsilon * worldToUvScaleX;
          let uvEpsilonY = u.sdfEpsilon * worldToUvScaleY;
          
          let sdfRight = textureSample(sdfTexture, sdfSampler, uv + vec2f(uvEpsilonX, 0.0)).r;
          let sdfTop = textureSample(sdfTexture, sdfSampler, uv + vec2f(0.0, -uvEpsilonY)).r; // Negative because UV Y is flipped
          
          // Calculate gradients
          let sdfSign = sign(sdfCenter);
          var gradX = (sdfRight - sdfCenter) / u.sdfEpsilon;
          gradX *= -sdfSign;
          var gradY = (sdfTop - sdfCenter) / u.sdfEpsilon;
          gradY *= -sdfSign;
          
          // ============================================================
          // SHOOT LINE: infinite line through center and bottom-right vertex
          // Particles are pushed OUTWARD from center in both directions
          // ============================================================
          // Triangle geometry (equilateral, pointing up, IQ SDF convention)
          // Note: animatedSdf uses (r + 0.7) as the effective radius
          let k = sqrt(3.0);
          let r = u.triangleRadius + 0.7; // Match the actual triangle size in animatedSdf
          
          // The triangle center is at (0, 0) in the SDF coordinate space (worldPos)
          let triangleCenter = vec2f(0.0, 0.0);
          
          // Bottom-right vertex (using effective radius)
          let bottomRightVertex = vec2f(r, -r / k);
          
          // Direction from center to vertex
          let toVertex = normalize(bottomRightVertex - triangleCenter);
          
          // Create an infinite line by extending far in both directions
          let lineStart = triangleCenter - toVertex * 20.0;
          let lineEnd = triangleCenter + toVertex * 20.0;
          
          // Calculate distance from current world position to the infinite line
          let distToLine = distToLineSegment(worldPos, lineStart, lineEnd);
          
          // Calculate which side of center we're on using projection
          // t > 0 means toward vertex (bottom-right), t < 0 means opposite side (top-left)
          let t = projectOnLine(worldPos, triangleCenter, lineEnd);
          
          // Determine shoot direction based on which side of center
          // Positive t (vertex side): shoot toward vertex (outward)
          // Negative t (opposite side): shoot away from vertex (outward)
          let shootDir = -select(-toVertex, toVertex, t > 0.12);
          
          // Line influence based on distance only (affects entire line)
          let lineInfluence = smoothstep(u.shootLineWidth, 0.0, distToLine) 
                           * u.shootLineStrength;
          
          // Blend the shoot direction into the gradient
          // Particles are pushed outward from center in both directions
          gradX = mix(gradX, shootDir.x * 3.0, lineInfluence);
          gradY = mix(gradY, shootDir.y * 3.0, lineInfluence);
          
          // Encode SDF sign in B channel: 0.0 for negative, 1.0 for positive
          // For the shoot line, force positive (outside) to push particles outward
          var sdfSignEncoded = 0.5 + 0.5 * sign(sdfCenter);
          sdfSignEncoded = mix(sdfSignEncoded, 1.0, lineInfluence); // Force positive on shoot line
          
          // Output: R=gradX, G=gradY, B=sdfSign encoded
          return vec4f(gradX, gradY, sdfSignEncoded, 1.0);
        }
      `;

      const gradientUniforms = {
        sdfEpsilon: { value: SDF_EPSILON },
        triangleRadius: { value: TRIANGLE_RADIUS },
        shootLineStrength: { value: 1.0 },
        shootLineWidth: { value: SHOOT_LINE_WIDTH },
        offsetY: { value: PARTICLE_OFFSET_Y },
        sdfTexture: { value: sdfTarget!.texture },
        sdfSampler: { value: sdfNearestSampler },
      };

      gradientPass = ctx.pass(gradientShaderCode, {
        uniforms: gradientUniforms,
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

      // Create gradient texture debug pass - visualizes the precomputed gradient texture
      // This pass samples the gradient texture using the SAME coordinate transform that particles use,
      // so the visualization aligns with where particles actually sample
      const gradientTextureDebugShaderCode = /* wgsl */ `
        struct GradientDebugUniforms {
          offsetY: f32,
        }
        @group(1) @binding(0) var<uniform> u: GradientDebugUniforms;
        @group(1) @binding(1) var gradientTexture: texture_2d<f32>;
        @group(1) @binding(2) var gradientSampler: sampler;

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert screen position to clip space [-1, 1]
          let screenUV = pos.xy / globals.resolution;
          let clipPos = screenUV * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
          
          // Convert clip position to world position (inverse of particle rendering)
          // Particle rendering does: clipPos = (worldPos + offset) / scale
          // So: worldPos = clipPos * scale - offset
          let scale = vec2f(globals.aspect * 5.0, 5.0);
          let worldPos = clipPos * scale - vec2f(0.0, u.offsetY);
          
          // Now sample the gradient at where a particle at this world position would sample
          // Particle sampling does: adjustedPos = worldPos + offset, then converts to UV
          let adjustedPos = worldPos + vec2f(0.0, u.offsetY);
          let ndc = adjustedPos / scale;
          let sampleUV = ndc * vec2f(0.5, -0.5) + 0.5;
          
          let sample = textureSample(gradientTexture, gradientSampler, sampleUV);
          let gradX = sample.r;
          let gradY = sample.g;
          let sdfSignEncoded = sample.b;
          
          // Decode SDF sign: B channel is 0.5 + 0.5 * sign
          let inside = sdfSignEncoded < 0.5;
          
          // Visualize gradient magnitude
          let gradMagnitude = length(vec2f(gradX, gradY));
          let normalizedMag = 1.0 - exp(-gradMagnitude * 2.0);
          
          // Color: gradient direction mapped to hue, magnitude to brightness
          // Red = +X, Green = +Y, Blue = -X, Yellow = -Y (approximate)
          let gradDir = normalize(vec2f(gradX, gradY) + 0.0001);
          
          // Map gradient direction to color
          var color = vec3f(
            gradDir.x * 0.5 + 0.5,  // Red for +X
            gradDir.y * 0.5 + 0.5,  // Green for +Y
            0.5 - gradDir.x * 0.25 - gradDir.y * 0.25  // Blue complement
          );
          
          // Modulate by magnitude
          color = color * normalizedMag;
          
          // Tint based on inside/outside (blue tint inside, red tint outside)
          if (inside) {
            color = color * vec3f(0.7, 0.8, 1.2);
          } else {
            color = color * vec3f(1.2, 0.9, 0.7);
          }

          return vec4f(color, 1.0);
        }
      `;

      const gradientTextureDebugUniforms = {
        offsetY: { value: PARTICLE_OFFSET_Y },
        gradientTexture: { value: gradientTarget!.texture },
        gradientSampler: { value: sdfSampler }, // Use linear sampler for smooth visualization
      };

      gradientTextureDebugPass = ctx.pass(gradientTextureDebugShaderCode, {
        uniforms: gradientTextureDebugUniforms,
      });

      // Create radial/zoom chromatic aberration postprocessing pass
      const chromaticShaderCode = /* wgsl */ `
        struct ChromaticUniforms {
          maxOffset: f32,
          angle: f32,
          samples: f32,
          useZoom: f32,
        }
        @group(1) @binding(0) var<uniform> u: ChromaticUniforms;
        @group(1) @binding(1) var inputTex: texture_2d<f32>;
        @group(1) @binding(2) var inputSampler: sampler;

        ${BLUR_CALCULATION_WGSL}

        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          // Convert to UV coordinates
          let uv = pos.xy / globals.resolution;
          
          // Use the angle-based calculation for intensity
          let chromaticOffset = calculateBlurSize(uv, u.maxOffset, u.angle);
          
          // Calculate position from center in aspect-corrected space
          let center = vec2f(0.5, 0.5);
          let fromCenter = uv - center;
          // Correct for aspect ratio: scale X by aspect to make circles circular
          let fromCenterCorrected = vec2f(fromCenter.x * globals.aspect, fromCenter.y);
          let distFromCenter = length(fromCenterCorrected);
          
          // Radial direction (for zoom blur): points outward from center
          let radialCorrected = select(vec2f(0.0, 1.0), fromCenterCorrected / distFromCenter, distFromCenter > 0.001);
          
          // Tangent direction (for radial blur): perpendicular to radial, rotates around center
          let tangentCorrected = vec2f(-radialCorrected.y, radialCorrected.x);
          
          // Choose direction based on mode
          let dirCorrected = select(tangentCorrected, radialCorrected, u.useZoom > 0.5);
          
          // Convert direction back to UV space (un-correct the aspect ratio for X)
          let sampleDir = vec2f(dirCorrected.x / globals.aspect, dirCorrected.y);
          
          // Multisample along chosen direction
          let sampleCount = i32(u.samples);
          var r = 0.0;
          var g = 0.0;
          var b = 0.0;
          
          for (var i = 0; i < sampleCount; i++) {
            // Distribute samples from -1 to +1 along direction
            let t = (f32(i) + 0.5) / u.samples * 2.0 - 1.0;
            
            // Sample offset along chosen direction
            let sampleOffset = sampleDir * chromaticOffset * t;
            let sampleUV = uv + sampleOffset;
            let sampledColor = textureSample(inputTex, inputSampler, sampleUV).rgb;
            
            // Weight channels based on sample position
            // Red weighted toward +t, Blue weighted toward -t, Green in center
            let redWeight = smoothstep(-1.0, 1.0, t);
            let blueWeight = smoothstep(1.0, -1.0, t);
            let greenWeight = 1.0 - abs(t);
            
            r += sampledColor.r * redWeight;
            g += sampledColor.g * greenWeight;
            b += sampledColor.b * blueWeight;
          }
          
          // Normalize by total weights
          let totalRedWeight = u.samples * 0.5;
          let totalGreenWeight = u.samples * 0.5;
          let totalBlueWeight = u.samples * 0.5;
          
          r /= totalRedWeight;
          g /= totalGreenWeight;
          b /= totalBlueWeight;
          
          return vec4f(r, g, b, 1.0);
        }
      `;

      const chromaticUniforms = {
        inputTex: { value: renderTarget.texture },
        inputSampler: { value: blurSampler },
        maxOffset: { value: CHROMATIC_MAX_OFFSET },
        angle: { value: 0 }, // Will be updated in render loop
        samples: { value: 8 }, // Number of samples
        useZoom: { value: 0.0 }, // 0 = radial blur, 1 = zoom blur
      };

      blurPass = ctx.pass(chromaticShaderCode, {
        uniforms: chromaticUniforms,
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
          
          // Add white lines at 0 and 1 boundaries
          let edgeThickness = 0.01;
          let edge0 = smoothstep(edgeThickness, 0.0, normalized);
          let edge1 = smoothstep(1.0 - edgeThickness, 1.0, normalized);
          color = mix(color, vec3f(1.0), max(edge0, edge1));
          
          return vec4f(color, 1.0);
        }
      `;

      const blurDebugUniforms = {
        maxBlurSize: { value: CHROMATIC_MAX_OFFSET },
        angle: { value: (chromaticAngleRef.current * Math.PI) / 180 }, // Convert degrees to radians
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
            // Resize the postprocessing render target to match canvas size
            renderTarget.resize(width, height);
            // Texture references remain valid after resize - no need to update uniforms!
          }
        }
      });
      resizeObserver.observe(canvasRef.current);

      // Render loop
      let lastTime = performance.now();
      let totalTime = 0;

      // Mouse velocity tracking (calculated per frame)
      let prevMouseX = 0;
      let prevMouseY = 0;
      let mouseVelocity = 0;
      let mouseDirX = 0;
      let mouseDirY = 0;

      function frame() {
        if (disposed || !ctx || !canvasRef.current) return;

        const now = performance.now();
        const deltaTime = Math.min((now - lastTime) / 1000, 0.07);
        lastTime = now;
        totalTime += deltaTime;

        // Calculate mouse velocity and direction from position delta
        const currentMouseX = mousePositionRef.current.x;
        const currentMouseY = mousePositionRef.current.y;
        const dx = currentMouseX - prevMouseX;
        const dy = currentMouseY - prevMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (deltaTime > 0) {
          const speed = dist / deltaTime;
          // Smooth velocity with exponential decay
          mouseVelocity = mouseVelocity * 0.8 + speed * 0.2;

          // Update direction only if there's meaningful movement
          if (dist > 0.001) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            mouseDirX = mouseDirX * 0.8 + dirX * 0.2;
            mouseDirY = mouseDirY * 0.8 + dirY * 0.2;
          } else {
            // Decay direction when not moving
            mouseDirX *= 0.95;
            mouseDirY *= 0.95;
          }
        }

        prevMouseX = currentMouseX;
        prevMouseY = currentMouseY;

        // Render SDF texture only once per second OR when size changed
        // This saves GPU cycles since the SDF animates slowly
        const timeSinceLastSdfUpdate = totalTime - lastSdfUpdateTime;
        const shouldUpdateSdf =
          needsSdfUpdate || timeSinceLastSdfUpdate >= SDF_UPDATE_INTERVAL;

        if (sdfTarget && gradientTarget && shouldUpdateSdf) {
          sdfUniforms.time.value = totalTime;
          sdfUniforms.focused.value = focusedRef.current;

          // Step 1: Render SDF to sdfTarget
          ctx.setTarget(sdfTarget);
          sdfPass.draw();

          // Step 2: Render gradient pass from SDF texture to gradientTarget
          ctx.setTarget(gradientTarget);
          gradientPass.draw();

          lastSdfUpdateTime = totalTime;
          needsSdfUpdate = false;
        }

        // Update compute uniforms
        computeUniforms.deltaTime.value = deltaTime;
        computeUniforms.time.value = totalTime;
        computeUniforms.focused.value = focusedRef.current;

        // Update mouse uniforms
        computeUniforms.mouseX.value = currentMouseX;
        computeUniforms.mouseY.value = currentMouseY;
        computeUniforms.mouseDirX.value = mouseDirX;
        computeUniforms.mouseDirY.value = mouseDirY;
        computeUniforms.mouseRadius.value = mouseRadiusRef.current;

        // Scale force based on mouse velocity (0.5 to 50.0 range)
        // Velocity of ~50 units/sec = full force, 0 = min force
        const velocityFactor = Math.min(mouseVelocity / 50, 1);
        const scaledForce =
          mouseForceRef.current +
          velocityFactor * (50.0 - mouseForceRef.current);
        computeUniforms.mouseForce.value = scaledForce;

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

        // Update dark/light mode
        const isDark = darkModeRef.current;
        const clearColor: [number, number, number, number] = isDark
          ? [0, 0, 0, 1]
          : [1, 1, 1, 1];
        renderUniforms.particleColor.value = isDark
          ? [1.0, 1.0, 1.0]
          : [0.0, 0.0, 0.0];

        // Update chromatic aberration uniforms
        const angleRadians = (chromaticAngleRef.current * Math.PI) / 180;
        chromaticUniforms.angle.value = angleRadians;
        chromaticUniforms.useZoom.value = useZoomBlurRef.current ? 1.0 : 0.0;
        blurDebugUniforms.angle.value = angleRadians;
        renderUniforms.blurAngle.value = angleRadians;

        // Determine if postprocessing is enabled based on render target selection
        const isPostprocessingTarget = renderTargetRef.current === "final";
        renderUniforms.postprocessingEnabled.value = isPostprocessingTarget
          ? 1.0
          : 0.0;

        // Render based on selected render target
        const currentTarget = renderTargetRef.current;

        // Select particle material based on dark/light mode
        const particleMaterial = isDark
          ? particleMaterialDark
          : particleMaterialLight;

        switch (currentTarget) {
          case "final":
            // Final with postprocessing: render particles to target, then apply blur
            ctx.setTarget(renderTarget);
            ctx.autoClear = false;
            ctx.clear(renderTarget, clearColor);
            particleMaterial.draw();
            ctx.setTarget(null);
            blurPass.draw();
            ctx.autoClear = true;
            break;

          case "final-no-post":
            ctx.autoClear = false;
            // Final without postprocessing: render particles directly to canvas
            ctx.setTarget(null);
            ctx.clear(null, clearColor);
            particleMaterial.draw();
            ctx.autoClear = true;
            break;

          case "sdf-texture":
            // SDF Texture: visualize the precomputed SDF texture with particles overlay
            ctx.setTarget(null);
            ctx.clear();
            ctx.autoClear = false;
            sdfTextureDebugPass.draw();
            particleMaterial.draw();
            ctx.autoClear = true;
            break;

          case "gradient-texture":
            // Gradient Texture: visualize the precomputed gradient texture with particles overlay
            ctx.setTarget(null);
            ctx.clear();
            ctx.autoClear = false;
            gradientTextureDebugPass.draw();
            particleMaterial.draw();
            ctx.autoClear = true;
            break;

          case "blur-size":
            // Blur Size: visualize blur size calculation
            ctx.setTarget(null);
            blurDebugPass.draw();
            break;
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
        resizeObserver.disconnect();
      }
      // Remove mouse event listener
      if (canvas) {
        window.removeEventListener("mousemove", handleMouseMove);
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
