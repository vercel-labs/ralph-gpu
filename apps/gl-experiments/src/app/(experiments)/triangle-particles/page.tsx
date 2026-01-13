'use client'

import { useEffect, useRef } from 'react'
import { gl, GLContext, PingPongTarget, RenderTarget } from 'ralph-gl'

// Particle system constants
const NUM_PARTICLES = 12000
const MAX_LIFETIME = 20
const TRIANGLE_RADIUS = 3
const VELOCITY_SCALE = 0.04
const POSITION_JITTER = 0.03
const INITIAL_VELOCITY_JITTER = 0.4
const SDF_EPSILON = 0.0001
const FORCE_STRENGTH = 0.13
const VELOCITY_DAMPING = 0.99
const POINT_SIZE = 0.3
const FADE_DURATION = MAX_LIFETIME * 0.4

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
  const focusedRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let ctx: GLContext
    let animationId: number
    let disposed = false

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

        // Create ping-pong targets for simulation (float textures)
        const posVelPingPong = ctx.pingPong(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
        })
        
        const lifetimePingPong = ctx.pingPong(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
        })
        
        // Create original position texture (doesn't change)
        const originalPosTexture = ctx.target(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
          wrap: 'clamp',
        })

        // Initialize textures with data using a simple copy pass
        const initPass = ctx.pass(`#version 300 es
precision highp float;
out vec4 fragColor;
uniform sampler2D u_data;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(${TEXTURE_SIZE}.0);
  fragColor = texture(u_data, uv);
}`, {
          uniforms: {
            u_data: { value: null as any },
          },
        })

        // Create temporary texture to upload initial data
        const tempTexture = ctx.target(TEXTURE_SIZE, TEXTURE_SIZE, {
          format: 'rgba32f',
          filter: 'nearest',
        })
        
        // Upload data to GPU (we need to write the data to the texture)
        const gl2 = ctx.gl
        gl2.bindTexture(gl2.TEXTURE_2D, tempTexture.texture)
        gl2.texSubImage2D(
          gl2.TEXTURE_2D, 0, 0, 0,
          TEXTURE_SIZE, TEXTURE_SIZE,
          gl2.RGBA, gl2.FLOAT, posVelData
        )
        
        // Copy to ping-pong buffers
        ctx.setTarget(posVelPingPong.write)
        initPass.setUniform('u_data', tempTexture).draw()
        posVelPingPong.swap()
        
        gl2.bindTexture(gl2.TEXTURE_2D, tempTexture.texture)
        gl2.texSubImage2D(
          gl2.TEXTURE_2D, 0, 0, 0,
          TEXTURE_SIZE, TEXTURE_SIZE,
          gl2.RGBA, gl2.FLOAT, lifetimeData
        )
        
        ctx.setTarget(lifetimePingPong.write)
        initPass.setUniform('u_data', tempTexture).draw()
        lifetimePingPong.swap()
        
        gl2.bindTexture(gl2.TEXTURE_2D, tempTexture.texture)
        gl2.texSubImage2D(
          gl2.TEXTURE_2D, 0, 0, 0,
          TEXTURE_SIZE, TEXTURE_SIZE,
          gl2.RGBA, gl2.FLOAT, originalPosData
        )
        
        ctx.setTarget(originalPosTexture)
        initPass.setUniform('u_data', tempTexture).draw()
        
        tempTexture.dispose()

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
            u_posVel: { value: posVelPingPong.read },
            u_lifetime: { value: lifetimePingPong.read },
            u_originalPos: { value: originalPosTexture },
            u_deltaTime: { value: 0.016 },
            u_time: { value: 0.0 },
            u_focused: { value: 0.0 },
            u_textureSize: { value: TEXTURE_SIZE },
          },
        })
        
        const lifetimePass = ctx.pass(lifetimeUpdateShader, {
          uniforms: {
            u_lifetime: { value: lifetimePingPong.read },
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

out vec2 v_uv;
out float v_life;
out float v_alpha;

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
  
  // Quad vertices
  vec2 corners[6] = vec2[6](
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  
  int vertexId = gl_VertexID % 6;
  vec2 corner = corners[vertexId];
  
  // Calculate aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  
  // Calculate particle size in clip space
  float particleSize = u_pointSize * 0.01;
  vec2 offset = corner * vec2(particleSize / aspect, particleSize);
  
  // Transform to clip space
  vec2 clipPos = pos / vec2(aspect * 5.0, 5.0) + offset;
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  
  // Pass data to fragment shader
  v_uv = corner * 0.5 + 0.5;
  v_life = life;
  
  // Calculate lifetime fade
  v_alpha = 1.0 - smoothstep(u_fadeStart, u_fadeEnd, life);
}
`

        const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
in float v_life;
in float v_alpha;

out vec4 fragColor;

void main() {
  // Create circular particles
  vec2 center = vec2(0.5);
  float dist = length(v_uv - center);
  
  if (dist > 0.5) {
    discard;
  }
  
  // Smooth edge for anti-aliasing
  float edgeSoftness = smoothstep(0.5, 0.3, dist);
  
  float alpha = v_alpha * edgeSoftness * 0.4;
  
  fragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`

        const material = ctx.material(vertexShader, fragmentShader, {
          vertexCount: 6,
          instances: NUM_PARTICLES,
          blend: 'additive',
          uniforms: {
            u_posVel: { value: posVelPingPong.read },
            u_lifetime: { value: lifetimePingPong.read },
            u_pointSize: { value: POINT_SIZE },
            u_textureSize: { value: TEXTURE_SIZE },
            u_fadeStart: { value: MAX_LIFETIME - FADE_DURATION },
            u_fadeEnd: { value: MAX_LIFETIME },
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
          simulationPass.setUniform('u_deltaTime', deltaTime)
          simulationPass.setUniform('u_time', totalTime)
          simulationPass.setUniform('u_focused', focusedRef.current)
          simulationPass.setUniform('u_posVel', posVelPingPong.read)
          simulationPass.setUniform('u_lifetime', lifetimePingPong.read)
          
          lifetimePass.setUniform('u_deltaTime', deltaTime)
          lifetimePass.setUniform('u_lifetime', lifetimePingPong.read)

          // Run simulation (write to write buffers)
          ctx.setTarget(posVelPingPong.write)
          simulationPass.draw()
          
          ctx.setTarget(lifetimePingPong.write)
          lifetimePass.draw()
          
          // Swap buffers
          posVelPingPong.swap()
          lifetimePingPong.swap()

          // Update render uniforms
          material.set('u_posVel', posVelPingPong.read)
          material.set('u_lifetime', lifetimePingPong.read)

          // Render particles to screen
          ctx.setTarget(null)
          ctx.clear([0, 0, 0, 1])
          material.draw()

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
