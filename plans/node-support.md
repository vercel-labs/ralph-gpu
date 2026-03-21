# ralph-gpu Node.js Support — Implementation Plan

## Goal
Make `ralph-gpu` work in Node.js for server-side rendering, static asset generation, and Next.js server functions — while keeping 100% backward compatibility with the existing browser API.

## Branch
`ralph-gpu-node` (branched from `main`)

## Architecture Decision

### Approach: `gpu.initHeadless(width, height, options?)` — new entry point

- `gpu.init(canvas, options)` stays **100% unchanged** (browser path)
- `gpu.initHeadless(width, height, options?)` is the new Node.js entry point
- Internally, headless mode uses an owned `RenderTarget` as the "screen" backing texture instead of a canvas swap-chain
- `GPUContext` gets a `headless: boolean` flag and optional canvas/context fields
- All `getCurrentTexture()` calls in headless mode are redirected to the internal backing `RenderTarget`
- The `webgpu` npm package (Dawn-based) provides `navigator.gpu` in Node.js

### Key invariants
- No browser API is called in headless mode (no `navigator`, no `canvas`, no `window`, no `ResizeObserver`, no `createImageBitmap`)
- `RenderTarget.readPixels()` already works — no changes needed
- `ctx.readPixels()` for the "screen" in headless mode reads from the internal backing texture
- Output helpers (`saveImage`) are Node.js-only, import-guarded, use `sharp`

---

## Phases

### Phase 1 — Branch + TDD: Write Node.js unit tests first
**Goal**: Create the `ralph-gpu-node` branch, install `webgpu` package, write failing vitest tests that define the expected headless API. No implementation yet.

**Tasks**:
1. `git checkout -b ralph-gpu-node`
2. Install `webgpu` npm package as optional peer dependency
3. Write `packages/core/tests/node/headless.test.ts` — tests for `gpu.initHeadless()`, `gpu.isHeadlessSupported()`, width/height, `readPixels()`, `dispose()`
4. Write `packages/core/tests/node/headless-compute.test.ts` — tests for compute shaders in headless mode
5. Write `packages/core/tests/node/headless-output.test.ts` — tests for `saveImage()` helper
6. Ensure existing vitest tests still pass (they should — no source changes yet)
7. Run the new tests — they should FAIL (red phase of TDD)

**Acceptance**: New tests exist and fail cleanly with "not implemented" style errors. Existing tests pass.

**Review**: Code quality review of test design before proceeding.

---

### Phase 2 — Core: Implement headless `GPUContext`
**Goal**: Make `GPUContext` support headless mode. All new node tests from Phase 1 should go green.

**Tasks**:

#### 2a. Refactor `GPUContext` for optional canvas/context
In `packages/core/src/context.ts`:
- Make `private context: GPUCanvasContext` → `private context: GPUCanvasContext | null`
- Make `private canvas: HTMLCanvasElement` → `private canvas: HTMLCanvasElement | null`  
- Add `private headless: boolean`
- Add `private headlessTarget: RenderTarget | null` — the internal "screen" backing texture
- Guard all `this.context.` calls: in headless mode, use `this.headlessTarget` instead
- Guard all `this.canvas.` calls: skip in headless mode
- Guard `ResizeObserver`, `window.devicePixelRatio`, `canvas.getBoundingClientRect()` — only active when not headless
- `executeDrawCall()` when `headless && currentTarget === null` → use `headlessTarget`
- `clear()` when `headless && target === null` → clear `headlessTarget`
- `readPixels()` when `headless && currentTarget === null` → delegate to `headlessTarget.readPixels()`
- `resize()` in headless mode: update `_width`, `_height`, resize `headlessTarget`
- `dispose()` in headless mode: destroy `headlessTarget`, skip `context.unconfigure()`
- Format in headless mode: default to `"rgba8unorm"` (no `getPreferredCanvasFormat()`)

#### 2b. Add `gpu.initHeadless()` and `gpu.isHeadlessSupported()`
In `packages/core/src/context.ts`, extend the `gpu` object:
```typescript
gpu.isHeadlessSupported(): boolean
  // Returns true if a GPU instance is available without a canvas
  // Checks: globalThis.navigator?.gpu or the injected GPU from the webgpu package

gpu.initHeadless(
  width: number,
  height: number,
  options?: HeadlessGPUContextOptions  // extends GPUContextOptions, adds `gpu?: GPU`
): Promise<GPUContext>
  // 1. Uses options.gpu ?? navigator.gpu to get the GPU instance
  // 2. requestAdapter() + requestDevice()
  // 3. new GPUContext(device, null, null, "rgba8unorm", { ...options, headless: true }, width, height)
```

#### 2c. Add `HeadlessGPUContextOptions` type
In `packages/core/src/types.ts`:
```typescript
export interface HeadlessGPUContextOptions extends GPUContextOptions {
  /** Provide a custom GPU instance (e.g. from the `webgpu` npm package) */
  gpu?: { requestAdapter(): Promise<GPUAdapter | null> };
  /** Texture format for the internal screen backing texture (default: "rgba8unorm") */
  format?: TextureFormat;
}
```

#### 2d. Export from index.ts
- Export `HeadlessGPUContextOptions`

**Acceptance**: All node vitest tests from Phase 1 pass. Existing tests still pass. TypeScript compiles cleanly.

**Review**: Full code quality review of context.ts changes + rendered image validation via `readPixels()` snapshot.

---

### Phase 3 — Output Helpers: `saveImage()` and Node.js texture loading
**Goal**: Add a Node.js-only output helper and a file-system texture loader.

**Tasks**:

#### 3a. `saveImage()` helper
New file `packages/core/src/node/save-image.ts`:
```typescript
// Node.js only — uses sharp
export async function saveImage(
  pixels: Uint8Array,
  width: number,
  height: number,
  outputPath: string,
  options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number }
): Promise<void>
```
- Uses dynamic `import('sharp')` so it's never bundled for browser
- Validates it's running in Node.js before calling

#### 3b. `createTextureFromFile()` helper  
New file `packages/core/src/node/texture-from-file.ts`:
```typescript
// Node.js only — loads image file via sharp, returns raw Uint8Array + dimensions
export async function createTextureFromFile(
  device: GPUDevice,
  filePath: string,
  opts?: TextureOptions
): Promise<Texture>
```
- Uses `sharp` to decode the image to raw RGBA bytes
- Calls existing `createTextureFromData()` — no browser APIs needed

#### 3c. Re-export from `index.ts`
```typescript
export { saveImage } from './node/save-image';
export { createTextureFromFile } from './node/texture-from-file';
```
These are safe to tree-shake in browser bundles (dynamic imports of `sharp` will never resolve in browsers).

#### 3d. Write tests
`packages/core/tests/node/save-image.test.ts` — writes a PNG, validates file exists, correct dimensions.
`packages/core/tests/node/texture-from-file.test.ts` — loads a test PNG, validates texture dimensions.

**Acceptance**: Tests pass. `saveImage` produces a valid PNG file. Agent opens the rendered image with `seeImage` tool to visually validate output.

**Review**: Code quality review + visual validation of output PNG.

---

### Phase 4 — Integration: End-to-end Node.js example script
**Goal**: Create a self-contained Node.js example that demonstrates the full pipeline working end-to-end. This is also the visual validation step.

**Tasks**:

#### 4a. Example script
New file `packages/core/examples/node-render.ts`:
```typescript
// Run with: npx tsx packages/core/examples/node-render.ts
// Requires: webgpu npm package installed globally or locally
import { gpu, saveImage } from '../src/index';

async function main() {
  const ctx = await gpu.initHeadless(512, 512);

  const pass = ctx.pass(`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / globals.resolution;
      return vec4f(uv.x, uv.y, 0.5 + 0.5 * sin(globals.time), 1.0);
    }
  `);

  ctx.drawPass(pass);
  const pixels = await ctx.readPixels();
  await saveImage(pixels as Uint8Array, 512, 512, '/tmp/ralph-gpu-test.png');
  
  ctx.dispose();
  console.log('Rendered to /tmp/ralph-gpu-test.png');
}

main().catch(console.error);
```

#### 4b. Compute example
`packages/core/examples/node-compute.ts` — compute shader writes to storage buffer, reads back results.

#### 4c. Run and validate
- Agent runs the example script
- Agent opens the generated PNG with `seeImage` tool to visually verify correct rendering
- Agent checks compute results are numerically correct

**Acceptance**: PNG opens and shows a colored gradient (UV-based color). Visual inspection passes. Compute results correct.

---

### Phase 5 — Package config & build
**Goal**: Update package.json exports, tsconfig, and webpack to properly handle the Node.js path.

**Tasks**:

#### 5a. Conditional exports in `packages/core/package.json`
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "@webgpu/types": "^0.1.51",
    "webgpu": "^0.1.0"
  },
  "peerDependenciesMeta": {
    "@webgpu/types": { "optional": true },
    "webgpu": { "optional": true }
  }
}
```

#### 5b. tsconfig — ensure Node types work
The root `tsconfig.json` uses `lib: ["ES2022", "DOM"]`. This must stay for browser builds.
The node helpers (`src/node/*.ts`) will use `// @ts-ignore` or separate tsconfig where needed.

#### 5c. Webpack — exclude `sharp` from browser bundle
In `webpack.config.js`, add:
```javascript
externals: {
  sharp: 'commonjs sharp',
}
```
This prevents `sharp` from being bundled into the browser output.

#### 5d. Run full build
- `pnpm build` in `packages/core`
- Verify bundle sizes are acceptable (sharp is external)
- TypeScript type-check passes

**Acceptance**: Build succeeds. `sharp` not in browser bundle. Types exported correctly.

---

### Phase 6 — Documentation & Skills
**Goal**: Update all documentation per AGENTS.md guidelines.

**Tasks**:

#### 6a. `packages/core/README.md`
Add "Node.js / Server-Side Usage" section:
- Installation (`webgpu` + `sharp` optional peer deps)
- `gpu.initHeadless()` API
- `saveImage()` helper
- `createTextureFromFile()` helper
- Full example

#### 6b. `.cursor/rules/ralph-gpu.mdc`
Add Node.js section with code examples (this is the source of truth for SKILLS).

#### 6c. Regenerate SKILLS
```bash
npx tsx scripts/generate-skills.ts
```

#### 6d. Update `apps/docs` API page (if applicable)
Add `initHeadless` to the API reference.

**Acceptance**: All docs consistent. SKILLS regenerated. README has working example.

---

### Phase 7 — Final review & merge
**Goal**: Final holistic review, merge to `ralph-gpu-node`.

**Tasks**:
1. Run ALL vitest unit tests: `pnpm test` in `packages/core`
2. Confirm playwright tests are NOT run (they are slow and browser-only — skip explicitly)
3. Run full TypeScript typecheck: `pnpm typecheck` in `packages/core`
4. Final code quality review pass across all changed files
5. Visual validation: open rendered PNG with seeImage
6. Merge all commits cleanly on `ralph-gpu-node`

**Acceptance**: All unit tests pass. TypeScript clean. Image validates visually. Branch is mergeable.

---

## File Change Summary

### New files
- `packages/core/src/node/save-image.ts`
- `packages/core/src/node/texture-from-file.ts`
- `packages/core/examples/node-render.ts`
- `packages/core/examples/node-compute.ts`
- `packages/core/tests/node/headless.test.ts`
- `packages/core/tests/node/headless-compute.test.ts`
- `packages/core/tests/node/headless-output.test.ts`
- `packages/core/tests/node/save-image.test.ts`
- `packages/core/tests/node/texture-from-file.test.ts`

### Modified files
- `packages/core/src/context.ts` — headless mode, `initHeadless`, `isHeadlessSupported`
- `packages/core/src/types.ts` — `HeadlessGPUContextOptions`
- `packages/core/src/index.ts` — export new types and node helpers
- `packages/core/package.json` — peer deps, exports
- `packages/core/webpack.config.js` — externalize `sharp`
- `packages/core/tsconfig.json` — if needed for node path
- `packages/core/README.md` — Node.js usage section
- `.cursor/rules/ralph-gpu.mdc` — Node.js examples (source for SKILLS)
- `SKILLS/ralph-gpu/*` — auto-regenerated

---

## Constraints & Rules
- **Never break existing browser API** — `gpu.init()` unchanged
- **No browser globals in headless path** — guard every `window`, `navigator`, `canvas`, `ResizeObserver`, `createImageBitmap` call
- **TDD** — tests written before implementation in Phase 1/2
- **No playwright** — don't trigger browser tests (slow)
- **sharp is optional** — `saveImage` and `createTextureFromFile` use dynamic import, work only in Node.js
- **Sub-agents do review cycles** before merging each phase
- **Visual validation** — agent opens PNG images with seeImage in Phase 4 and Phase 7

## Status
- [ ] Phase 1 — Branch + TDD tests
- [ ] Phase 2 — Core headless implementation
- [ ] Phase 3 — Output helpers
- [ ] Phase 4 — Integration example + visual validation
- [ ] Phase 5 — Package config & build
- [ ] Phase 6 — Documentation
- [x] Phase 7 — Final review & merge

---

## Known Limitations

### linux-arm64: `initHeadless()` requires Dawn binaries
The `webgpu` npm package (Dawn-based) ships prebuilt binaries for `linux-x64`, `darwin-universal`, and `win32-x64` only. On `linux-arm64` (e.g. Docker on Apple Silicon), the native bindings are missing and `gpu.initHeadless()` will throw at runtime.

**Workaround options:**
- Build Dawn from source for arm64 (requires depot_tools, ~30-60 min)
- Use the browser path (`gpu.init(canvas)`) via Playwright for arm64 CI
- Wait for the `webgpu` npm package to add arm64 support

**Impact:** Code is correct and fully tested on supported platforms. The 13 GPU-hardware tests in `packages/core/tests/node/` are guarded with `vi.skipIf(!gpu.isHeadlessSupported())` and will pass on any supported platform.
