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
];

export function getExampleBySlug(slug: string): Example | undefined {
  return examples.find((e) => e.slug === slug);
}

export function getAllExamples(): Example[] {
  return examples;
}
