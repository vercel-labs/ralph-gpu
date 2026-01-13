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
const MAX_LIFETIME = 20;
const TRIANGLE_RADIUS = 3;
const VELOCITY_SCALE = 0.04;

// Initial spawn randomness
const POSITION_JITTER = 0.03; // Random offset from edge position
const INITIAL_VELOCITY_JITTER = 0.4; // Initial velocity randomness

// Physics
const SDF_EPSILON = 0.0001; // SDF gradient sampling distance
const FORCE_STRENGTH = 0.13; // How strongly SDF pushes particles
const VELOCITY_DAMPING = 0.99; // Velocity decay per frame (0-1)
const RESPAWN_VELOCITY_JITTER = INITIAL_VELOCITY_JITTER; // Velocity randomness on respawn

// Rendering
const POINT_SIZE = 0.3;
const FADE_DURATION = MAX_LIFETIME * 0.4; // How long the fade-out takes

// Postprocessing blur
const BLUR_MAX_SAMPLES = 32;
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
    let noisePos = vec3f(p.x * 1., p.y * 1., time * 0.01);
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
  const debugBlurRef = useRef(false);
  const blurAngleRef = useRef(26);

  // Leva controls
  useControls({
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
    let blurPass: Pass;
    let blurDebugPass: Pass;

    // Render targets
    let renderTarget: ReturnType<GPUContext["target"]>;

    // Custom sampler for blur pass
    let blurSampler: Sampler;

    // Ping-pong state
    let pingPong = 0;

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

      // Create storage buffers
      positionBuffer = ctx.storage(NUM_PARTICLES * 2 * 4); // 2 floats × 4 bytes
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
        }
        @group(1) @binding(0) var<uniform> u: ComputeUniforms;
        @group(1) @binding(1) var<storage, read_write> positions: array<f32>;
        @group(1) @binding(2) var<storage, read> originalPositions: array<f32>;
        @group(1) @binding(3) var<storage, read> velocityRead: array<f32>;
        @group(1) @binding(4) var<storage, read_write> velocityWrite: array<f32>;
        @group(1) @binding(5) var<storage, read_write> lifetimes: array<f32>;

        ${SDF_FUNCTIONS_WGSL}

        fn randomSigned(seed: f32) -> f32 {
          return hash(seed) * 2.0 - 1.0;
        }

        @compute @workgroup_size(64, 1, 1)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          if (index >= arrayLength(&positions) / 2u) { return; }

          let posIdx = index * 2u;
          
          // Read current position
          var posX = positions[posIdx];
          var posY = positions[posIdx + 1u];
          let pos = vec2f(posX, posY);

          // Read velocity
          var velX = velocityRead[posIdx];
          var velY = velocityRead[posIdx + 1u];

          // Read lifetime
          var life = lifetimes[index];

          // Calculate SDF gradient
          let sdfCenter = animatedSdf(pos, u.triangleRadius, u.time);
          let sdfRight = animatedSdf(pos + vec2f(u.sdfEpsilon, 0.0), u.triangleRadius, u.time);
          let sdfTop = animatedSdf(pos + vec2f(0.0, u.sdfEpsilon), u.triangleRadius, u.time);

          let gradX = (sdfRight - sdfCenter) / u.sdfEpsilon;
          let gradY = (sdfTop - sdfCenter) / u.sdfEpsilon;

          let sdfSign = sign(sdfCenter);

          // Apply force
          let forceX = gradX * u.forceStrength * sdfSign;
          let forceY = gradY * u.forceStrength * sdfSign;

          // Update velocity with damping
          velX *= u.velocityDamping;
          velY *= u.velocityDamping;
          velX += forceX;
          velY += forceY;

          // Update position
          posX += velX * u.deltaTime * u.velocityScale;
          posY += velY * u.deltaTime * u.velocityScale;

          // Update lifetime
          life += u.deltaTime;

          // Reset if lifetime exceeded
          if (life > u.maxLifetime) {
            posX = originalPositions[posIdx];
            posY = originalPositions[posIdx + 1u];
            
            // Random velocity on reset
            let seedX = f32(index) + u.time * 1000.0;
            let seedY = f32(index) + u.time * 1000.0 + 12345.0;
            velX = randomSigned(seedX) * ${RESPAWN_VELOCITY_JITTER};
            velY = randomSigned(seedY) * ${RESPAWN_VELOCITY_JITTER};
            
            life = 0.0;
          }

          // Write back
          positions[posIdx] = posX;
          positions[posIdx + 1u] = posY;
          velocityWrite[posIdx] = velX;
          velocityWrite[posIdx + 1u] = velY;
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
      };

      computeAtoB = ctx.compute(computeShaderCode, {
        uniforms: computeUniforms,
      });
      computeAtoB.storage("positions", positionBuffer);
      computeAtoB.storage("originalPositions", originalPositionBuffer);
      computeAtoB.storage("velocityRead", velocityBufferA);
      computeAtoB.storage("velocityWrite", velocityBufferB);
      computeAtoB.storage("lifetimes", lifetimeBuffer);

      computeBtoA = ctx.compute(computeShaderCode, {
        uniforms: computeUniforms,
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
        @group(1) @binding(1) var<storage, read> positions: array<f32>;
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
          // Read particle position
          let posIdx = iid * 2u;
          let x = positions[posIdx];
          let y = positions[posIdx + 1u];
          let life = lifetimes[iid];

          // Calculate SDF distance for bump effect
          let pos2d = vec2f(x, y);
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
          let worldX = x;
          let worldY = y + u.offsetY;
          let clipX = worldX / (aspect * 5.0) + localPos.x;
          let clipY = worldY / 5.0 + localPos.y;

          var out: VertexOutput;
          out.pos = vec4f(clipX, clipY, 0.0, 1.0);
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
        offsetY: { value: -0.95 },
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

      // Create custom sampler for blur postprocessing
      // Using linear filtering with clamp-to-edge for smooth blur sampling
      blurSampler = ctx.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
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
          
          // Accumulate samples using Vogel disk with chromatic aberration
          var colorR = vec3f(0.0);
          var colorG = vec3f(0.0);
          var colorB = vec3f(0.0);
          let sampleCount = i32(u.samples);
          
          for (var i = 0; i < sampleCount; i++) {
            let offset = vogelDisk(f32(i), u.samples, rotation);
            // Scale offset.x by aspect ratio to create circular disk instead of elliptical
            let aspectCorrectedOffset = vec2f(offset.x / globals.aspect, offset.y);
            
            // Chromatic aberration: shift samples based on horizontal offset
            // Right samples (+x) shift more for red, left samples (-x) shift more for blue
            let chromaticShift = offset.x * 0.2; // Adjust strength of chromatic aberration
            
            let sampleUV = uv + aspectCorrectedOffset * blurSize;
            let sampleR = sampleUV + vec2f(chromaticShift, 0.0) * blurSize;
            let sampleB = sampleUV - vec2f(chromaticShift, 0.0) * blurSize;
            
            colorR += textureSample(inputTex, inputSampler, sampleR).rgb * 1.2;
            colorG += textureSample(inputTex, inputSampler, sampleUV).rgb * 1.1;
            colorB += textureSample(inputTex, inputSampler, sampleB).rgb * 1.0;
          }
          
          // Average the samples and combine channels
          let avgR = colorR / u.samples;
          let avgG = colorG / u.samples;
          let avgB = colorB / u.samples;
          
          // Combine: take red from avgR, green from avgG, blue from avgB
          let finalColor = vec3f(avgR.r, avgG.g, avgB.b);
          
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

      // Render loop
      let lastTime = performance.now();
      let totalTime = 0;

      function frame() {
        if (disposed || !ctx || !canvasRef.current) return;

        const now = performance.now();
        const deltaTime = Math.min((now - lastTime) / 1000, 0.07);
        lastTime = now;
        totalTime += deltaTime;

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
          ctx.clear(null, [0, 0, 0, 1]);
          debugPass.draw();
        } else if (debugBlurRef.current) {
          // Blur Debug mode: visualize blur size calculation
          ctx.setTarget(null);
          ctx.clear(null, [0, 0, 0, 1]);
          blurDebugPass.draw();
        } else {
          // Normal mode: render particles to target, then apply blur
          // Step 1: Render particles to render target
          ctx.setTarget(renderTarget);
          ctx.clear(renderTarget, [0, 0, 0, 1]);
          particleMaterial.draw();

          // Step 2: Apply blur postprocessing to canvas
          ctx.setTarget(null);
          ctx.clear(null, [0, 0, 0, 1]);
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
