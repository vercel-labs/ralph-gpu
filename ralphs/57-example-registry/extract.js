
import fs from 'fs';
import path from 'path';

const examplesDir = '../../apps/examples/app';
const examples = [
  // Basics
  { slug: 'basic', title: 'Basic Gradient', description: 'A simple animated gradient using WebGPU.', category: 'basics' },
  { slug: 'uniforms', title: 'Uniforms', description: 'Using uniforms to control shader parameters.', category: 'basics' },
  { slug: 'geometry', title: 'Geometry', description: 'Rendering basic geometric shapes like triangles and cubes.', category: 'basics' },
  { slug: 'lines', title: 'Lines', description: 'Rendering anti-aliased lines using SDF and storage buffers.', category: 'basics' },
  
  // Techniques
  { slug: 'render-target', title: 'Render Target', description: 'Rendering to an offscreen texture.', category: 'techniques' },
  { slug: 'ping-pong', title: 'Ping-Pong', description: 'Iterative simulation using ping-pong buffers.', category: 'techniques' },
  { slug: 'particles', title: 'Instanced Particles', description: 'High-performance particles using instancing.', category: 'techniques' },
  { slug: 'compute', title: 'Compute Shader', description: 'GPU-side simulation using compute shaders.', category: 'techniques' },
  
  // Simulations
  { slug: 'fluid', title: 'Fluid Simulation', description: 'Real-time 2D fluid simulation (Navier-Stokes).', category: 'simulations' },
  { slug: 'raymarching', title: '3D Raymarching', description: '3D scene rendered using signed distance functions.', category: 'simulations' },
  
  // Advanced
  { slug: 'metaballs', title: 'Metaballs', description: 'Organic blending shapes using smooth minimum.', category: 'advanced' },
  { slug: 'morphing', title: 'Morphing', description: 'Smooth transitions between 3D primitives.', category: 'advanced' },
  { slug: 'mandelbulb', title: 'Mandelbulb', description: 'A 3D fractal raymarched in real-time.', category: 'advanced' },
  { slug: 'terrain', title: 'Infinite Terrain', description: 'Procedurally generated lunar landscape.', category: 'advanced' },
  { slug: 'alien-planet', title: 'Alien Planet', description: 'Atmospheric scattering and procedural planet generation.', category: 'advanced' },
  
  // Features
  { slug: 'triangle-particles', title: 'Triangle Particles', description: 'Advanced particle system with SDF collision.', category: 'features' },
  { slug: 'texture-sampling', title: 'Texture Sampling', description: 'Custom samplers and wrapping modes.', category: 'features' },
  { slug: 'storage-texture', title: 'Storage Texture', description: 'Reading and writing textures in compute shaders.', category: 'features' },
];

function extractShader(content) {
  // Try to find the largest /* wgsl */ `...` block
  const regex = /\/\*\s*wgsl\s*\*\/\s*`([\s\S]*?)`/g;
  let match;
  let largestShader = '';
  while ((match = regex.exec(content)) !== null) {
    if (match[1].length > largestShader.length) {
      largestShader = match[1];
    }
  }
  return largestShader.trim();
}

const registry = examples.map(ex => {
  const filePath = path.join(examplesDir, ex.slug, 'page.tsx');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const shaderCode = extractShader(content);
    return { ...ex, shaderCode };
  }
  return { ...ex, shaderCode: '' };
});

const output = `
export type Category = "basics" | "techniques" | "simulations" | "advanced" | "features";

export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  shaderCode: string;
}

export const examples: ExampleMeta[] = ${JSON.stringify(registry, null, 2)};

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find(ex => ex.slug === slug);
}

export function getExamplesByCategory(category: string): ExampleMeta[] {
  return (examples as ExampleMeta[]).filter(ex => ex.category === category);
}

export function getAllCategories(): Category[] {
  return ["basics", "techniques", "simulations", "advanced", "features"];
}
`;

fs.writeFileSync('../../apps/examples/lib/examples.ts', output);
console.log('Registry created successfully!');
