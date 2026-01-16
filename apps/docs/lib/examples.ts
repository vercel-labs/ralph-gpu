export interface Example {
  slug: string;
  title: string;
  description: string;
  shader?: string;  // WGSL shader for simple single-pass examples
  code: string;     // Full API code for display and execution
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
  // If true, execute the full code instead of extracting shader
  // Required for multi-pass examples (pingPong, render targets, etc.)
  executable?: boolean;
}

export const examples: Example[] = [
  {
    slug: 'gradient',
    title: 'Simple Gradient',
    description: 'The simplest possible shader — map UV coordinates to colors. This creates a gradient from black (bottom-left) to cyan (top-right).',
    shader: `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a fragment shader pass
const gradient = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\`);

// Render loop
function frame() {
  gradient.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: false,
  },
  {
    slug: 'wave',
    title: 'Animated Wave',
    description: 'A glowing sine wave with custom uniforms. The wave animates over time using globals.time.',
    shader: `
  struct Params { amplitude: f32, frequency: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let wave = sin(uv.x * u.frequency + globals.time * 2.0) * u.amplitude;
    let d = abs(uv.y - 0.5 - wave);
    let glow = 0.02 / d;
    return vec4f(u.color * glow, 1.0);
  }
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Define parameters
const params = {
  amplitude: 0.3,
  frequency: 8.0,
  color: [0.2, 0.8, 1.0]
};

// Create a fragment shader pass with uniforms
const wave = ctx.pass(\`
  struct Params { amplitude: f32, frequency: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let w = sin(uv.x * u.frequency + globals.time * 2.0) * u.amplitude;
    let d = abs(uv.y - 0.5 - w);
    let glow = 0.02 / d;
    return vec4f(u.color * glow, 1.0);
  }
\`, { uniforms: params });

// Render loop
function frame() {
  wave.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    uniforms: {
      amplitude: { value: 0.3 },
      frequency: { value: 8.0 },
      color: { value: [0.2, 0.8, 1.0] },
    },
    animated: true,
  },
  {
    slug: 'color-cycle',
    title: 'Time-Based Color Cycling',
    description: 'A hypnotic pattern that cycles through colors over time. Combines time, distance, and angle for a mesmerizing effect.',
    shader: `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let t = globals.time * 0.5;
    
    // Cycle through hues
    let r = sin(t) * 0.5 + 0.5;
    let g = sin(t + 2.094) * 0.5 + 0.5;
    let b = sin(t + 4.188) * 0.5 + 0.5;
    
    // Create radial pattern
    let center = uv - 0.5;
    let dist = length(center);
    let angle = atan2(center.y, center.x);
    let pattern = sin(dist * 20.0 - globals.time * 3.0 + angle * 3.0);
    
    let color = vec3f(r, g, b) * (pattern * 0.3 + 0.7);
    return vec4f(color, 1.0);
  }
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a fragment shader pass
const colorCycle = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let t = globals.time * 0.5;
    
    // Cycle through hues
    let r = sin(t) * 0.5 + 0.5;
    let g = sin(t + 2.094) * 0.5 + 0.5;
    let b = sin(t + 4.188) * 0.5 + 0.5;
    
    // Create radial pattern
    let center = uv - 0.5;
    let dist = length(center);
    let angle = atan2(center.y, center.x);
    let pattern = sin(dist * 20.0 - globals.time * 3.0 + angle * 3.0);
    
    let color = vec3f(r, g, b) * (pattern * 0.3 + 0.7);
    return vec4f(color, 1.0);
  }
\`);

// Render loop
function frame() {
  colorCycle.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'raymarching',
    title: 'Raymarching Sphere',
    description: 'A basic 3D sphere rendered using raymarching. This demonstrates how to create 3D shapes and lighting entirely within a fragment shader.',
    shader: `
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / min(globals.resolution.x, globals.resolution.y);
  
  // Camera
  let ro = vec3f(0.0, 0.0, -3.0);
  let rd = normalize(vec3f(uv, 1.0));
  
  // Raymarching
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = length(p) - 1.0; // sphere SDF
    if (d < 0.001) { break; }
    t += d;
  }
  
  // Shading
  let p = ro + rd * t;
  let n = normalize(p);
  let light = normalize(vec3f(1.0, 1.0, -1.0));
  let diff = max(dot(n, light), 0.0);
  
  let col = vec3f(0.2, 0.5, 1.0) * (diff * 0.8 + 0.2);
  
  // If we missed everything, return background
  if (t > 10.0) {
    return vec4f(0.1, 0.1, 0.15, 1.0);
  }
  
  return vec4f(col, 1.0);
}
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a raymarching pass
const raymarch = ctx.pass(\`
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / min(globals.resolution.x, globals.resolution.y);
  
  // Camera
  let ro = vec3f(0.0, 0.0, -3.0);
  let rd = normalize(vec3f(uv, 1.0));
  
  // Raymarching
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = length(p) - 1.0; // sphere SDF
    if (d < 0.001) { break; }
    t += d;
  }
  
  // Shading
  let p = ro + rd * t;
  let n = normalize(p);
  let light = normalize(vec3f(1.0, 1.0, -1.0));
  let diff = max(dot(n, light), 0.0);
  
  let col = vec3f(0.2, 0.5, 1.0) * (diff * 0.8 + 0.2);
  
  // If we missed everything, return background
  if (t > 10.0) {
    return vec4f(0.1, 0.1, 0.15, 1.0);
  }
  
  return vec4f(col, 1.0);
}
\`);

// Render loop
function frame() {
  raymarch.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'noise',
    title: 'Perlin-style Noise',
    description: 'Layered fractional Brownian motion (fBm) noise. This technique is fundamental for generating procedural textures, terrain, and natural-looking patterns.',
    shader: `
// Include a simple hash function and noise
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / globals.resolution;
  var n = 0.0;
  var amp = 0.5;
  var freq = 4.0;
  for (var i = 0; i < 5; i++) {
    n += amp * noise(uv * freq + globals.time * 0.5);
    amp *= 0.5;
    freq *= 2.0;
  }
  return vec4f(vec3f(n), 1.0);
}
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a noise pass
const noisePass = ctx.pass(\`
// Include a simple hash function and noise
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / globals.resolution;
  var n = 0.0;
  var amp = 0.5;
  var freq = 4.0;
  for (var i = 0; i < 5; i++) {
    n += amp * noise(uv * freq + globals.time * 0.5);
    amp *= 0.5;
    freq *= 2.0;
  }
  return vec4f(vec3f(n), 1.0);
}
\`);

// Render loop
function frame() {
  noisePass.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'metaballs',
    title: 'Metaballs',
    description: 'Organic-looking "blobs" that merge together based on an implicit surface. This effect uses a distance-based field and a threshold to create smooth blending.',
    shader: `
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / globals.resolution.y;
  
  // Ball positions (animated)
  let t = globals.time;
  let p1 = vec2f(sin(t) * 0.3, cos(t * 1.3) * 0.3);
  let p2 = vec2f(sin(t * 0.7 + 2.0) * 0.3, cos(t) * 0.3);
  let p3 = vec2f(sin(t * 1.2 + 4.0) * 0.3, cos(t * 0.8 + 1.0) * 0.3);
  
  // Metaball field
  let r = 0.1;
  let field = r / length(uv - p1) + r / length(uv - p2) + r / length(uv - p3);
  
  // Threshold and color
  let threshold = 1.0;
  let c = smoothstep(threshold, threshold + 0.1, field);
  let col = mix(vec3f(0.1, 0.1, 0.2), vec3f(0.2, 0.8, 1.0), c);
  
  return vec4f(col, 1.0);
}
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a metaballs pass
const metaballs = ctx.pass(\`
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / globals.resolution.y;
  
  // Ball positions (animated)
  let t = globals.time;
  let p1 = vec2f(sin(t) * 0.3, cos(t * 1.3) * 0.3);
  let p2 = vec2f(sin(t * 0.7 + 2.0) * 0.3, cos(t) * 0.3);
  let p3 = vec2f(sin(t * 1.2 + 4.0) * 0.3, cos(t * 0.8 + 1.0) * 0.3);
  
  // Metaball field
  let r = 0.1;
  let field = r / length(uv - p1) + r / length(uv - p2) + r / length(uv - p3);
  
  // Threshold and color
  let threshold = 1.0;
  let c = smoothstep(threshold, threshold + 0.1, field);
  let col = mix(vec3f(0.1, 0.1, 0.2), vec3f(0.2, 0.8, 1.0), c);
  
  return vec4f(col, 1.0);
}
\`);

// Render loop
function frame() {
  metaballs.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'fractal',
    title: 'Mandelbrot Set',
    description: 'The classic complex number fractal. This shader computes the set by iterating z = z² + c and mapping the escape time to colors.',
    shader: `
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / globals.resolution.y;
  
  // Zoom and pan
  let zoom = pow(0.5, sin(globals.time * 0.2) * 5.0 + 5.0);
  let c = uv * zoom * 2.0 - vec2f(0.5, 0.0);
  
  var z = vec2f(0.0);
  var iter = 0;
  let max_iter = 100;
  
  for (var i = 0; i < max_iter; i++) {
    // z = z^2 + c
    z = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (length(z) > 2.0) {
      break;
    }
    iter = i;
  }
  
  if (iter == max_iter - 1) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
  
  let t = f32(iter) / f32(max_iter);
  let col = vec3f(
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 0.0),
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 0.6),
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 1.0)
  );
  
  return vec4f(col, 1.0);
}
`,
    code: `import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a fractal pass
const fractal = ctx.pass(\`
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / globals.resolution.y;
  
  // Zoom and pan
  let zoom = pow(0.5, sin(globals.time * 0.2) * 5.0 + 5.0);
  let c = uv * zoom * 2.0 - vec2f(0.5, 0.0);
  
  var z = vec2f(0.0);
  var iter = 0;
  let max_iter = 100;
  
  for (var i = 0; i < max_iter; i++) {
    // z = z^2 + c
    z = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (length(z) > 2.0) {
      break;
    }
    iter = i;
  }
  
  if (iter == max_iter - 1) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
  
  let t = f32(iter) / f32(max_iter);
  let col = vec3f(
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 0.0),
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 0.6),
    0.5 + 0.5 * sin(3.0 + t * 10.0 + 1.0)
  );
  
  return vec4f(col, 1.0);
}
\`);

// Render loop
function frame() {
  fractal.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'alien-planet',
    title: 'Alien Planet',
    description: 'A procedurally generated alien world with atmospheric scattering, Saturn-like rings, orbiting moon, and twinkling starfield.',
    shader: `
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 200.0;
const SURF_DIST: f32 = 0.001;
const PI: f32 = 3.14159265359;
const PLANET_RADIUS: f32 = 8.0;
const PLANET_POS: vec3f = vec3f(0.0, 0.0, 30.0);
const ATMOSPHERE_RADIUS: f32 = 9.5;
const RING_INNER: f32 = 11.0;
const RING_OUTER: f32 = 16.0;
const MOON_RADIUS: f32 = 1.2;

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

fn noise3D(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3f(1.0, 0.0, 0.0)), u.x),
    mix(hash31(i + vec3f(0.0, 1.0, 0.0)), hash31(i + vec3f(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(hash31(i + vec3f(0.0, 0.0, 1.0)), hash31(i + vec3f(1.0, 0.0, 1.0)), u.x),
    mix(hash31(i + vec3f(0.0, 1.0, 1.0)), hash31(i + vec3f(1.0, 1.0, 1.0)), u.x), u.y), u.z);
}

fn fbm(p: vec3f) -> f32 {
  var v: f32 = 0.0; var a: f32 = 0.5; var pos = p;
  for (var i = 0; i < 5; i++) { v += a * noise3D(pos); a *= 0.5; pos *= 2.0; }
  return v;
}

fn sdPlanet(p: vec3f) -> f32 {
  let lp = p - PLANET_POS;
  let base = length(lp) - PLANET_RADIUS;
  let noise = fbm(normalize(lp) * 8.0) * 0.3;
  let crater = pow(fbm(normalize(lp) * 4.0 + 10.0), 2.0) * 0.2;
  return base - noise + crater;
}

fn sdRings(p: vec3f) -> f32 {
  let lp = p - PLANET_POS;
  let c = cos(0.3); let s = sin(0.3);
  let tp = vec3f(lp.x, lp.y * c - lp.z * s, lp.y * s + lp.z * c);
  let dist = length(tp.xz);
  if (dist < RING_INNER || dist > RING_OUTER) { return MAX_DIST; }
  return abs(tp.y) - 0.05;
}

fn getMoonPos(time: f32) -> vec3f {
  return PLANET_POS + vec3f(cos(time * 0.15) * 14.0, sin(time * 0.1) * 4.0, sin(time * 0.15) * 12.0);
}

fn sdMoon(p: vec3f, time: f32) -> f32 {
  let lp = p - getMoonPos(time);
  return length(lp) - MOON_RADIUS - fbm(normalize(lp) * 6.0) * 0.08;
}

struct Hit { dist: f32, mat: i32 }

fn map(p: vec3f, time: f32) -> Hit {
  var h: Hit; h.dist = MAX_DIST; h.mat = 0;
  let pd = sdPlanet(p); if (pd < h.dist) { h.dist = pd; h.mat = 1; }
  let rd = sdRings(p); if (rd < h.dist) { h.dist = rd; h.mat = 2; }
  let md = sdMoon(p, time); if (md < h.dist) { h.dist = md; h.mat = 3; }
  return h;
}

fn calcNormal(p: vec3f, time: f32) -> vec3f {
  let e = vec2f(0.001, 0.0);
  return normalize(vec3f(map(p + e.xyy, time).dist - map(p - e.xyy, time).dist,
    map(p + e.yxy, time).dist - map(p - e.yxy, time).dist,
    map(p + e.yyx, time).dist - map(p - e.yyx, time).dist));
}

fn stars(rd: vec3f, time: f32) -> vec3f {
  var col = vec3f(0.0);
  let g1 = floor(rd * 100.0); let h1 = hash31(g1);
  if (h1 > 0.97) {
    let sc = (g1 + 0.5) / 100.0;
    let d = length(rd - normalize(sc)) * 100.0;
    col += smoothstep(1.5, 0.0, d) * (sin(time * 3.0 + h1 * 100.0) * 0.3 + 0.7) * 0.5;
  }
  let g2 = floor(rd * 50.0); let h2 = hash31(g2 + 100.0);
  if (h2 > 0.99) {
    let sc = (g2 + 0.5) / 50.0;
    let d = length(rd - normalize(sc)) * 50.0;
    let cv = hash33(g2);
    col += mix(vec3f(1.0, 0.9, 0.8), vec3f(0.8, 0.9, 1.0), cv.x) * smoothstep(2.0, 0.0, d);
  }
  return col;
}

fn atmosphere(ro: vec3f, rd: vec3f) -> vec3f {
  let oc = ro - PLANET_POS; let b = dot(oc, rd); let c = dot(oc, oc) - ATMOSPHERE_RADIUS * ATMOSPHERE_RADIUS;
  let h = b * b - c; if (h < 0.0) { return vec3f(0.0); }
  let t1 = max(-b - sqrt(h), 0.0); let t2 = -b + sqrt(h); if (t2 < 0.0) { return vec3f(0.0); }
  var scatter = vec3f(0.0); let step = (t2 - t1) / 8.0;
  for (var i = 0; i < 8; i++) {
    let t = t1 + (f32(i) + 0.5) * step;
    let sp = ro + rd * t;
    let alt = (length(sp - PLANET_POS) - PLANET_RADIUS) / (ATMOSPHERE_RADIUS - PLANET_RADIUS);
    let den = exp(-alt * 4.0);
    scatter += (vec3f(0.2, 0.5, 1.0) + vec3f(1.0, 0.4, 0.2) * 0.3) * den * step * 0.15;
  }
  return scatter;
}

fn getPlanetColor(p: vec3f, time: f32) -> vec3f {
  let lp = p - PLANET_POS; let sc = normalize(lp);
  let n1 = fbm(sc * 4.0); let n2 = fbm(sc * 8.0 + 10.0);
  var col = mix(vec3f(0.6, 0.2, 0.4), vec3f(0.2, 0.5, 0.4), n1);
  col = mix(col, vec3f(0.8, 0.6, 0.3), n2 * 0.5);
  let polar = abs(sc.y);
  if (polar > 0.7) { col = mix(col, vec3f(0.7, 0.8, 0.9), smoothstep(0.7, 0.9, polar)); }
  let bio = fbm(sc * 12.0 + time * 0.05);
  if (bio > 0.65) { col += vec3f(0.2, 1.0, 0.6) * (bio - 0.65) * 0.5; }
  return col;
}

fn getRingColor(p: vec3f) -> vec3f {
  let lp = p - PLANET_POS; let d = length(lp.xz);
  let pat = sin(d * 8.0) * 0.5 + 0.5;
  let n = hash21(vec2f(d * 10.0, atan2(lp.x, lp.z) * 5.0));
  var col = mix(vec3f(0.8, 0.7, 0.6), vec3f(0.4, 0.35, 0.3), pat) * (0.5 + n * 0.5);
  if (sin(d * 30.0) > 0.7) { col *= 0.3; }
  return col;
}

@fragment
fn main(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  var uv = (fc.xy - 0.5 * globals.resolution) / globals.resolution.y;
  uv.y = -uv.y;
  let time = globals.time;
  let camDist = 50.0 - time * 0.5; let camAngle = time * 0.05;
  let ro = vec3f(sin(camAngle) * 15.0, sin(time * 0.1) * 3.0 + 5.0, camDist);
  let forward = normalize(PLANET_POS - ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);
  let rd = normalize(forward + uv.x * right + uv.y * up);
  let sunDir = normalize(vec3f(0.5, 0.3, -1.0));
  
  var col = stars(rd, time);
  col += pow(max(dot(rd, sunDir), 0.0), 256.0) * 2.0 * vec3f(1.0, 0.9, 0.7);
  col += pow(max(dot(rd, sunDir), 0.0), 8.0) * 0.3 * vec3f(1.0, 0.9, 0.7);
  
  let nc = rd * 2.0;
  let neb1 = fbm(nc + vec3f(0.0, 0.0, time * 0.01));
  let neb2 = fbm(nc * 2.0 + vec3f(100.0, 0.0, time * 0.02));
  col += mix(vec3f(0.1, 0.0, 0.15), vec3f(0.0, 0.1, 0.2), neb1) * neb2 * 0.15;
  
  var t: f32 = 0.0; var hit: Hit; hit.mat = 0;
  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * t; let h = map(p, time);
    if (h.dist < SURF_DIST) { hit = h; break; }
    if (t > MAX_DIST) { break; }
    t += h.dist * 0.8;
  }
  
  if (hit.mat > 0) {
    let p = ro + rd * t; let n = calcNormal(p, time);
    var mc = vec3f(0.5);
    if (hit.mat == 1) { mc = getPlanetColor(p, time); }
    else if (hit.mat == 2) { mc = getRingColor(p); }
    else if (hit.mat == 3) { mc = vec3f(0.5, 0.5, 0.55) * fbm(n * 8.0); }
    
    let diff = max(dot(n, sunDir), 0.0);
    let vd = normalize(ro - p);
    let hd = normalize(sunDir + vd);
    let spec = pow(max(dot(n, hd), 0.0), 32.0);
    let fres = pow(1.0 - max(dot(vd, n), 0.0), 4.0);
    
    var sc = vec3f(0.02, 0.03, 0.05) * mc + mc * vec3f(1.0, 0.95, 0.9) * diff + vec3f(1.0, 0.9, 0.8) * spec * 0.3;
    if (hit.mat == 1) { sc += vec3f(0.3, 0.5, 1.0) * fres * 0.5; }
    if (hit.mat == 2) { col = mix(col, sc, 0.7); } else { col = sc; }
  }
  
  col += atmosphere(ro, rd);
  col = col / (col + vec3f(1.0));
  col = pow(col, vec3f(0.95, 1.0, 1.05));
  col = pow(col, vec3f(1.0 / 2.2));
  col *= 1.0 - 0.3 * length(uv);
  return vec4f(col, 1.0);
}
`,
    code: `import { gpu } from 'ralph-gpu';

const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Full alien planet with rings, moon, atmosphere
const alienPlanet = ctx.pass(\`
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 200.0;
const SURF_DIST: f32 = 0.001;
const PLANET_RADIUS: f32 = 8.0;
const PLANET_POS: vec3f = vec3f(0.0, 0.0, 30.0);
const RING_INNER: f32 = 11.0;
const RING_OUTER: f32 = 16.0;

fn hash31(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise3D(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3f(1,0,0)), u.x),
    mix(hash31(i + vec3f(0,1,0)), hash31(i + vec3f(1,1,0)), u.x), u.y),
    mix(mix(hash31(i + vec3f(0,0,1)), hash31(i + vec3f(1,0,1)), u.x),
    mix(hash31(i + vec3f(0,1,1)), hash31(i + vec3f(1,1,1)), u.x), u.y), u.z);
}

fn fbm(p: vec3f) -> f32 {
  var v = 0.0; var a = 0.5; var pos = p;
  for (var i = 0; i < 5; i++) { v += a * noise3D(pos); a *= 0.5; pos *= 2.0; }
  return v;
}

fn sdPlanet(p: vec3f) -> f32 {
  let lp = p - PLANET_POS;
  return length(lp) - PLANET_RADIUS - fbm(normalize(lp) * 8.0) * 0.3;
}

fn sdRings(p: vec3f) -> f32 {
  let lp = p - PLANET_POS;
  let c = cos(0.3); let s = sin(0.3);
  let tp = vec3f(lp.x, lp.y * c - lp.z * s, lp.y * s + lp.z * c);
  let d = length(tp.xz);
  if (d < RING_INNER || d > RING_OUTER) { return 200.0; }
  return abs(tp.y) - 0.05;
}

// ... see full shader in preview
@fragment
fn main(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  var uv = (fc.xy - 0.5 * globals.resolution) / globals.resolution.y;
  uv.y = -uv.y;
  // Camera orbits around planet...
  // Raymarch planet, rings, moon...
  // Atmospheric scattering, stars, god rays...
  return vec4f(1.0);
}
\`);

function frame() {
  alienPlanet.draw();
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
  {
    slug: 'fluid',
    title: 'Fluid Simulation',
    description: 'Real-time Navier-Stokes fluid simulation using ping-pong buffers, vorticity confinement, and pressure projection.',
    executable: true,
    code: `// Full Navier-Stokes Fluid Simulation
// Uses pingPong buffers for velocity, pressure, and dye

const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas, { dpr: Math.min(devicePixelRatio, 2) });
_ctx = ctx;

const SIM = 128, DYE = 256;
const velocity = ctx.pingPong(SIM, SIM, { format: "rg16float", filter: "linear", wrap: "clamp" });
const dye = ctx.pingPong(DYE, DYE, { format: "rgba16float", filter: "linear", wrap: "clamp" });
const pressure = ctx.pingPong(SIM, SIM, { format: "r16float", filter: "linear", wrap: "clamp" });
const divergence = ctx.target(SIM, SIM, { format: "r16float", filter: "nearest", wrap: "clamp" });
const curl = ctx.target(SIM, SIM, { format: "r16float", filter: "nearest", wrap: "clamp" });

// Splat velocity
const splatVelU = { uTarget: { value: velocity.read }, uPoint: { value: [0.5, 0.5] }, uColor: { value: [0, 0, 0] }, uRadius: { value: 0.003 } };
const splatVel = ctx.pass(\`
  @group(1) @binding(0) var uTarget: texture_2d<f32>;
  @group(1) @binding(1) var uTargetSampler: sampler;
  struct Params { point: vec2f, color: vec3f, radius: f32 }
  @group(1) @binding(2) var<uniform> params: Params;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let base = textureSample(uTarget, uTargetSampler, uv).xy;
    var d = uv - params.point; d.x *= globals.aspect;
    return vec4f(base + exp(-dot(d, d) / params.radius) * params.color.xy, 0.0, 1.0);
  }\`, { uniforms: splatVelU });

// Splat dye  
const splatDyeU = { uTarget: { value: dye.read }, uPoint: { value: [0.5, 0.5] }, uColor: { value: [1, 0, 0] }, uRadius: { value: 0.003 } };
const splatDye = ctx.pass(\`
  @group(1) @binding(0) var uTarget: texture_2d<f32>;
  @group(1) @binding(1) var uTargetSampler: sampler;
  struct Params { point: vec2f, color: vec3f, radius: f32 }
  @group(1) @binding(2) var<uniform> params: Params;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let base = textureSample(uTarget, uTargetSampler, uv).rgb;
    var d = uv - params.point; d.x *= globals.aspect;
    return vec4f(base + exp(-dot(d, d) / params.radius) * params.color, 1.0);
  }\`, { uniforms: splatDyeU });

// Curl
const curlU = { uVelocity: { value: velocity.read } };
const curlPass = ctx.pass(\`
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let L = textureSample(uVelocity, uVelocitySampler, uv - vec2f(e.x, 0)).y;
    let R = textureSample(uVelocity, uVelocitySampler, uv + vec2f(e.x, 0)).y;
    let B = textureSample(uVelocity, uVelocitySampler, uv - vec2f(0, e.y)).x;
    let T = textureSample(uVelocity, uVelocitySampler, uv + vec2f(0, e.y)).x;
    return vec4f(0.5 * (R - L - T + B), 0, 0, 1);
  }\`, { uniforms: curlU });

// Vorticity
const vortU = { uVelocity: { value: velocity.read }, uCurl: { value: curl }, uCurlStrength: { value: 20.0 }, uDt: { value: 0.016 } };
const vortPass = ctx.pass(\`
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @group(1) @binding(2) var uCurl: texture_2d<f32>;
  @group(1) @binding(3) var uCurlSampler: sampler;
  struct Params { curlStrength: f32, dt: f32 }
  @group(1) @binding(4) var<uniform> params: Params;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let L = textureSample(uCurl, uCurlSampler, uv - vec2f(e.x, 0)).x;
    let R = textureSample(uCurl, uCurlSampler, uv + vec2f(e.x, 0)).x;
    let B = textureSample(uCurl, uCurlSampler, uv - vec2f(0, e.y)).x;
    let T = textureSample(uCurl, uCurlSampler, uv + vec2f(0, e.y)).x;
    let C = textureSample(uCurl, uCurlSampler, uv).x;
    var f = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
    f = f / (length(f) + 0.0001) * params.curlStrength * C; f.y = -f.y;
    return vec4f(textureSample(uVelocity, uVelocitySampler, uv).xy + f * params.dt, 0, 1);
  }\`, { uniforms: vortU });

// Divergence
const divU = { uVelocity: { value: velocity.read } };
const divPass = ctx.pass(\`
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let L = textureSample(uVelocity, uVelocitySampler, uv - vec2f(e.x, 0)).x;
    let R = textureSample(uVelocity, uVelocitySampler, uv + vec2f(e.x, 0)).x;
    let B = textureSample(uVelocity, uVelocitySampler, uv - vec2f(0, e.y)).y;
    let T = textureSample(uVelocity, uVelocitySampler, uv + vec2f(0, e.y)).y;
    return vec4f(0.5 * (R - L + T - B), 0, 0, 1);
  }\`, { uniforms: divU });

// Pressure solve
const pressU = { uPressure: { value: pressure.read }, uDivergence: { value: divergence } };
const pressPass = ctx.pass(\`
  @group(1) @binding(0) var uPressure: texture_2d<f32>;
  @group(1) @binding(1) var uPressureSampler: sampler;
  @group(1) @binding(2) var uDivergence: texture_2d<f32>;
  @group(1) @binding(3) var uDivergenceSampler: sampler;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let L = textureSample(uPressure, uPressureSampler, uv - vec2f(e.x, 0)).x;
    let R = textureSample(uPressure, uPressureSampler, uv + vec2f(e.x, 0)).x;
    let B = textureSample(uPressure, uPressureSampler, uv - vec2f(0, e.y)).x;
    let T = textureSample(uPressure, uPressureSampler, uv + vec2f(0, e.y)).x;
    let d = textureSample(uDivergence, uDivergenceSampler, uv).x;
    return vec4f((L + R + B + T - d) * 0.25, 0, 0, 1);
  }\`, { uniforms: pressU });

// Gradient subtract
const gradU = { uPressure: { value: pressure.read }, uVelocity: { value: velocity.read } };
const gradPass = ctx.pass(\`
  @group(1) @binding(0) var uPressure: texture_2d<f32>;
  @group(1) @binding(1) var uPressureSampler: sampler;
  @group(1) @binding(2) var uVelocity: texture_2d<f32>;
  @group(1) @binding(3) var uVelocitySampler: sampler;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let L = textureSample(uPressure, uPressureSampler, uv - vec2f(e.x, 0)).x;
    let R = textureSample(uPressure, uPressureSampler, uv + vec2f(e.x, 0)).x;
    let B = textureSample(uPressure, uPressureSampler, uv - vec2f(0, e.y)).x;
    let T = textureSample(uPressure, uPressureSampler, uv + vec2f(0, e.y)).x;
    return vec4f(textureSample(uVelocity, uVelocitySampler, uv).xy - vec2f(R - L, T - B), 0, 1);
  }\`, { uniforms: gradU });

// Advect velocity
const advVelU = { uVelocity: { value: velocity.read }, uSource: { value: velocity.read }, uDissipation: { value: 0.99 }, uDt: { value: 0.016 } };
const advVelPass = ctx.pass(\`
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @group(1) @binding(2) var uSource: texture_2d<f32>;
  @group(1) @binding(3) var uSourceSampler: sampler;
  struct Params { dissipation: f32, dt: f32 }
  @group(1) @binding(4) var<uniform> params: Params;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let e = 1.0 / globals.resolution; let uv = pos.xy / globals.resolution;
    let v = textureSample(uVelocity, uVelocitySampler, uv).xy;
    return vec4f(textureSample(uSource, uSourceSampler, uv - params.dt * v * e).xy * params.dissipation, 0, 1);
  }\`, { uniforms: advVelU });

// Advect dye
const advDyeU = { uVelocity: { value: velocity.read }, uSource: { value: dye.read }, uDissipation: { value: 0.98 }, uDt: { value: 0.016 } };
const advDyePass = ctx.pass(\`
  @group(1) @binding(0) var uVelocity: texture_2d<f32>;
  @group(1) @binding(1) var uVelocitySampler: sampler;
  @group(1) @binding(2) var uSource: texture_2d<f32>;
  @group(1) @binding(3) var uSourceSampler: sampler;
  struct Params { dissipation: f32, dt: f32 }
  @group(1) @binding(4) var<uniform> params: Params;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let velE = 1.0 / vec2f(128.0, 128.0);
    let uv = pos.xy / globals.resolution;
    let v = textureSample(uVelocity, uVelocitySampler, uv).xy;
    return vec4f(textureSample(uSource, uSourceSampler, uv - params.dt * v * velE).rgb * params.dissipation, 1);
  }\`, { uniforms: advDyeU });

// Display
const dispU = { uDye: { value: dye.read } };
const dispPass = ctx.pass(\`
  @group(1) @binding(0) var uDye: texture_2d<f32>;
  @group(1) @binding(1) var uDyeSampler: sampler;
  @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let c = textureSample(uDye, uDyeSampler, pos.xy / globals.resolution).rgb;
    return vec4f(pow(c / (1.0 + c), vec3f(0.45)), 1);
  }\`, { uniforms: dispU });

function hsl(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  return [hue(h + 1/3), hue(h), hue(h - 1/3)];
}

let lastX = 0.5, lastY = 0.5;
function frame() {
  const t = ctx.time, dt = 0.016;
  const x = 0.5 + 0.3 * Math.sin(t), y = 0.5 + 0.2 * Math.cos(t * 4);
  const dx = (x - lastX) * 6000, dy = (y - lastY) * 6000;
  const col = hsl((t * 0.1) % 1, 1, 0.5);
  
  splatVelU.uTarget.value = velocity.read; splatVelU.uPoint.value = [x, y]; splatVelU.uColor.value = [dx, dy, 0];
  ctx.setTarget(velocity.write); ctx.autoClear = false; splatVel.draw(); velocity.swap();
  splatDyeU.uTarget.value = dye.read; splatDyeU.uPoint.value = [x, y]; splatDyeU.uColor.value = col;
  ctx.setTarget(dye.write); splatDye.draw(); dye.swap();
  
  curlU.uVelocity.value = velocity.read; ctx.setTarget(curl); curlPass.draw();
  vortU.uVelocity.value = velocity.read; vortU.uCurl.value = curl; vortU.uDt.value = dt;
  ctx.setTarget(velocity.write); vortPass.draw(); velocity.swap();
  
  divU.uVelocity.value = velocity.read; ctx.setTarget(divergence); divPass.draw();
  for (let i = 0; i < 3; i++) { pressU.uPressure.value = pressure.read; pressU.uDivergence.value = divergence;
    ctx.setTarget(pressure.write); pressPass.draw(); pressure.swap(); }
  
  gradU.uPressure.value = pressure.read; gradU.uVelocity.value = velocity.read;
  ctx.setTarget(velocity.write); gradPass.draw(); velocity.swap();
  
  advVelU.uVelocity.value = velocity.read; advVelU.uSource.value = velocity.read; advVelU.uDt.value = dt;
  ctx.setTarget(velocity.write); advVelPass.draw(); velocity.swap();
  advDyeU.uVelocity.value = velocity.read; advDyeU.uSource.value = dye.read; advDyeU.uDt.value = dt;
  ctx.setTarget(dye.write); advDyePass.draw(); dye.swap();
  
  dispU.uDye.value = dye.read; ctx.setTarget(null); ctx.autoClear = true; dispPass.draw();
  lastX = x; lastY = y;
  requestAnimationFrame(frame);
}
frame();
`,
    animated: true,
  },
];

export function getExampleBySlug(slug: string): Example | undefined {
  return examples.find((e) => e.slug === slug);
}

export function getAllExamples(): Example[] {
  return examples;
}
