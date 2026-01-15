const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = '../../apps/examples/app';
const CATEGORY_MAP = {
  'basic': 'basics',
  'uniforms': 'basics',
  'geometry': 'basics',
  'lines': 'basics',
  'render-target': 'techniques',
  'ping-pong': 'techniques',
  'particles': 'techniques',
  'compute': 'techniques',
  'fluid': 'simulations',
  'raymarching': 'simulations',
  'metaballs': 'advanced',
  'morphing': 'advanced',
  'mandelbulb': 'advanced',
  'terrain': 'advanced',
  'alien-planet': 'advanced',
  'triangle-particles': 'features',
  'texture-sampling': 'features',
  'storage-texture': 'features',
};

const examples = [];

const dirs = fs.readdirSync(EXAMPLES_DIR).filter(d => {
  try {
    return fs.statSync(path.join(EXAMPLES_DIR, d)).isDirectory();
  } catch (e) {
    return false;
  }
});

for (const slug of dirs) {
  const pagePath = path.join(EXAMPLES_DIR, slug, 'page.tsx');
  if (!fs.existsSync(pagePath)) continue;

  const content = fs.readFileSync(pagePath, 'utf8');
  
  // Extract title - handle cases with template literals or nested elements
  const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  let title = titleMatch ? titleMatch[1].trim() : slug;
  // Clean up title (remove React braces)
  title = title.replace(/\{`([\s\S]*?)`\}/g, '$1').replace(/\{([\s\S]*?)\}/g, '$1');

  // Extract description
  const descMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  let description = descMatch ? descMatch[1].trim() : '';
  // Clean up description
  description = description.replace(/\{`([\s\S]*?)`\}/g, '$1').replace(/\{([\s\S]*?)\}/g, '$1').replace(/\s+/g, ' ');

  // Extract shader(s)
  const shaderMatches = [...content.matchAll(/ctx\.(?:pass|material|compute)\(\/\* wgsl \*\/ `([\s\S]*?)`[,\)]/g)];
  const shaderCode = shaderMatches.map(m => m[1].trim()).join('\n\n// --- Next Shader ---\n\n');

  if (shaderCode) {
    examples.push({
      slug,
      title,
      description,
      category: CATEGORY_MAP[slug] || 'basics',
      shaderCode
    });
  }
}

// Sort examples to match the category order then slug
const categoryOrder = ['basics', 'techniques', 'simulations', 'advanced', 'features'];
examples.sort((a, b) => {
  const catA = categoryOrder.indexOf(a.category);
  const catB = categoryOrder.indexOf(b.category);
  if (catA !== catB) return catA - catB;
  return a.slug.localeCompare(b.slug);
});

// Generate the file content
const output = `export type Category = 'basics' | 'techniques' | 'simulations' | 'advanced' | 'features';

export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  shaderCode: string;
}

export const examples: ExampleMeta[] = ${JSON.stringify(examples, null, 2)};

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find(e => e.slug === slug);
}

export function getExamplesByCategory(category: Category): ExampleMeta[] {
  return examples.filter(e => e.category === category);
}

export function getAllCategories(): Category[] {
  return ['basics', 'techniques', 'simulations', 'advanced', 'features'];
}
`;

fs.writeFileSync('../../apps/examples/lib/examples.ts', output);
console.log(`Generated registry with ${examples.length} examples.`);
