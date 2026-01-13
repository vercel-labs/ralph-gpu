'use client'

import { useEffect, useRef } from 'react'
import { GUI } from 'lil-gui'
import { gl, GLContext } from 'ralph-gl'

// Particle system constants
const NUM_PARTICLES = 12100
const MAX_LIFETIME = 20
const TRIANGLE_RADIUS = 3
const VELOCITY_SCALE = 0.04
const POSITION_JITTER = 0.03
const INITIAL_VELOCITY_JITTER = 0.4
const SDF_EPSILON = 0.0001
const FORCE_STRENGTH = 0.13
const VELOCITY_DAMPING = 0.99
const POINT_SIZE = 0.5
const FADE_DURATION = MAX_LIFETIME * 0.4

// Blur postprocessing
const BLUR_MAX_SAMPLES = 8
const BLUR_MAX_SIZE = 0.02

// Calculate texture size to fit all particles
// Each pixel stores one particle's data
const TEXTURE_SIZE = Math.ceil(Math.sqrt(NUM_PARTICLES))


// SDF functions (ported from WGSL to GLSL)
const SDF_FUNCTIONS = `
// Simple hash function for pseudo-random
float hash(float seed) {
  float s = fract(seed * 0.1031);
  float s2 = s * (s + 33.33);
  return fract(s2 * (s2 + s2));
}

// Simple 3D noise approximation
float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(hash(i.x + i.y * 57.0 + i.z * 113.0),
        hash(i.x + 1.0 + i.y * 57.0 + i.z * 113.0), u.x),
    mix(hash(i.x + (i.y + 1.0) * 57.0 + i.z * 113.0),
        hash(i.x + 1.0 + (i.y + 1.0) * 57.0 + i.z * 113.0), u.x),
    u.y
  );
}

// Triangle SDF (Inigo Quilez)
float triangleSdf(vec2 p, float r) {
  float k = sqrt(3.0);
  float px = abs(p.x) - r;
  float py = p.y + r / k;
  
  if (px + k * py > 0.0) {
    float newPx = (px - k * py) / 2.0;
    float newPy = (-k * px - py) / 2.0;
    px = newPx;
    py = newPy;
  }
  
  px -= clamp(px, -2.0 * r, 0.0);
  float len = sqrt(px * px + py * py);
  return -len * sign(py) - 0.7;
}

float animatedSdf(vec2 p, float r, float time, float focused) {
  float sdf = triangleSdf(p, r);
  
  // Noise-based force modulation
  vec3 noisePos = vec3(p.x * 1.0, p.y * 1.0, time * 0.01);
  float noiseSample = noise3d(noisePos) * 2.0;
  float noiseScale = step(sdf, 0.0) * (1.0 - focused);
  
  return sdf - noiseSample * noiseScale;
}
`

// Helper: Generate random point on triangle edge
function randomPointOnTriangleEdge(radius: number): [number, number] {
  const edge = Math.floor(Math.random() * 3)
  const t = Math.random()

  const k = Math.sqrt(3.0)
  const vertices: [number, number][] = [
    [0, (2 * radius) / k],
    [-radius, -radius / k],
    [radius, -radius / k],
  ]

  const v1 = vertices[edge]
  const v2 = vertices[(edge + 1) % 3]

  return [v1[0] + (v2[0] - v1[0]) * t, v1[1] + (v2[1] - v1[1]) * t]
}

export default function TriangleParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let ctx: GLContext
    let animationId: number
    let disposed = false
    let gui: GUI | null = null

    async function init() {
      if (!canvas) return

      try {
        // Initialize context
        ctx = await gl.init(canvas, {
          autoResize: true,
          alpha: false,
        })

        if (disposed) {
          ctx.dispose()
          return
        }
        
        // Setup lil-gui controls
        gui = new GUI({ title: 'Triangle Particles' })
        
        const controls = {
          debugSdf: false,
          debugBlur: false,
          blurAngle: -37,
          bumpIntensity: 0,
          bumpProgress: 0,
          focused: 0,
        }
        
        const debugFolder = gui.addFolder('Debug')
        debugFolder.add(controls, 'debugSdf').name('Debug SDF')
        debugFolder.add(controls, 'debugBlur').name('Debug Blur')
        
        const blurFolder = gui.addFolder('Blur')
        blurFolder.add(controls, 'blurAngle', -180, 180, 1).name('Angle (deg)')
        
        const bumpFolder = gui.addFolder('Bump Effect')
        bumpFolder.add(controls, 'bumpIntensity', 0, 1, 0.01).name('Intensity')
        bumpFolder.add(controls, 'bumpProgress', 0, 5, 0.01).name('Progress')
        bumpFolder.add(controls, 'focused', 0, 1, 1).name('Focused')
        
        blurFolder.open()
        bumpFolder.open()

        // ========================================================================
        // Initialize particle data in textures
        // ========================================================================
        
        // Create initial particle data arrays
        // Store: position.xy + velocity.xy in one texture
        const posVelData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
        const originalPosData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
        const lifetimeData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
        
        for (let i = 0; i < NUM_PARTICLES; i++) {
          const [x, y] = randomPointOnTriangleEdge(TRIANGLE_RADIUS * 1.2)
          
          const offsetX = (Math.random() - 0.5) * POSITION_JITTER
          const offsetY = (Math.random() - 0.5) * POSITION_JITTER
          
          const posX = x + offsetX
          const posY = y + offsetY
          const velX = (Math.random() - 0.5) * INITIAL_VELOCITY_JITTER
          const velY = (Math.random() - 0.5) * INITIAL_VELOCITY_JITTER
          
          posVelData[i * 4 + 0] = posX
          posVelData[i * 4 + 1] = posY
          posVelData[i * 4 + 2] = velX
          posVelData[i * 4 + 3] = velY
          
          originalPosData[i * 4 + 0] = posX
          originalPosData[i * 4 + 1] = posY
          originalPosData[i * 4 + 2] = velX
          originalPosData[i * 4 + 3] = velY
          
          lifetimeData[i * 4 + 0] = Math.random() * MAX_LIFETIME
        }

        // Create ping-pong targets with initial data
        const posVelPingPong = ctx.pingPong(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
          data: posVelData,
        })
        
        const lifetimePingPong = ctx.pingPong(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
          data: lifetimeData,
        })
        
        // Create original position texture with initial data
        const originalPosTexture = ctx.target(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
          data: originalPosData,
        })

        // ========================================================================
        // Create simulation pass (replaces compute shader)
        // ========================================================================
        
        const simulationShader = `#version 300 es
precision highp float;

uniform sampler2D u_posVel;
uniform sampler2D u_lifetime;
uniform sampler2D u_originalPos;
uniform float u_deltaTime;
uniform float u_time;
uniform float u_focused;
uniform float u_textureSize;

out vec4 fragColor;

${SDF_FUNCTIONS}

float randomSigned(float seed) {
  return hash(seed) * 2.0 - 1.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_textureSize;
  
  // Read current state
  vec4 posVel = texture(u_posVel, uv);
  vec2 pos = posVel.xy;
  vec2 vel = posVel.zw;
  
  float life = texture(u_lifetime, uv).x;
  vec4 originalData = texture(u_originalPos, uv);
  vec2 originalPos = originalData.xy;
  
  // Calculate SDF gradient
  float sdfCenter = animatedSdf(pos, ${TRIANGLE_RADIUS.toFixed(1)}, u_time, u_focused);
  float sdfRight = animatedSdf(pos + vec2(${SDF_EPSILON}, 0.0), ${TRIANGLE_RADIUS.toFixed(1)}, u_time, u_focused);
  float sdfTop = animatedSdf(pos + vec2(0.0, ${SDF_EPSILON}), ${TRIANGLE_RADIUS.toFixed(1)}, u_time, u_focused);
  
  float gradX = (sdfRight - sdfCenter) / ${SDF_EPSILON};
  float gradY = (sdfTop - sdfCenter) / ${SDF_EPSILON};
  float sdfSign = sign(sdfCenter);
  
  // Apply force
  vec2 force = vec2(gradX, gradY) * ${FORCE_STRENGTH} * sdfSign;
  
  // Update velocity with damping
  vel *= ${VELOCITY_DAMPING};
  vel += force;
  
  // Update position
  pos += vel * u_deltaTime * ${VELOCITY_SCALE};
  
  // Update lifetime
  life += u_deltaTime;
  
  // Reset if lifetime exceeded
  if (life > ${MAX_LIFETIME.toFixed(1)}) {
    pos = originalPos;
    
    // Random velocity on reset
    float pixelIndex = gl_FragCoord.x + gl_FragCoord.y * u_textureSize;
    float seedX = pixelIndex + u_time * 1000.0;
    float seedY = pixelIndex + u_time * 1000.0 + 12345.0;
    vel.x = randomSigned(seedX) * ${INITIAL_VELOCITY_JITTER};
    vel.y = randomSigned(seedY) * ${INITIAL_VELOCITY_JITTER};
    
    life = 0.0;
  }
  
  // Write back
  fragColor = vec4(pos, vel);
}
`

        const lifetimeUpdateShader = `#version 300 es
precision highp float;

uniform sampler2D u_lifetime;
uniform float u_deltaTime;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / ${TEXTURE_SIZE.toFixed(1)};
  float life = texture(u_lifetime, uv).x;
  life += u_deltaTime;
  
  if (life > ${MAX_LIFETIME.toFixed(1)}) {
    life = 0.0;
  }
  
  fragColor = vec4(life, 0.0, 0.0, 0.0);
}
`

        const simulationPass = ctx.pass(simulationShader, {
          uniforms: {
            u_posVel: { value: posVelPingPong.read.texture },
            u_lifetime: { value: lifetimePingPong.read.texture },
            u_originalPos: { value: originalPosTexture.texture },
            u_deltaTime: { value: 0.016 },
            u_time: { value: 0.0 },
            u_focused: { value: 0.0 },
            u_textureSize: { value: TEXTURE_SIZE },
          },
        })
        
        const lifetimePass = ctx.pass(lifetimeUpdateShader, {
          uniforms: {
            u_lifetime: { value: lifetimePingPong.read.texture },
            u_deltaTime: { value: 0.016 },
          },
        })

        // ========================================================================
        // Create particle rendering material
        // ========================================================================
        
        const vertexShader = `#version 300 es
precision highp float;

uniform sampler2D u_posVel;
uniform sampler2D u_lifetime;
uniform vec2 u_resolution;
uniform float u_pointSize;
uniform float u_textureSize;
uniform float u_fadeStart;
uniform float u_fadeEnd;
uniform float u_triangleRadius;

out float v_life;
out float v_alpha;
out float v_sdfDist;

// Triangle SDF
float triangleSdf(vec2 p, float r) {
  float k = sqrt(3.0);
  float px = abs(p.x) - r;
  float py = p.y + r / k;
  
  if (px + k * py > 0.0) {
    float newPx = (px - k * py) / 2.0;
    float newPy = (-k * px - py) / 2.0;
    px = newPx;
    py = newPy;
  }
  
  px -= clamp(px, -2.0 * r, 0.0);
  float len = sqrt(px * px + py * py);
  return -len * sign(py) - 0.7;
}

void main() {
  // Calculate which particle this is
  int particleId = gl_InstanceID;
  
  // Calculate texture coordinates to sample particle data
  float x = float(particleId % int(u_textureSize));
  float y = float(particleId / int(u_textureSize));
  vec2 texCoord = (vec2(x, y) + 0.5) / u_textureSize;
  
  // Read particle data from textures
  vec4 posVel = texture(u_posVel, texCoord);
  vec2 pos = posVel.xy;
  float life = texture(u_lifetime, texCoord).x;
  
  // Calculate SDF distance for bump effect
  float sdf = triangleSdf(pos, u_triangleRadius);
  
  // Calculate aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  
  // Transform to clip space
  vec2 clipPos = pos / vec2(aspect * 5.0, 5.0);
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  
  // Set point size (in pixels)
  gl_PointSize = u_pointSize * 10.0;
  
  // Pass data to fragment shader
  v_life = life;
  v_sdfDist = abs(sdf);
  
  // Calculate lifetime fade
  v_alpha = 1.0 - smoothstep(u_fadeStart, u_fadeEnd, life);
}
`

        const fragmentShader = `#version 300 es
precision highp float;

in float v_life;
in float v_alpha;
in float v_sdfDist;

out vec4 fragColor;

uniform float u_bumpIntensity;
uniform float u_bumpProgress;

void main() {
  // Use gl_PointCoord for circular particles (0,0 to 1,1)
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  
  // Discard pixels outside circle
  if (dist > 0.5) {
    discard;
  }
  
  // Smooth edge for anti-aliasing
  float edgeSoftness = smoothstep(0.5, 0.3, dist);
  
  // Bump effect based on SDF distance
  float bumpDist = abs(v_sdfDist - u_bumpProgress);
  float bumpEffect = smoothstep(0.7, 0.0, bumpDist) * u_bumpIntensity;
  
  // Base opacity 0.4, bumped opacity 1.0
  float baseOpacity = 0.4;
  float finalOpacity = mix(baseOpacity, 1.0, bumpEffect);
  
  float alpha = v_alpha * finalOpacity * edgeSoftness;
  
  fragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`

        const material = ctx.material(vertexShader, fragmentShader, {
          vertexCount: 1,  // 1 vertex per particle (point primitive)
          instances: NUM_PARTICLES,
          topology: 'points',  // Use native point primitives
          transparent: true,
          uniforms: {
            u_posVel: { value: posVelPingPong.read.texture },
            u_lifetime: { value: lifetimePingPong.read.texture },
            u_pointSize: { value: POINT_SIZE },
            u_textureSize: { value: TEXTURE_SIZE },
            u_fadeStart: { value: MAX_LIFETIME - FADE_DURATION },
            u_fadeEnd: { value: MAX_LIFETIME },
            u_triangleRadius: { value: TRIANGLE_RADIUS },
            u_bumpIntensity: { value: 0.0 },
            u_bumpProgress: { value: 0.0 },
          },
        })

        // ========================================================================
        // Create render target for postprocessing
        // ========================================================================
        
        const renderTarget = ctx.target()

        // ========================================================================
        // Create blur postprocessing pass
        // ========================================================================
        
        const blurShader = `#version 300 es
precision highp float;

uniform sampler2D u_inputTex;
uniform vec2 u_resolution;
uniform float u_maxBlurSize;
uniform float u_samples;
uniform float u_angle;

out vec4 fragColor;

// Calculate blur size with diagonal split
float calculateBlurSize(vec2 uv, float maxBlurSize, float angleRadians) {
  // Distance from center (circular component)
  float centerDist = length(uv - 0.5) * sqrt(2.0);
  
  // Convert UV to centered coordinates
  vec2 centered = uv - 0.5;
  
  // Rotate the split line by the given angle
  float diagonalDist = cos(angleRadians) * centered.x + sin(angleRadians) * centered.y;
  
  // Smooth transition across the diagonal line
  float diagonalFactor = smoothstep(-0.1, 0.1, diagonalDist);
  
  // Multiply circular blur by diagonal factor
  return centerDist * maxBlurSize * diagonalFactor;
}

// Pixel hash for random rotation
float pixelHash(vec2 p) {
  uint px = uint(p.x);
  uint py = uint(p.y);
  uint n = px * 3u + py * 113u;
  n = (n << 13u) ^ n;
  n = n * (n * n * 15731u + 789221u) + 1376312589u;
  return float(n) * (1.0 / float(0xffffffffu));
}

// Vogel disk sampling pattern
vec2 vogelDisk(float sampleIndex, float samplesCount, float phi) {
  float goldenAngle = 2.399963;
  float r = sqrt(sampleIndex + 0.5) / sqrt(samplesCount);
  float theta = sampleIndex * goldenAngle + phi;
  return vec2(cos(theta), sin(theta)) * r;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  
  // Calculate blur size
  float blurSize = calculateBlurSize(uv, u_maxBlurSize, u_angle);
  
  // Random rotation per pixel
  float hash = pixelHash(gl_FragCoord.xy);
  float rotation = hash * 6.28318;
  
  // Accumulate samples with chromatic aberration
  vec3 colorR = vec3(0.0);
  vec3 colorG = vec3(0.0);
  vec3 colorB = vec3(0.0);
  int sampleCount = int(u_samples);
  
  for (int i = 0; i < sampleCount; i++) {
    vec2 offset = vogelDisk(float(i), u_samples, rotation);
    vec2 aspectCorrectedOffset = vec2(offset.x / aspect, offset.y);
    
    // Chromatic aberration
    float chromaticShift = offset.x * 0.2;
    
    vec2 sampleUV = uv + aspectCorrectedOffset * blurSize;
    vec2 sampleR = sampleUV + vec2(chromaticShift, 0.0) * blurSize;
    vec2 sampleB = sampleUV - vec2(chromaticShift, 0.0) * blurSize;
    
    colorR += texture(u_inputTex, sampleR).rgb * 1.2;
    colorG += texture(u_inputTex, sampleUV).rgb * 1.1;
    colorB += texture(u_inputTex, sampleB).rgb * 1.0;
  }
  
  // Average and combine channels
  vec3 avgR = colorR / u_samples;
  vec3 avgG = colorG / u_samples;
  vec3 avgB = colorB / u_samples;
  
  vec3 finalColor = vec3(avgR.r, avgG.g, avgB.b);
  
  fragColor = vec4(finalColor, 1.0);
}
`

        const blurPass = ctx.pass(blurShader, {
          uniforms: {
            u_inputTex: { value: renderTarget.texture },
            u_maxBlurSize: { value: BLUR_MAX_SIZE },
            u_samples: { value: BLUR_MAX_SAMPLES },
            u_angle: { value: 0 },
          },
        })

        // ========================================================================
        // Create debug visualization passes
        // ========================================================================
        
        // SDF debug pass
        const debugSdfShader = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_triangleRadius;
uniform float u_focused;

out vec4 fragColor;

${SDF_FUNCTIONS}

void main() {
  // Convert pixel coords to world space
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 centered = uv * vec2(2.0, -2.0) + vec2(-1.0, 1.0);
  vec2 worldPos = centered * vec2(aspect * 5.0, 5.0);
  
  // Sample the animated SDF
  float sdf = animatedSdf(worldPos, u_triangleRadius, u_time, u_focused);
  
  // Visualize: negative (inside) = blue, positive (outside) = red
  bool inside = sdf < 0.0;
  float dist = abs(sdf);
  float normalizedDist = 1.0 - exp(-dist * 0.5);
  
  vec3 color;
  if (inside) {
    color = vec3(0.0, 0.2, 0.8) * (1.0 - normalizedDist);
  } else {
    color = vec3(0.8, 0.2, 0.0) * (1.0 - normalizedDist);
  }
  
  // Add contour lines
  float contourFreq = 0.5;
  float contour = abs(fract(sdf * contourFreq) - 0.5) * 2.0;
  float contourLine = smoothstep(0.9, 1.0, contour);
  color = mix(color, vec3(1.0), contourLine * 0.3);
  
  // Highlight the zero crossing (edge)
  float edge = smoothstep(0.1, 0.0, abs(sdf));
  color = mix(color, vec3(1.0, 1.0, 1.0), edge);
  
  fragColor = vec4(color, 1.0);
}
`

        const debugSdfPass = ctx.pass(debugSdfShader, {
          uniforms: {
            u_time: { value: 0.0 },
            u_triangleRadius: { value: TRIANGLE_RADIUS },
            u_focused: { value: 0.0 },
          },
        })

        // Blur debug pass
        const blurDebugShader = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_maxBlurSize;
uniform float u_angle;

out vec4 fragColor;

// Calculate normalized blur amount (0 to 1)
float getBlurNormalized(vec2 uv, float maxBlurSize, float angleRadians) {
  float centerDist = length(uv - 0.5) * sqrt(2.0);
  vec2 centered = uv - 0.5;
  float diagonalDist = cos(angleRadians) * centered.x + sin(angleRadians) * centered.y;
  float diagonalFactor = smoothstep(-0.1, 0.1, diagonalDist);
  float blurSize = centerDist * maxBlurSize * diagonalFactor;
  return blurSize / maxBlurSize;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // Get normalized blur amount
  float normalized = getBlurNormalized(uv, u_maxBlurSize, u_angle);
  
  // Color scheme: Blue (no blur) → Red (max blur)
  vec3 color = vec3(normalized, 0.0, 1.0 - normalized);
  
  // Add grid lines to show blur size contours
  float gridFreq = 10.0;
  float grid = fract(normalized * gridFreq);
  float gridLine = smoothstep(0.05, 0.1, grid) * smoothstep(0.95, 0.9, grid);
  color = mix(vec3(1.0), color, gridLine);
  
  // Add a scale bar at the bottom
  if (uv.y > 0.9) {
    float barPos = uv.x;
    color = vec3(barPos, 0.0, 1.0 - barPos);
  }
  
  fragColor = vec4(color, 1.0);
}
`

        const blurDebugPass = ctx.pass(blurDebugShader, {
          uniforms: {
            u_maxBlurSize: { value: BLUR_MAX_SIZE },
            u_angle: { value: (controls.blurAngle * Math.PI) / 180 },
          },
        })

        // ========================================================================
        // Animation loop
        // ========================================================================
        
        let lastTime = performance.now()
        let totalTime = 0

        function animate() {
          if (disposed || !ctx) return

          const now = performance.now()
          const deltaTime = Math.min((now - lastTime) / 1000, 0.07)
          lastTime = now
          totalTime += deltaTime

          // Update simulation uniforms
          simulationPass.uniforms.u_deltaTime.value = deltaTime
          simulationPass.uniforms.u_time.value = totalTime
          simulationPass.uniforms.u_focused.value = controls.focused
          simulationPass.uniforms.u_posVel.value = posVelPingPong.read.texture
          simulationPass.uniforms.u_lifetime.value = lifetimePingPong.read.texture
          
          lifetimePass.uniforms.u_deltaTime.value = deltaTime
          lifetimePass.uniforms.u_lifetime.value = lifetimePingPong.read.texture

          // Run simulation (write to write buffers)
          ctx.setTarget(posVelPingPong.write)
          simulationPass.draw()
          
          ctx.setTarget(lifetimePingPong.write)
          lifetimePass.draw()
          
          // Swap buffers
          posVelPingPong.swap()
          lifetimePingPong.swap()

          // Update render uniforms
          material.uniforms.u_posVel.value = posVelPingPong.read.texture
          material.uniforms.u_lifetime.value = lifetimePingPong.read.texture
          material.uniforms.u_bumpIntensity.value = controls.bumpIntensity
          material.uniforms.u_bumpProgress.value = controls.bumpProgress

          // Update blur angle
          const angleRadians = (controls.blurAngle * Math.PI) / 180
          blurPass.uniforms.u_angle.value = angleRadians
          blurDebugPass.uniforms.u_angle.value = angleRadians

          // Update debug uniforms
          debugSdfPass.uniforms.u_time.value = totalTime
          debugSdfPass.uniforms.u_focused.value = controls.focused

          // Choose render mode based on debug flags
          if (controls.debugSdf) {
            // SDF Debug mode
            ctx.setTarget(null)
            ctx.clear([0, 0, 0, 1])
            debugSdfPass.draw()
          } else if (controls.debugBlur) {
            // Blur Debug mode
            ctx.setTarget(null)
            ctx.clear([0, 0, 0, 1])
            blurDebugPass.draw()
          } else {
            // Normal mode: particles → blur → canvas
            // Step 1: Render particles to offscreen target
            ctx.setTarget(renderTarget)
            ctx.clear([0, 0, 0, 1])
            material.draw()

            // Step 2: Apply blur to canvas
            ctx.setTarget(null)
            ctx.clear([0, 0, 0, 1])
            blurPass.draw()
          }

          animationId = requestAnimationFrame(animate)
        }

        animate()

      } catch (error) {
        console.error('Failed to initialize ralph-gl:', error)
      }
    }

    init()

    return () => {
      disposed = true
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      if (ctx?.dispose) {
        ctx.dispose()
      }
      if (gui) {
        gui.destroy()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}
