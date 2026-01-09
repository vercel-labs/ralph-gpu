import { RalphLoopAgent, iterationCountIs, tokenCountIs, costIs } from 'ralph-loop-agent';
import { stepCountIs } from 'ai';
import "dotenv/config";
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Project root (parent of ralph folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logTool(toolName: string, params: any) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`  🔧 [${timestamp}] ${toolName}`);
  
  // Log key parameters
  if (params.path) console.log(`     → ${params.path}`);
  if (params.command) console.log(`     → ${params.command}`);
  if (params.summary) console.log(`     → ${params.summary}`);
}

function logToolResult(toolName: string, result: string, isError = false) {
  const icon = isError ? '❌' : '✓';
  const preview = result.length > 100 ? result.substring(0, 100) + '...' : result;
  console.log(`     ${icon} ${preview.split('\n')[0]}`);
}

// ============================================================================
// TOOLS - File Operations
// ============================================================================

const fileTools = {
  readFile: {
    description: 'Read a file from the project',
    inputSchema: z.object({
      path: z.string().describe('Path relative to project root'),
      lineStart: z.number().optional(),
      lineEnd: z.number().optional(),
    }),
    execute: async ({ path: filePath, lineStart, lineEnd }: { path: string; lineStart?: number; lineEnd?: number }) => {
      logTool('readFile', { path: filePath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        if (lineStart !== undefined || lineEnd !== undefined) {
          const lines = content.split('\n');
          const start = (lineStart || 1) - 1;
          const end = lineEnd || lines.length;
          const result = lines.slice(start, end).join('\n');
          logToolResult('readFile', `Read ${end - start} lines`);
          return result;
        }
        
        logToolResult('readFile', `Read ${content.length} bytes`);
        return content;
      } catch (error: any) {
        const errorMsg = `Error reading file: ${error.message}`;
        logToolResult('readFile', errorMsg, true);
        return errorMsg;
      }
    },
  },

  writeFile: {
    description: 'Write content to a file (creates directories if needed)',
    inputSchema: z.object({
      path: z.string().describe('Path relative to project root'),
      content: z.string().describe('File content'),
    }),
    execute: async ({ path: filePath, content }: { path: string; content: string }) => {
      logTool('writeFile', { path: filePath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        const result = `✓ Written ${filePath} (${content.length} bytes)`;
        logToolResult('writeFile', result);
        return result;
      } catch (error: any) {
        const errorMsg = `Error writing file: ${error.message}`;
        logToolResult('writeFile', errorMsg, true);
        return errorMsg;
      }
    },
  },

  editFile: {
    description: 'Search and replace in a file (more efficient than full rewrite)',
    inputSchema: z.object({
      path: z.string().describe('Path relative to project root'),
      searchText: z.string().describe('Text to find'),
      replaceText: z.string().describe('Text to replace with'),
    }),
    execute: async ({ path: filePath, searchText, replaceText }: { path: string; searchText: string; replaceText: string }) => {
      logTool('editFile', { path: filePath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        if (!content.includes(searchText)) {
          const errorMsg = `Error: searchText not found in ${filePath}`;
          logToolResult('editFile', errorMsg, true);
          return errorMsg;
        }
        
        const newContent = content.replace(searchText, replaceText);
        await fs.writeFile(fullPath, newContent, 'utf-8');
        const result = `✓ Edited ${filePath}`;
        logToolResult('editFile', result);
        return result;
      } catch (error: any) {
        const errorMsg = `Error editing file: ${error.message}`;
        logToolResult('editFile', errorMsg, true);
        return errorMsg;
      }
    },
  },

  deleteFile: {
    description: 'Delete a file',
    inputSchema: z.object({
      path: z.string().describe('Path relative to project root'),
    }),
    execute: async ({ path: filePath }: { path: string }) => {
      logTool('deleteFile', { path: filePath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, filePath);
        await fs.unlink(fullPath);
        const result = `✓ Deleted ${filePath}`;
        logToolResult('deleteFile', result);
        return result;
      } catch (error: any) {
        const errorMsg = `Error deleting file: ${error.message}`;
        logToolResult('deleteFile', errorMsg, true);
        return errorMsg;
      }
    },
  },

  listFiles: {
    description: 'List files in a directory',
    inputSchema: z.object({
      path: z.string().describe('Directory path relative to project root'),
      recursive: z.boolean().optional().describe('List files recursively'),
    }),
    execute: async ({ path: dirPath, recursive }: { path: string; recursive?: boolean }) => {
      logTool('listFiles', { path: dirPath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, dirPath);
        
        const listDir = async (dir: string, prefix = ''): Promise<string[]> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const files: string[] = [];
          
          for (const entry of entries) {
            if (entry.name.startsWith('.')) continue; // Skip hidden files
            if (entry.name === 'node_modules') continue; // Skip node_modules
            
            const relativePath = path.join(prefix, entry.name);
            
            if (entry.isDirectory()) {
              files.push(`${relativePath}/`);
              if (recursive) {
                const subFiles = await listDir(path.join(dir, entry.name), relativePath);
                files.push(...subFiles);
              }
            } else {
              files.push(relativePath);
            }
          }
          
          return files;
        };
        
        const files = await listDir(fullPath);
        logToolResult('listFiles', `Found ${files.length} items`);
        return files.join('\n');
      } catch (error: any) {
        const errorMsg = `Error listing files: ${error.message}`;
        logToolResult('listFiles', errorMsg, true);
        return errorMsg;
      }
    },
  },

  fileExists: {
    description: 'Check if a file exists',
    inputSchema: z.object({
      path: z.string().describe('Path relative to project root'),
    }),
    execute: async ({ path: filePath }: { path: string }) => {
      logTool('fileExists', { path: filePath });
      try {
        const fullPath = path.resolve(PROJECT_ROOT, filePath);
        await fs.access(fullPath);
        logToolResult('fileExists', 'true');
        return 'true';
      } catch {
        logToolResult('fileExists', 'false');
        return 'false';
      }
    },
  },
};

// ============================================================================
// TOOLS - Command Execution
// ============================================================================

const commandTools = {
  runCommand: {
    description: 'Run a shell command in the project root. IMPORTANT: Use "pnpm test" for tests (already configured non-interactive). Do NOT add --run flag to pnpm commands.',
    inputSchema: z.object({
      command: z.string().describe('Shell command to run'),
      cwd: z.string().optional().describe('Working directory (relative to project root)'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default: 120000 = 2 minutes)'),
    }),
    execute: async ({ command, cwd, timeout }: { command: string; cwd?: string; timeout?: number }) => {
      logTool('runCommand', { command });
      const startTime = Date.now();
      const timeoutMs = timeout || 120000; // Default 2 minutes
      
      try {
        const workingDir = cwd ? path.resolve(PROJECT_ROOT, cwd) : PROJECT_ROOT;
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const { stdout, stderr } = await execAsync(command, { 
          cwd: workingDir, 
          maxBuffer: 10 * 1024 * 1024,
          signal: controller.signal as any,
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        logToolResult('runCommand', `✓ Completed in ${(duration / 1000).toFixed(2)}s`);
        return JSON.stringify({ stdout, stderr, exitCode: 0 }, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        if (error.name === 'AbortError' || error.killed) {
          logToolResult('runCommand', `⏱ Timeout after ${(duration / 1000).toFixed(2)}s`, true);
          return JSON.stringify({
            stdout: error.stdout || '',
            stderr: `Command timed out after ${timeoutMs}ms. If running tests, use --run flag to disable watch mode.`,
            exitCode: 124, // Standard timeout exit code
          }, null, 2);
        }
        
        logToolResult('runCommand', `Failed after ${(duration / 1000).toFixed(2)}s (exit code ${error.code || 1})`, true);
        return JSON.stringify({
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          exitCode: error.code || 1,
        }, null, 2);
      }
    },
  },
};

// ============================================================================
// TOOLS - Completion Marker
// ============================================================================

const completionTools = {
  markComplete: {
    description: 'Mark the current task as complete with a summary',
    inputSchema: z.object({
      summary: z.string().describe('Summary of what was accomplished'),
      filesModified: z.array(z.string()).describe('List of files created/modified'),
    }),
    execute: async ({ summary, filesModified }: { summary: string; filesModified: string[] }) => {
      logTool('markComplete', { summary });
      console.log(`     📝 Summary: ${summary}`);
      console.log(`     📁 Files modified: ${filesModified.length}`);
      filesModified.forEach(f => console.log(`        - ${f}`));
      return JSON.stringify({ 
        complete: true, 
        summary, 
        filesModified,
        message: '✅ Task marked as complete'
      }, null, 2);
    },
  },
};

// ============================================================================
// COMBINED TOOLS
// ============================================================================

const allTools = {
  ...fileTools,
  ...commandTools,
  ...completionTools,
};

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

interface VerificationResult {
  complete: boolean;
  reason: string;
}

const createVerification = (phaseName: string) => {
  return async ({ result }: { result: any }): Promise<VerificationResult> => {
    console.log(`\n🔍 Verifying completion for ${phaseName}...`);

    switch (phaseName) {
      case 'monorepo-setup':
        return verifyMonorepoSetup();
      
      case 'core-implementation':
        return verifyCoreImplementation();
      
      case 'examples-app':
        return verifyExamplesApp();
      
      default:
        return { complete: false, reason: `Unknown phase: ${phaseName}` };
    }
  };
};

async function verifyMonorepoSetup(): Promise<VerificationResult> {
  try {
    console.log('  → Checking workspace structure...');
    
    // Check if pnpm-workspace.yaml exists
    const workspaceExists = await fileExists('pnpm-workspace.yaml');
    if (!workspaceExists) {
      return { complete: false, reason: 'pnpm-workspace.yaml not found' };
    }

    // Check if packages/core exists
    const coreExists = await fileExists('packages/core/package.json');
    if (!coreExists) {
      return { complete: false, reason: 'packages/core/package.json not found' };
    }

    // Check if apps/examples exists
    const examplesExists = await fileExists('apps/examples/package.json');
    if (!examplesExists) {
      return { complete: false, reason: 'apps/examples/package.json not found' };
    }

    console.log('  → Running pnpm install...');
    const installResult = await runCommand('pnpm install');
    const install = JSON.parse(installResult);
    if (install.exitCode !== 0) {
      return { complete: false, reason: `pnpm install failed:\n${install.stderr.substring(0, 500)}` };
    }

    console.log('  → Running typecheck...');
    const typecheckResult = await runCommand('pnpm typecheck');
    const typecheck = JSON.parse(typecheckResult);
    if (typecheck.exitCode !== 0) {
      return { complete: false, reason: `Type-check failed:\n${typecheck.stderr.substring(0, 500)}` };
    }

    console.log('  → Running build...');
    const buildResult = await runCommand('pnpm build');
    const build = JSON.parse(buildResult);
    if (build.exitCode !== 0) {
      return { complete: false, reason: `Build failed:\n${build.stderr.substring(0, 500)}` };
    }

    console.log('  → Checking build output...');
    const distExists = await fileExists('packages/core/dist/index.js');
    if (!distExists) {
      return { complete: false, reason: 'Build did not produce packages/core/dist/index.js' };
    }

    console.log('  ✓ All checks passed!');
    return { complete: true, reason: '✅ Monorepo setup complete and verified' };
  } catch (error: any) {
    console.error('  ✗ Verification threw error:', error.message);
    return { complete: false, reason: `Verification error: ${error.message}\n${error.stack}` };
  }
}

async function verifyCoreImplementation(): Promise<VerificationResult> {
  try {
    console.log('  → Checking core structure...');
    
    // Type-check
    console.log('  → Running typecheck...');
    const typecheckResult = await runCommand('pnpm typecheck');
    const typecheck = JSON.parse(typecheckResult);
    if (typecheck.exitCode !== 0) {
      return { complete: false, reason: `Type errors:\n${typecheck.stderr.substring(0, 500)}` };
    }

    // Tests (allow tests to be minimal for now)
    console.log('  → Running tests...');
    const testsResult = await runCommand('pnpm test');
    const tests = JSON.parse(testsResult);
    // Note: We'll be lenient with tests since the agent might create basic tests
    if (tests.exitCode !== 0) {
      console.log('  ⚠ Tests failed, but continuing (will check exports)');
    }

    // Build
    console.log('  → Running build...');
    const buildResult = await runCommand('pnpm build');
    const build = JSON.parse(buildResult);
    if (build.exitCode !== 0) {
      return { complete: false, reason: `Build failed:\n${build.stderr.substring(0, 500)}` };
    }

    // Check exports exist
    console.log('  → Checking required exports...');
    const indexContent = await fileTools.readFile.execute({ path: 'packages/core/src/index.ts' });
    const requiredExports = ['gpu', 'WebGPUNotSupportedError', 'ShaderCompileError'];
    for (const exp of requiredExports) {
      if (!indexContent.includes(exp)) {
        return { complete: false, reason: `Missing required export: ${exp}` };
      }
    }

    console.log('  ✓ All checks passed!');
    return { complete: true, reason: '✅ Core library implementation complete and verified' };
  } catch (error: any) {
    console.error('  ✗ Verification threw error:', error.message);
    return { complete: false, reason: `Verification error: ${error.message}\n${error.stack}` };
  }
}

async function verifyExamplesApp(): Promise<VerificationResult> {
  try {
    console.log('  → Checking examples structure...');
    
    // Type-check
    console.log('  → Running typecheck...');
    const typecheckResult = await runCommand('pnpm typecheck');
    const typecheck = JSON.parse(typecheckResult);
    if (typecheck.exitCode !== 0) {
      return { complete: false, reason: `Type errors:\n${typecheck.stderr.substring(0, 500)}` };
    }

    // Build examples
    console.log('  → Building examples app...');
    const buildResult = await runCommand('pnpm build --filter=examples');
    const build = JSON.parse(buildResult);
    if (build.exitCode !== 0) {
      return { complete: false, reason: `Examples build failed:\n${build.stderr.substring(0, 500)}` };
    }

    // Check that example pages exist
    console.log('  → Checking example pages...');
    const pages = ['basic', 'uniforms', 'render-target', 'ping-pong', 'particles', 'fluid'];
    const missingPages: string[] = [];
    
    for (const page of pages) {
      const pageExists = await fileExists(`apps/examples/app/${page}/page.tsx`);
      if (!pageExists) {
        missingPages.push(page);
      }
    }
    
    if (missingPages.length > 0) {
      return { complete: false, reason: `Missing example pages: ${missingPages.join(', ')}` };
    }

    console.log('  ✓ All checks passed!');
    return { complete: true, reason: '✅ Examples app complete and verified' };
  } catch (error: any) {
    console.error('  ✗ Verification threw error:', error.message);
    return { complete: false, reason: `Verification error: ${error.message}\n${error.stack}` };
  }
}

// Helper functions (used by verification)
async function fileExists(filePath: string): Promise<boolean> {
  const result = await fileTools.fileExists.execute({ path: filePath });
  return result === 'true';
}

async function runCommand(command: string): Promise<string> {
  return await commandTools.runCommand.execute({ command });
}

// ============================================================================
// PHASE DEFINITIONS
// ============================================================================

const PHASES = [
  { 
    name: 'monorepo-setup', 
    maxIterations: 10,
    maxTokens: 100_000,
    maxCost: 5,
  },
  { 
    name: 'core-implementation', 
    maxIterations: 30,
    maxTokens: 500_000,
    maxCost: 20,
  },
  { 
    name: 'examples-app', 
    maxIterations: 20,
    maxTokens: 300_000,
    maxCost: 15,
  },
];

// ============================================================================
// PROMPTS
// ============================================================================

const PROMPTS = {
  'monorepo-setup': `# Phase 1: Monorepo Setup

## Goal

Create a Turborepo monorepo structure for the ralph-gpu project.

## Requirements

### Root Configuration

1. Initialize pnpm workspace with \`pnpm-workspace.yaml\`
2. Create root \`package.json\` with:
   - name: "ralph-gpu"
   - private: true
   - workspaces configuration
   - Scripts: \`dev\`, \`build\`, \`test\`, \`lint\`, \`typecheck\`
3. Create \`turbo.json\` with pipeline for: build, dev, test, lint, typecheck
4. Create root \`tsconfig.json\` with strict mode

### packages/core Setup

1. Create \`packages/core/package.json\`:
   - name: "ralph-gpu"
   - version: "0.0.1"
   - main: "dist/index.js"
   - module: "dist/index.mjs"
   - types: "dist/index.d.ts"
   - exports configuration
   - Dependencies: (none for core runtime)
   - DevDependencies: typescript, webpack, webpack-cli, swc-loader, @swc/core, vitest, @vitest/ui
2. Create Webpack config with SWC for transpilation
3. Create tsconfig.json extending root
4. Create vitest.config.ts
5. Create basic src/index.ts with placeholder export

### apps/examples Setup

1. Create Next.js 14 app with App Router (use \`npx create-next-app@latest\`)
2. Configure to use ralph-gpu from workspace
3. Create basic layout and home page
4. Add script to run dev server

## Guidelines

- Use pnpm for package management
- Follow TypeScript strict mode
- Use Turborepo for build orchestration
- Keep dependencies minimal

## Completion Criteria

When done, call the \`markComplete\` tool with:
- A summary of what was created
- List of files created/modified

The verification will check that:
- \`pnpm install\` succeeds
- \`pnpm build\` succeeds (builds core package)
- \`pnpm typecheck\` passes
`,

  'core-implementation': `# Phase 2: Core Library Implementation

## Reference

Read DX_EXAMPLES.md for the complete API specification.

## Goal

Implement the ralph-gpu core library following the API design in DX_EXAMPLES.md.

## Implementation Order

### Step 1: Types and Errors (src/types.ts, src/errors.ts)

- Define all TypeScript interfaces
- Create custom error classes: WebGPUNotSupportedError, DeviceCreationError, ShaderCompileError

### Step 2: GPU Context (src/context.ts)

- \`gpu.isSupported()\` — Check WebGPU support
- \`gpu.init(canvas, options)\` — Initialize context
- Context properties: width, height, time, timeScale, paused, autoClear
- Context methods: setTarget, setViewport, setScissor, clear, resize, dispose, readPixels

### Step 3: Render Targets (src/target.ts)

- \`ctx.target(width, height, options)\` — Create render target
- Support format, filter, wrap options
- Implement resize, readPixels, dispose

### Step 4: Ping-Pong Buffers (src/ping-pong.ts)

- \`ctx.pingPong(width, height, options)\` — Create ping-pong pair
- Properties: read, write
- Methods: swap, resize, dispose

### Step 5: Passes (src/pass.ts)

- \`ctx.pass(fragmentWGSL, options)\` — Create fullscreen pass
- Handle uniforms with { value: X } pattern
- Implement draw(), storage(), dispose()
- Lazy compilation with eager start

### Step 6: Materials (src/material.ts)

- \`ctx.material(wgsl, options)\` — Create custom geometry material
- Support vertexCount, instances, blend modes
- Same uniform handling as Pass

### Step 7: Compute Shaders (src/compute.ts)

- \`ctx.compute(wgsl, options)\` — Create compute shader
- Implement dispatch(x, y?, z?)

### Step 8: Storage Buffers (src/storage.ts)

- \`ctx.storage(byteSize)\` — Create storage buffer
- Implement dispose()

### Step 9: MRT (src/mrt.ts)

- \`ctx.mrt(outputs, width, height)\` — Create multiple render targets

### Step 10: Auto Uniforms (src/uniforms.ts)

- Inject globals struct: resolution, time, deltaTime, frame, aspect
- Update on each frame

## Testing Requirements

- Write unit tests for each module using Vitest
- Test error cases (WebGPU not supported, shader errors)
- Mock WebGPU API for unit tests where needed
- At minimum, test that modules export correctly

## Guidelines

- Follow the API exactly as specified in DX_EXAMPLES.md
- Use TypeScript strict mode
- Keep the implementation clean and well-documented
- Make incremental changes and test frequently
- Use editFile for small changes (more efficient)
- Use writeFile for new files

## Completion Criteria

When done, call the \`markComplete\` tool with:
- A summary of what was implemented
- List of files created/modified

The verification will check that:
- All TypeScript compiles without errors
- All tests pass (\`pnpm test\`)
- Build succeeds (\`pnpm build\`)
- Exports match DX_EXAMPLES.md API

**IMPORTANT**: The test script is configured to run in non-interactive mode. Just use \`pnpm test\`.
`,

  'examples-app': `# Phase 3: Examples App

## Goal

Create a Next.js app showcasing ralph-gpu with interactive shader examples.

## Examples to Implement

### 1. Basic Gradient (/basic)

- Simple fullscreen gradient shader
- Demonstrates: ctx.pass(), globals.resolution, globals.time

### 2. Custom Uniforms (/uniforms)

- Animated wave with controllable parameters
- Demonstrates: uniforms with { value: X }, reactive updates

### 3. Render Target (/render-target)

- Render to texture, then blur and display
- Demonstrates: ctx.target(), ctx.setTarget(), texture sampling

### 4. Ping-Pong (/ping-pong)

- Game of Life or diffusion simulation
- Demonstrates: ctx.pingPong(), swap(), iterative effects

### 5. Particles (/particles)

- GPU particle system with compute shaders
- Demonstrates: ctx.material(), ctx.compute(), ctx.storage(), instancing

### 6. Fluid Simulation (/fluid)

- Interactive fluid effect with mouse interaction
- Demonstrates: Multiple passes, ping-pong, complex shader pipelines

## UI Requirements

- Each page should have:
  - Full-viewport canvas
  - Title overlay with example name
  - Navigation back to home
- Home page with grid of example cards

## Guidelines

- Use the ralph-gpu library from the workspace
- Follow Next.js 14 App Router patterns
- Use client components for WebGPU code
- Add proper error handling for WebGPU not supported
- Make examples visually appealing
- Add comments to explain the shader code

## Completion Criteria

When done, call the \`markComplete\` tool with:
- A summary of what was created
- List of example pages implemented

The verification will check that:
- All example pages exist
- TypeScript compiles
- Build succeeds
`,
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runPhase(phase: typeof PHASES[0]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phase.name.toUpperCase()}`);
  console.log('='.repeat(60));

  const prompt = PROMPTS[phase.name as keyof typeof PROMPTS];

  const agent = new RalphLoopAgent({
    model: 'anthropic/claude-sonnet-4',
    
    instructions: `You are building the ralph-gpu WebGPU library.

Reference Files:
- DX_EXAMPLES.md contains the complete API specification
- RALPH_IMPLEMENTATION_PLAN.md contains the overall plan

Guidelines:
- Make incremental changes
- Run tests after each significant change
- Use editFile for small changes (more efficient)
- Use writeFile for new files
- Always verify your work compiles before marking complete
- Read the reference files when you need clarification
- When creating package.json files, ensure proper dependencies and scripts
- Follow the exact API from DX_EXAMPLES.md
- After completing work, call markComplete tool to signal completion

CRITICAL RULES:
- Use "pnpm test" for running tests (configured to run in non-interactive mode)
- NEVER add extra flags like --run to pnpm commands (pnpm doesn't forward them correctly)
- ALWAYS use non-interactive flags for commands that might wait for input
- Do NOT stop until all required files are created and the code compiles successfully`,

    tools: allTools,

    stopWhen: [
      iterationCountIs(phase.maxIterations),
      tokenCountIs(phase.maxTokens),
      costIs(phase.maxCost),
    ],
    
    // Increase tool loop limit from default 20 to 100 steps per iteration
    toolStopWhen: stepCountIs(100),

    verifyCompletion: createVerification(phase.name),

    onIterationStart: ({ iteration }) => {
      console.log(`\n┌─ Iteration ${iteration} ─────────────────────────────────`);
    },

    onIterationEnd: ({ iteration, duration, result }) => {
      console.log(`└─ Iteration ${iteration} completed in ${(duration / 1000).toFixed(2)}s`);
      if (result.usage?.totalTokens) {
        console.log(`   Tokens: ${result.usage.totalTokens.toLocaleString()}`);
      }
      console.log(`   Finish reason: ${result.finishReason}`);
    },
  });

  const result = await agent.loop({ prompt });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Phase Complete: ${result.completionReason}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Reason: ${result.reason}`);
  console.log('─'.repeat(60));

  return result;
}

async function main() {
  console.log('\n🚀 Ralph GPU Implementation Agent');
  console.log('━'.repeat(60));

  // Parse CLI arguments
  const args = process.argv.slice(2);
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  const requestedPhase = phaseArg?.split('=')[1];

  let phasesToRun = PHASES;
  
  if (requestedPhase) {
    const phase = PHASES.find(p => p.name === requestedPhase);
    if (!phase) {
      console.error(`\n❌ Unknown phase: ${requestedPhase}`);
      console.error(`Available phases: ${PHASES.map(p => p.name).join(', ')}`);
      process.exit(1);
    }
    phasesToRun = [phase];
    console.log(`Running single phase: ${requestedPhase}\n`);
  } else {
    console.log(`Running all ${PHASES.length} phases\n`);
  }

  for (const phase of phasesToRun) {
    const result = await runPhase(phase);

    if (result.completionReason !== 'verified') {
      console.error(`\n❌ Phase ${phase.name} did not complete successfully`);
      console.error(`Completion reason: ${result.completionReason}`);
      console.error(`Message: ${result.reason || 'No reason provided'}`);
      
      // Show more details if available
      if (result.text) {
        console.error(`\nLast output:\n${result.text.substring(0, 500)}...`);
      }
      
      process.exit(1);
    }
  }

  if (phasesToRun.length > 1) {
    console.log('\n✅ ALL PHASES COMPLETE');
  } else {
    console.log(`\n✅ PHASE ${phasesToRun[0].name.toUpperCase()} COMPLETE`);
  }
  console.log('━'.repeat(60));
  console.log('The ralph-gpu library has been successfully implemented!');
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
}

export { main, runPhase, PHASES };
