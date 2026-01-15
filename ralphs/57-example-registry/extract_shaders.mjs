
import fs from 'fs';
import path from 'path';

const examplesDir = '../../apps/examples/app';
const examples = [
  { slug: 'basic', category: 'basics', title: 'Basic Gradient', description: 'A simple gradient using fragment shaders' },
  { slug: 'uniforms', category: 'basics', title: 'Uniforms', description: 'Passing custom data to shaders via uniforms' },
  { slug: 'geometry', category: 'basics', title: 'Custom Geometry', description: 'Rendering custom geometry with vertex buffers' },
  { slug: 'lines', category: 'basics', title: 'Line Rendering', description: 'Rendering lines with various thicknesses and colors' },
  { slug: 'render-target', category: 'techniques', title: 'Render Targets', description: 'Rendering to textures for post-processing' },
  { slug: 'ping-pong', category: 'techniques', title: 'Ping-Pong Buffers', description: 'Using multiple textures for feedback effects' },
  { slug: 'particles', category: 'techniques', title: 'Particle Systems', description: 'GPU-accelerated particle simulations' },
  { slug: 'compute', category: 'techniques', title: 'Compute Shaders', description: 'General purpose GPU computation' },
  { slug: 'fluid', category: 'simulations', title: 'Fluid Simulation', description: '2D grid-based fluid simulation' },
  { slug: 'raymarching', category: 'simulations', title: 'Raymarching', description: '3D scene rendering using signed distance fields' },
  { slug: 'metaballs', category: 'advanced', title: 'Metaballs', description: 'Organic-looking blobs using marching squares/cubes' },
  { slug: 'morphing', category: 'advanced', title: 'Shape Morphing', description: 'Smoothly transitioning between different 3D shapes' },
  { slug: 'mandelbulb', category: 'advanced', title: 'Mandelbulb', description: '3D fractal exploration' },
  { slug: 'terrain', category: 'advanced', title: 'Terrain Generation', description: 'Procedural landscape generation' },
  { slug: 'alien-planet', category: 'advanced', title: 'Alien Planet', description: 'Complex procedural world rendering' },
  { slug: 'triangle-particles', category: 'features', title: 'Triangle Particles', description: 'Efficiently rendering many triangles' },
  { slug: 'texture-sampling', category: 'features', title: 'Texture Sampling', description: 'Loading and sampling images in shaders' },
  { slug: 'storage-texture', category: 'features', title: 'Storage Textures', description: 'Writing to textures from compute shaders' },
];

function extractShader(slug) {
  const filePath = path.join(examplesDir, slug, 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Look for ctx.pass(/* wgsl */ `...`) or ctx.material(/* wgsl */ `...`) or similar
  // This is a bit tricky with regex for multi-line, but we can try
  const match = content.match(/\/\* wgsl \*\/ `([\s\S]*?)`/);
  if (match) {
    return match[1].trim();
  }
  
  // Fallback to searching for backticks if no /* wgsl */ comment
  const match2 = content.match(/ctx\.(?:pass|material|compute)\(\s*`([\s\S]*?)`/);
  if (match2) {
    return match2[1].trim();
  }

  return '';
}

const registryEntries = examples.map(ex => {
  const shaderCode = extractShader(ex.slug);
  return {
    ...ex,
    shaderCode
  };
});

const output = `
export type Category = 'basics' | 'techniques' | 'simulations' | 'advanced' | 'features';

export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  shaderCode: string;
}

export const examples: ExampleMeta[] = ${JSON.stringify(registryEntries, null, 2)};

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find(ex => ex.slug === slug);
}

export function getExamplesByCategory(category: string): ExampleMeta[] {
  return examples.filter(ex => ex.category === category);
}

export function getAllCategories(): Category[] {
  return ['basics', 'techniques', 'simulations', 'advanced', 'features'];
}
`;

fs.writeFileSync('../../apps/examples/lib/examples.ts', output);
console.log('Successfully created examples.ts');
