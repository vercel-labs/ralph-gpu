export type Category = "basics" | "techniques" | "simulations" | "advanced" | "features";

export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  shaderCode: string;
}

export const examples: ExampleMeta[] = [
  {
    slug: "basic",
    title: "Basic Triangle",
    description: "A simple triangle rendered with a basic shader.",
    category: "basics",
    shaderCode: `
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) color: vec4f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(input.position, 1.0);
    output.color = input.color;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    return input.color;
}
`,
  },
  {
    slug: "uniforms",
    title: "Uniforms",
    description: "Using uniforms to pass data to shaders.",
    category: "basics",
    shaderCode: `
struct Uniforms {
  time: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(0.0, 0.5),
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5)
  );

  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / uniforms.resolution;
  return vec4f(uv, 0.5 + 0.5 * sin(uniforms.time), 1.0);
}
`,
  },
  {
    slug: "geometry",
    title: "Geometry",
    description: "Rendering complex geometry.",
    category: "basics",
    shaderCode: `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) color: vec4f
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`,
  },
  {
    slug: "lines",
    title: "Lines",
    description: "Rendering lines with custom shaders.",
    category: "basics",
    shaderCode: `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) color: vec4f
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`,
  },
  {
    slug: "render-target",
    title: "Render Target",
    description: "Rendering to a texture and using it as an input.",
    category: "techniques",
    shaderCode: `
@group(0) @binding(0) var tDiff: texture_2d<f32>;
@group(0) @binding(1) var sDiff: sampler;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var uv = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = uv[vertexIndex];
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(tDiff, sDiff, input.uv);
}
`,
  },
  {
    slug: "ping-pong",
    title: "Ping Pong",
    description: "Using multiple render targets for feedback effects.",
    category: "techniques",
    shaderCode: `
@group(0) @binding(0) var tPrev: texture_2d<f32>;
@group(0) @binding(1) var sPrev: sampler;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var uv = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = uv[vertexIndex];
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let prev = textureSample(tPrev, sPrev, input.uv);
  return prev * 0.99;
}
`,
  },
  {
    slug: "particles",
    title: "Particles",
    description: "Simple particle system.",
    category: "techniques",
    shaderCode: `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) color: vec4f
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`,
  },
  {
    slug: "compute",
    title: "Compute Shader",
    description: "Using compute shaders for data processing.",
    category: "techniques",
    shaderCode: `
@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= arrayLength(&data)) {
    return;
  }
  data[index] = data[index] * 2.0;
}
`,
  },
  {
    slug: "fluid",
    title: "Fluid Simulation",
    description: "2D fluid simulation using GPGPU.",
    category: "simulations",
    shaderCode: `
@group(0) @binding(0) var tVelocity: texture_2d<f32>;
@group(0) @binding(1) var sVelocity: sampler;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(1.0);
}
`,
  },
  {
    slug: "raymarching",
    title: "Raymarching",
    description: "Rendering 3D scenes using raymarching.",
    category: "simulations",
    shaderCode: `
struct Uniforms {
  time: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn sdfSphere(p: vec3f, s: f32) -> f32 {
  return length(p) - s;
}

fn map(p: vec3f) -> f32 {
  return sdfSphere(p, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy * 2.0 - uniforms.resolution) / min(uniforms.resolution.x, uniforms.resolution.y);
  
  let ro = vec3f(0.0, 0.0, 3.0);
  let rd = normalize(vec3f(uv, -1.0));
  
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = map(p);
    if (d < 0.001) {
      return vec4f(1.0);
    }
    t += d;
  }
  
  return vec4f(0.0, 0.0, 0.0, 1.0);
}
`,
  },
  {
    slug: "metaballs",
    title: "Metaballs",
    description: "Smoothly blending spheres.",
    category: "advanced",
    shaderCode: `
struct Uniforms {
  time: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / uniforms.resolution;
  return vec4f(uv, 0.0, 1.0);
}
`,
  },
  {
    slug: "morphing",
    title: "Morphing",
    description: "Morphing between different geometries.",
    category: "advanced",
    shaderCode: `
struct Uniforms {
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(
  @location(0) posA: vec3f,
  @location(1) posB: vec3f
) -> @builtin(position) vec4f {
  let t = sin(uniforms.time) * 0.5 + 0.5;
  let pos = mix(posA, posB, t);
  return vec4f(pos, 1.0);
}
`,
  },
  {
    slug: "mandelbulb",
    title: "Mandelbulb",
    description: "3D fractal rendering.",
    category: "advanced",
    shaderCode: `
struct Uniforms {
  time: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(1.0);
}
`,
  },
  {
    slug: "terrain",
    title: "Terrain",
    description: "Procedural terrain generation.",
    category: "advanced",
    shaderCode: `
struct Uniforms {
  time: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(1.0);
}
`,
  },
  {
    slug: "alien-planet",
    title: "Alien Planet",
    description: "Complex scene with procedural generation.",
    category: "advanced",
    shaderCode: \`
struct Uniforms {
    resolution: vec2f,
    time: f32,
    cameraPos: vec3f,
    cameraLookAt: vec3f,
    mouse: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(p: f32) -> f32 {
    return fract(sin(p) * 43758.5453123);
}

fn noise(p: vec3f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    
    let n = i.x + i.y * 57.0 + 113.0 * i.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), u.x),
                   mix(hash(n + 57.0), hash(n + 58.0), u.x), u.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), u.x),
                   mix(hash(n + 170.0), hash(n + 171.0), u.x), u.y), u.z);
}

fn fbm(p: vec3f) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var shift = vec3f(100.0);
    var p_mut = p;
    for (var i = 0; i < 5; i++) {
        v += a * noise(p_mut);
        p_mut = p_mut * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

fn sdfSphere(p: vec3f, s: f32) -> f32 {
    return length(p) - s;
}

fn map(p: vec3f) -> f32 {
    let planet = sdfSphere(p, 2.0) - fbm(p * 2.0 + uniforms.time * 0.1) * 0.2;
    return planet;
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy * 2.0 - uniforms.resolution) / min(uniforms.resolution.x, uniforms.resolution.y);
    
    let ro = vec3f(0.0, 0.0, 5.0);
    let rd = normalize(vec3f(uv, -1.5));
    
    var t = 0.0;
    for (var i = 0; i < 100; i++) {
        let p = ro + rd * t;
        let d = map(p);
        if (d < 0.001) {
            let n = normalize(vec3f(
                map(p + vec3f(0.001, 0.0, 0.0)) - map(p - vec3f(0.001, 0.0, 0.0)),
                map(p + vec3f(0.0, 0.001, 0.0)) - map(p - vec3f(0.0, 0.001, 0.0)),
                map(p + vec3f(0.0, 0.0, 0.001)) - map(p - vec3f(0.0, 0.0, 0.001))
            ));
            let light = normalize(vec3f(1.0, 1.0, 1.0));
            let diff = max(dot(n, light), 0.0);
            let col = vec3f(0.2, 0.4, 0.8) * diff + vec3f(0.1, 0.2, 0.3);
            return vec4f(col, 1.0);
        }
        t += d;
        if (t > 10.0) { break; }
    }
    
    return vec4f(0.05, 0.05, 0.1, 1.0);
}
\`,
  },
  {
    slug: "triangle-particles",
    title: "Triangle Particles",
    description: "Particles rendered as triangles.",
    category: "features",
    shaderCode: `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) color: vec4f
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`,
  },
  {
    slug: "texture-sampling",
    title: "Texture Sampling",
    description: "Sampling textures in shaders.",
    category: "features",
    shaderCode: `
@group(0) @binding(0) var tDiff: texture_2d<f32>;
@group(0) @binding(1) var sDiff: sampler;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSample(tDiff, sDiff, uv);
}
`,
  },
  {
    slug: "storage-texture",
    title: "Storage Texture",
    description: "Using storage textures in compute shaders.",
    category: "features",
    shaderCode: `
@group(0) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(outputTex);
  if (id.x >= size.x || id.y >= size.y) {
    return;
  }
  let color = vec4f(f32(id.x) / f32(size.x), f32(id.y) / f32(size.y), 0.0, 1.0);
  textureStore(outputTex, id.xy, color);
}
`,
  },
];

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find((example) => example.slug === slug);
}

export function getExamplesByCategory(category: Category): ExampleMeta[] {
  return examples.filter((example) => example.category === category);
}

export function getAllCategories(): Category[] {
  return ["basics", "techniques", "simulations", "advanced", "features"];
}
