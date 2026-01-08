# Phase 1: Monorepo Setup

## Goal

Create a Turborepo monorepo structure for the ralph-gpu project with proper TypeScript configuration, build tooling, and workspace management.

## Requirements

### Root Configuration

1. **Initialize pnpm workspace** with `pnpm-workspace.yaml`:
   - Include `packages/*` and `apps/*`

2. **Create root `package.json`**:
   - name: "ralph-gpu-monorepo"
   - private: true
   - Define scripts:
     - `dev`: Run development servers
     - `build`: Build all packages
     - `test`: Run all tests
     - `lint`: Lint all code
     - `typecheck`: Type-check all TypeScript
   - DevDependencies: turbo, typescript

3. **Create `turbo.json`** with pipeline for:
   - `build`: depends on ^build
   - `dev`: cache: false
   - `test`: depends on build
   - `lint`: cache output
   - `typecheck`: cache output

4. **Create root `tsconfig.json`**:
   - Strict mode enabled
   - ES2022 target
   - Include compiler options for path mapping

5. **Create `.gitignore`**:
   - node_modules, dist, .next, .turbo, coverage, etc.

### packages/core Setup

1. **Create `packages/core/package.json`**:
   - name: "ralph-gpu"
   - version: "0.1.0"
   - main: "dist/index.js"
   - module: "dist/index.mjs"
   - types: "dist/index.d.ts"
   - exports configuration (modern module resolution)
   - scripts: build, test, typecheck
   - No runtime dependencies (WebGPU is built-in to browsers)
   - DevDependencies:
     - typescript: ^5.3.0
     - webpack: ^5.89.0
     - webpack-cli: ^5.1.4
     - @swc/core: ^1.3.100
     - swc-loader: ^0.2.3
     - vitest: ^1.1.0
     - @vitest/ui: ^1.1.0

2. **Create Webpack config** (`packages/core/webpack.config.js`):
   - Entry: src/index.ts
   - Output: dist/ with both ESM and CommonJS
   - Use SWC for transpilation (faster than Babel)
   - TypeScript declaration generation
   - Source maps
   - Minification for production

3. **Create `packages/core/tsconfig.json`**:
   - Extend root config
   - Module: ESNext
   - Target: ES2022
   - Include: src/**/*
   - Emit declarations

4. **Create `packages/core/vitest.config.ts`**:
   - Configure Vitest with proper TypeScript support
   - Test matching: **/*.test.ts
   - Enable coverage

5. **Create basic `packages/core/src/index.ts`**:
   ```typescript
   // Placeholder export
   export const version = '0.1.0';
   ```

6. **Create `packages/core/README.md`**:
   - Basic description
   - Link to DX_EXAMPLES.md

### apps/examples Setup

1. **Create Next.js 14 app** with App Router:
   - Use `pnpm create next-app` or manual setup
   - TypeScript enabled
   - App Router (not pages)
   - No src directory (use app/ directly)

2. **Configure `apps/examples/package.json`**:
   - name: "examples"
   - private: true
   - dependencies:
     - next: ^14.0.0
     - react: ^18.2.0
     - react-dom: ^18.2.0
     - ralph-gpu: workspace:*  (local package)
   - devDependencies:
     - typescript: ^5.3.0
     - @types/node: ^20.0.0
     - @types/react: ^18.2.0
     - @types/react-dom: ^18.2.0
   - scripts: dev, build, start, lint, typecheck

3. **Create `apps/examples/next.config.js`**:
   - Enable webpack 5
   - Configure to resolve workspace packages
   - Disable strict mode warnings (optional)

4. **Create `apps/examples/tsconfig.json`**:
   - Extend Next.js config
   - Strict mode
   - Path aliases (@/components, etc.)

5. **Create basic pages**:
   - `app/layout.tsx`: Root layout with HTML structure
   - `app/page.tsx`: Home page with "Coming soon" message

6. **Create `apps/examples/README.md`**:
   - How to run examples
   - Development instructions

## File Structure to Create

```
ralph-gpu/
├── package.json (root)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── .gitignore
├── packages/
│   └── core/
│       ├── package.json
│       ├── tsconfig.json
│       ├── webpack.config.js
│       ├── vitest.config.ts
│       ├── README.md
│       └── src/
│           └── index.ts
└── apps/
    └── examples/
        ├── package.json
        ├── next.config.js
        ├── tsconfig.json
        ├── README.md
        └── app/
            ├── layout.tsx
            ├── page.tsx
            └── globals.css
```

## Completion Criteria

Before calling `markComplete`, verify:

- [ ] `pnpm install` runs successfully
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm build` successfully builds packages/core
- [ ] packages/core/dist/ contains index.js, index.mjs, index.d.ts
- [ ] `pnpm dev --filter=examples` starts Next.js dev server on http://localhost:3000
- [ ] No build errors or warnings (except expected Next.js dev warnings)
- [ ] All configuration files have proper JSON/JS syntax

## Implementation Notes

1. **Start with root setup** — Create pnpm-workspace.yaml, root package.json, turbo.json first
2. **Then packages/core** — Set up the library structure
3. **Then apps/examples** — Set up the Next.js app
4. **Finally test** — Run install, build, and dev commands to verify everything works

## Common Issues to Avoid

- Don't forget to run `pnpm install` after creating package.json files
- Ensure workspace dependencies use `workspace:*` protocol
- Make sure tsconfig.json files properly extend parent configs
- Verify Next.js can find and use the local ralph-gpu package

## Reference

- DX_EXAMPLES.md contains the API specification (but implementation is Phase 2)
- This phase is just scaffolding — no actual GPU code yet
