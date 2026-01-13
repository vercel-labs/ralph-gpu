/**
 * Ralph 11: ralph-gl Package Setup & Build Configuration
 * 
 * Sets up the initial package structure, build configuration, and folder structure
 * for the ralph-gl WebGL library.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/agent-loop";
import * as fs from "fs/promises";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  console.error("Copy the .env file from ../10-custom-geometry/");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🔷 Ralph 11 - ralph-gl Package Setup");
console.log("━".repeat(60));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) console.log(`🐛 Debug: enabled`);
console.log("━".repeat(60));

const RALPH_GL_PKG = `${PROJECT_ROOT}/packages/ralph-gl`;
const RALPH_GPU_PKG = `${PROJECT_ROOT}/packages/core`;

const TASK = `
# Task: Set Up ralph-gl Package Structure

## Working Directory
Script running from: ${process.cwd()}
Project root: ${PROJECT_ROOT}
ralph-gl package: ${RALPH_GL_PKG}
ralph-gpu package (reference): ${RALPH_GPU_PKG}

## CRITICAL: Update Progress
Update ${RALPH_GL_PKG}/brain/progress.md after each significant action:
- Update "Ralph 01" section with timestamp
- Check off completed items
- Document any issues

## Context

You are creating a new package called "ralph-gl" which is a WebGL 2.0 version of ralph-gpu.
It should mirror the structure of ralph-gpu but target WebGL instead of WebGPU.

Reference the existing ralph-gpu package at: ${RALPH_GPU_PKG}

## Brain Folder

The brain folder already exists at ${RALPH_GL_PKG}/brain with:
- index.md (project overview)
- architecture.md (architectural decisions)
- conventions.md (coding standards)
- progress.md (progress tracking)

Read these files FIRST to understand the project goals and architecture.

## Tasks

### 1. Create Package.json

Create ${RALPH_GL_PKG}/package.json similar to ralph-gpu but:
- Name: "ralph-gl"
- Description: "Minimal WebGL 2.0 shader library"
- Version: "0.0.1"
- Main/module/types exports pointing to dist/
- Scripts: build, dev, test, typecheck, size
- DevDependencies:
  - typescript
  - webpack, webpack-cli
  - swc-loader, @swc/core
  - terser-webpack-plugin
  - vitest, @vitest/ui
  - @types/node
  - jsdom (for testing)
- No peer dependencies (WebGL is built into browsers)

### 2. Create Build Configuration

Create ${RALPH_GL_PKG}/webpack.config.js:
- Based on ${RALPH_GPU_PKG}/webpack.config.js
- Two builds: CommonJS (index.js) and ESM (index.mjs)
- Minification with Terser
- Source maps for development
- Tree shaking enabled

### 3. Create TypeScript Config

Create ${RALPH_GL_PKG}/tsconfig.json:
- Strict mode enabled
- Target ES2020
- Module ESNext
- Declaration files enabled
- Based on ${RALPH_GPU_PKG}/tsconfig.json

### 4. Create Bundle Size Script

Create ${RALPH_GL_PKG}/scripts/bundle-size.js:
- Copy from ${RALPH_GPU_PKG}/scripts/bundle-size.js
- Update package name to "ralph-gl"
- Target: < 10kB gzipped

### 5. Create Folder Structure

Create these directories:
- ${RALPH_GL_PKG}/src/ (source code)
- ${RALPH_GL_PKG}/tests/ (unit tests)
- ${RALPH_GL_PKG}/scripts/ (already has bundle-size.js)
- ${RALPH_GL_PKG}/dist/ (build output - will be generated)

### 6. Create Placeholder Files

Create empty placeholder files in src/:
- index.ts (will export main API)
- context.ts (GLContext class)
- pass.ts (Pass class)
- material.ts (Material class)
- target.ts (RenderTarget class)
- ping-pong.ts (PingPongTarget class)
- storage.ts (StorageBuffer class)
- compute.ts (ComputeShader class)
- uniforms.ts (uniform handling)
- types.ts (TypeScript types)
- errors.ts (error classes)
- transpiler.ts (WGSL→GLSL converter)

Each should have a basic comment explaining its purpose.

### 7. Create README Stub

Create ${RALPH_GL_PKG}/README.md with:
- Title: "ralph-gl"
- Tagline: "~10kB WebGL 2.0 shader library"
- Status: "🚧 Work in Progress"
- Brief description
- Installation (when available)
- Note: "See packages/core (ralph-gpu) for API reference"

### 8. Verify Build

Run from ${RALPH_GL_PKG}:
\`\`\`bash
pnpm install
pnpm build
\`\`\`

The build should succeed even with empty placeholder files.

## Acceptance Criteria (ALL MUST PASS)

### Package Setup
- [ ] ${RALPH_GL_PKG}/package.json exists with correct metadata
- [ ] All dependencies listed
- [ ] Scripts defined (build, dev, test, size)

### Build Configuration
- [ ] webpack.config.js creates both CJS and ESM builds
- [ ] tsconfig.json with strict mode
- [ ] scripts/bundle-size.js reports size

### Folder Structure
- [ ] src/ folder with all placeholder files
- [ ] tests/ folder created
- [ ] scripts/ folder with bundle-size.js

### Build Verification
- [ ] \`pnpm install\` succeeds
- [ ] \`pnpm build\` succeeds
- [ ] dist/index.js and dist/index.mjs created
- [ ] dist/index.d.ts created

### Documentation
- [ ] README.md created with basic info
- [ ] brain/progress.md updated with completion notes

## Important Notes

- Use the ralph-gpu package as a reference for structure
- Don't implement functionality yet - just scaffolding
- Keep package.json dependencies minimal
- Update brain/progress.md when done
`;

// Verification functions
async function checkPackageJsonExists(): Promise<boolean> {
  try {
    const pkg = JSON.parse(await fs.readFile(`${RALPH_GL_PKG}/package.json`, "utf-8"));
    return pkg.name === "ralph-gl" && pkg.scripts?.build !== undefined;
  } catch {
    return false;
  }
}

async function checkBuildConfigExists(): Promise<boolean> {
  try {
    await fs.access(`${RALPH_GL_PKG}/webpack.config.js`);
    await fs.access(`${RALPH_GL_PKG}/tsconfig.json`);
    return true;
  } catch {
    return false;
  }
}

async function checkFolderStructure(): Promise<boolean> {
  try {
    await fs.access(`${RALPH_GL_PKG}/src`);
    await fs.access(`${RALPH_GL_PKG}/tests`);
    await fs.access(`${RALPH_GL_PKG}/scripts`);
    
    const srcFiles = await fs.readdir(`${RALPH_GL_PKG}/src`);
    return srcFiles.includes("index.ts") && srcFiles.includes("context.ts");
  } catch {
    return false;
  }
}

async function checkBuildWorks(): Promise<boolean> {
  try {
    await fs.access(`${RALPH_GL_PKG}/dist/index.js`);
    await fs.access(`${RALPH_GL_PKG}/dist/index.mjs`);
    await fs.access(`${RALPH_GL_PKG}/dist/index.d.ts`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [
      brainRule,
      minimalChangesRule,
      trackProgressRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 40,
      maxCost: 10.0,
      timeout: "30m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Check the brain/ folder for architecture guidance. Update brain/progress.md with your progress.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting Ralph 11: Package Setup\n");
  const result = await agent.run();

  console.log("\n" + "━".repeat(60));
  console.log("📊 Results");
  console.log("━".repeat(60));
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log("━".repeat(60));

  // Verification
  console.log("\n📋 Verification:");
  const packageJson = await checkPackageJsonExists();
  console.log(`${packageJson ? "✅" : "❌"} package.json created`);

  const buildConfig = await checkBuildConfigExists();
  console.log(`${buildConfig ? "✅" : "❌"} Build config exists`);

  const folders = await checkFolderStructure();
  console.log(`${folders ? "✅" : "❌"} Folder structure correct`);

  const build = await checkBuildWorks();
  console.log(`${build ? "✅" : "❌"} Build works`);

  const allPassed = packageJson && buildConfig && folders && build;
  console.log(`\n${allPassed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  console.log("\n✨ Ralph 11 complete! Next: Ralph 12 (WGSL→GLSL Transpiler)");
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
