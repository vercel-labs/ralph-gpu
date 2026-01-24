#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface CodeExample {
  code: string;
  language: string;
  context: string;
}

interface CategoryExamples {
  [category: string]: CodeExample[];
}

// Read the source documentation
const sourcePath = path.join(process.cwd(), '.cursor/rules/ralph-gpu.mdc');
const sourceContent = fs.readFileSync(sourcePath, 'utf-8');

// Extract frontmatter
const frontmatterMatch = sourceContent.match(/^---\n([\s\S]*?)\n---\n/);
const contentWithoutFrontmatter = frontmatterMatch
  ? sourceContent.slice(frontmatterMatch[0].length)
  : sourceContent;

// Parse the markdown structure
const lines = contentWithoutFrontmatter.split('\n');

// Categories for examples
const categories: CategoryExamples = {
  initialization: [],
  passes: [],
  rendering: [],
  particles: [],
  compute: [],
  shaders: [],
  debugging: []
};

// Parse examples from markdown
function extractExamples(): CategoryExamples {
  let currentSection = '';
  let currentSubsection = '';
  let inCodeBlock = false;
  let currentCode: string[] = [];
  let currentLanguage = '';
  let contextLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track sections
    if (line.startsWith('##')) {
      currentSection = line.replace(/^##\s+/, '').toLowerCase();
      currentSubsection = '';
    } else if (line.startsWith('###')) {
      currentSubsection = line.replace(/^###\s+/, '').toLowerCase();
    }

    // Track code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        currentLanguage = line.slice(3).trim() || 'plaintext';
        currentCode = [];
        // Collect context from previous lines (headers, descriptions)
        contextLines = [];
        for (let j = Math.max(0, i - 5); j < i; j++) {
          if (lines[j].trim() && !lines[j].startsWith('```')) {
            contextLines.push(lines[j]);
          }
        }
      } else {
        // Ending a code block
        inCodeBlock = false;

        // Categorize the example
        const example: CodeExample = {
          code: currentCode.join('\n'),
          language: currentLanguage,
          context: contextLines.join('\n')
        };

        // Determine category based on section and content
        const fullContext = `${currentSection} ${currentSubsection} ${example.code}`.toLowerCase();

        if (fullContext.includes('init') || fullContext.includes('useeffect') || fullContext.includes('gpu.init')) {
          categories.initialization.push(example);
        } else if (fullContext.includes('pass') && (fullContext.includes('fullscreen') || fullContext.includes('fragment'))) {
          categories.passes.push(example);
        } else if (fullContext.includes('target') || fullContext.includes('pingpong') || fullContext.includes('mrt')) {
          categories.rendering.push(example);
        } else if (fullContext.includes('particle') || fullContext.includes('instance')) {
          categories.particles.push(example);
        } else if (fullContext.includes('compute') || fullContext.includes('@compute')) {
          categories.compute.push(example);
        } else if (fullContext.includes('wgsl') || fullContext.includes('@fragment') || fullContext.includes('@vertex') || fullContext.includes('sdf')) {
          categories.shaders.push(example);
        } else if (fullContext.includes('profiler') || fullContext.includes('event') || fullContext.includes('debug')) {
          categories.debugging.push(example);
        }
      }
    } else if (inCodeBlock) {
      currentCode.push(line);
    }
  }

  return categories;
}

// Generate SKILL.md content
function generateMainSkill(): string {
  const content = `---
name: ralph-gpu
description: Minimal WebGPU shader library for creative coding and real-time graphics. Provides fullscreen passes, particles, compute shaders, render targets, and ping-pong buffers with automatic uniform bindings and global time/resolution tracking.
---

# ralph-gpu

A minimal WebGPU shader library for creative coding and real-time graphics.

## When to Use

Use this skill when:
- Building WebGPU shader effects, creative coding projects, or real-time graphics
- Working with fullscreen shader passes, particle systems, or compute shaders
- Need guidance on ralph-gpu API, render targets, or WGSL shader patterns
- Implementing GPU-accelerated simulations or visual effects

## Installation

\`\`\`bash
npm install ralph-gpu
# For TypeScript support:
npm install -D @webgpu/types
\`\`\`

## Core Concepts

| Concept | Description |
|---------|-------------|
| \`gpu\` | Module entry point for initialization |
| \`ctx\` | GPU context — manages state and rendering |
| \`pass\` | Fullscreen shader (fragment only, uses internal quad) |
| \`material\` | Shader with custom vertex code (particles, geometry) |
| \`target\` | Render target (offscreen texture) |
| \`pingPong\` | Pair of render targets for iterative effects |
| \`compute\` | Compute shader for GPU-parallel computation |
| \`storage\` | Storage buffer for large data (particles, simulations) |

## Auto-Injected Globals

Every shader automatically has access to these uniforms:

\`\`\`wgsl
struct Globals {
  resolution: vec2f,  // Current render target size in pixels
  time: f32,          // Seconds since init
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;
\`\`\`

## Quick Start

\`\`\`tsx
import { gpu } from "ralph-gpu";

// Check support
if (!gpu.isSupported()) {
  console.error("WebGPU not supported");
  return;
}

// Initialize
const ctx = await gpu.init(canvas, { autoResize: true });

// Create fullscreen shader pass
const pass = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
\`);

// Render loop
function frame() {
  pass.draw();
  requestAnimationFrame(frame);
}
frame();
\`\`\`

## API Overview

### Context Creation

\`\`\`tsx
const ctx = await gpu.init(canvas, {
  autoResize?: boolean,  // Auto-handle canvas sizing (default: false)
  dpr?: number,          // Device pixel ratio
  debug?: boolean,       // Enable debug mode
  events?: {             // Event tracking
    enabled: boolean,
    types?: string[],
    historySize?: number
  }
});
\`\`\`

### Fullscreen Passes

\`\`\`tsx
// Simple mode (auto-generated bindings)
const pass = ctx.pass(wgslCode, {
  uTexture: someTarget,
  color: [1, 0, 0],
  intensity: 0.5
});
pass.set("intensity", 0.8);  // Update uniforms

// Manual mode (explicit bindings)
const pass = ctx.pass(wgslCode, {
  uniforms: {
    myValue: { value: 1.0 }
  }
});
pass.uniforms.myValue.value = 2.0;
\`\`\`

### Render Targets

\`\`\`tsx
const target = ctx.target(512, 512, {
  format?: "rgba8unorm" | "rgba16float" | "r16float" | "rg16float",
  filter?: "linear" | "nearest",
  wrap?: "clamp" | "repeat" | "mirror",
  usage?: "render" | "storage" | "both"
});

ctx.setTarget(target);  // Render to target
ctx.setTarget(null);    // Render to screen
\`\`\`

### Ping-Pong Buffers

\`\`\`tsx
const simulation = ctx.pingPong(128, 128, {
  format: "rgba16float"
});

// In render loop:
uniforms.inputTex.value = simulation.read;
ctx.setTarget(simulation.write);
processPass.draw();
simulation.swap();
\`\`\`

### Particles (Instanced Quads)

\`\`\`tsx
const particles = ctx.particles(1000, {
  shader: wgslCode,      // Full vertex + fragment shader
  bufferSize: 1000 * 16, // Buffer size in bytes
  blend: "additive"
});

particles.write(particleData);  // Float32Array
particles.draw();
\`\`\`

### Compute Shaders

\`\`\`tsx
const compute = ctx.compute(\`
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // GPU computation
  }
\`);

compute.storage("buffer", storageBuffer);
compute.dispatch(Math.ceil(count / 64));
\`\`\`

### Storage Buffers

\`\`\`tsx
const buffer = ctx.storage(byteSize);
buffer.write(new Float32Array([...]));

// Bind to shader
pass.storage("dataBuffer", buffer);
\`\`\`

## Important Notes

**WGSL Alignment**: \`array<vec3f>\` has 16-byte stride, not 12. Always pad to 16 bytes:
\`\`\`tsx
// Correct: [x, y, z, 0.0] per element
const buffer = ctx.storage(count * 16);
\`\`\`

**Particle Rendering**: Use instanced quads, not point-list (WebGPU points are always 1px)

**Texture References**: Target references stay valid after resize - no need to update uniforms

**Screen Readback**: Cannot read pixels from screen, only from render targets

## Examples

For detailed code examples, see:
- [examples-initialization.md](./examples-initialization.md) - Setup and React integration
- [examples-passes.md](./examples-passes.md) - Fullscreen shader passes
- [examples-rendering.md](./examples-rendering.md) - Render targets and ping-pong
- [examples-particles.md](./examples-particles.md) - Particle systems
- [examples-compute.md](./examples-compute.md) - Compute shaders
- [examples-shaders.md](./examples-shaders.md) - WGSL patterns and SDFs
- [examples-debugging.md](./examples-debugging.md) - Profiler and events

## Resources

- [GitHub Repository](https://github.com/your-org/ralph-gpu)
- [API Documentation](https://ralph-gpu.dev/docs)
- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)
`;

  return content;
}

// Generate example file content
function generateExampleFile(category: string, examples: CodeExample[]): string {
  const titles: { [key: string]: string } = {
    initialization: 'Initialization Examples',
    passes: 'Fullscreen Pass Examples',
    rendering: 'Render Target Examples',
    particles: 'Particle System Examples',
    compute: 'Compute Shader Examples',
    shaders: 'WGSL Shader Examples',
    debugging: 'Debugging and Profiling Examples'
  };

  let content = `# ${titles[category]}\n\n`;
  content += `This file contains code examples for ${category} in ralph-gpu.\n\n`;

  examples.forEach((example, index) => {
    // Extract a meaningful title from context
    const contextLine = example.context.split('\n').find(line =>
      line.startsWith('#') || line.trim().length > 10
    ) || `Example ${index + 1}`;

    const title = contextLine.replace(/^#+\s*/, '').trim();

    content += `## ${title}\n\n`;

    // Add context if meaningful
    const meaningfulContext = example.context
      .split('\n')
      .filter(line => !line.startsWith('#') && line.trim().length > 0)
      .join('\n')
      .trim();

    if (meaningfulContext && meaningfulContext.length < 500) {
      content += `${meaningfulContext}\n\n`;
    }

    content += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
  });

  return content;
}

// Main execution
console.log('Parsing ralph-gpu.mdc...');
const extractedExamples = extractExamples();

// Create SKILLS directory
const skillsDir = path.join(process.cwd(), 'SKILLS', 'ralph-gpu');
if (!fs.existsSync(skillsDir)) {
  fs.mkdirSync(skillsDir, { recursive: true });
}

console.log('Generating SKILL.md...');
const mainSkillContent = generateMainSkill();
fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), mainSkillContent);

console.log('Generating example files...');
for (const [category, examples] of Object.entries(extractedExamples)) {
  if (examples.length > 0) {
    const filename = `examples-${category}.md`;
    const content = generateExampleFile(category, examples);
    fs.writeFileSync(path.join(skillsDir, filename), content);
    console.log(`  - ${filename} (${examples.length} examples)`);
  }
}

console.log('\nSkill generation complete!');
console.log(`Output directory: ${skillsDir}`);
console.log('\nGenerated files:');
console.log('  - SKILL.md');
Object.keys(extractedExamples).forEach(category => {
  if (extractedExamples[category].length > 0) {
    console.log(`  - examples-${category}.md`);
  }
});
