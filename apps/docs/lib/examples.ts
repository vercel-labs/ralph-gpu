export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
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
    animated: true,
  },
];

export function getExampleBySlug(slug: string): Example | undefined {
  return examples.find((e) => e.slug === slug);
}

export function getAllExamples(): Example[] {
  return examples;
}
