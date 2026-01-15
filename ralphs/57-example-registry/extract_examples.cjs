const fs = require('fs');
const path = require('path');

const examplesDir = '../../apps/examples/app';

const categories = {
  "basics": ["basic", "uniforms", "geometry", "lines"],
  "techniques": ["render-target", "ping-pong", "particles", "compute"],
  "simulations": ["fluid", "raymarching"],
  "advanced": ["metaballs", "morphing", "mandelbulb", "terrain", "alien-planet"],
  "features": ["triangle-particles", "texture-sampling", "storage-texture"]
};

const examples = [];

for (const [category, slugs] of Object.entries(categories)) {
  for (const slug of slugs) {
    const pagePath = path.join(examplesDir, slug, 'page.tsx');
    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');
      
      // Basic extraction of title from <h1>
      const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : slug;
      
      // Basic extraction of description from <p>
      const descriptionMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const description = descriptionMatch ? descriptionMatch[1].trim().replace(/\s+/g, ' ') : '';

      // Extraction of shader code
      // Look for ctx.pass(/* wgsl */ `...`) or ctx.material(/* wgsl */ `...`)
      // Or just /* wgsl */ `...`
      const shaderMatch = content.match(/\/\* wgsl \*\/\s*`([\s\S]*?)`/);
      const shaderCode = shaderMatch ? shaderMatch[1].trim() : '';

      examples.push({
        slug,
        title,
        description,
        category,
        shaderCode
      });
    } else {
      console.warn(`Warning: File not found for slug ${slug}: ${pagePath}`);
    }
  }
}

console.log(JSON.stringify(examples, null, 2));
