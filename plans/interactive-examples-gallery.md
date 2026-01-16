---
name: Interactive Examples Gallery
overview: Transform the ralph-gpu docs app examples into an interactive gallery with individual playground pages for each example.
todos:
  - id: setup-monaco
    content: Install @monaco-editor/react in docs app and create MonacoEditor wrapper component
    status: completed
  - id: examples-registry
    content: Create examples registry with metadata (title, description, shader code) for each example
    status: completed
  - id: gallery-page
    content: Transform /examples into a gallery grid showing all examples as cards
    status: completed
  - id: example-page
    content: Create /examples/[slug] dynamic route with ShaderPlayground (editor + preview)
    status: completed
  - id: shader-playground
    content: Build ShaderPlayground component with split layout, run button, error display
    status: completed
  - id: add-more-examples
    content: Add more interactive examples (raymarching, particles, etc.)
    status: completed

## Progress Log

### 2026-01-15: Starting fresh implementation
- Starting from ralph 60 (ignoring previous work on branch)
- Current docs app has `/examples` page with 3 live shader demos (gradient, wave, color cycle)
- Monaco editor not installed yet
- No `lib/` folder exists
---

# Interactive Examples Gallery

## Target App

**`apps/docs/`** - The ralph-gpu documentation site

## Current State

The docs app already has:

- `/examples` page with 3 live shader demos (gradient, wave, color cycle)
- `ExampleCanvas` component that renders WebGPU shaders
- Tailwind CSS configured
- `ralph-gpu` as a dependency
- Dark theme with good styling
- CodeBlock component for syntax highlighting

## Goal

Transform the examples section into:

1. **Gallery page** (`/examples`) - Grid of example cards with titles and descriptions
2. **Individual pages** (`/examples/[slug]`) - Full playground with Monaco editor + live preview

## Design Decisions

| Question         | Decision                                                             |
| ---------------- | -------------------------------------------------------------------- |
| Code editor      | **Monaco Editor** - Full VS Code experience with syntax highlighting |
| Preview behavior | **Manual run** - User clicks "Run" button or presses Cmd/Ctrl+Enter  |
| Layout           | **Split view** - Editor (left ~50%) + Canvas preview (right ~50%)    |
| Routing          | **Dynamic routes** - `/examples/[slug]` for each example             |

## Architecture

```
/examples (Gallery)
├── ExampleCard (gradient) → /examples/gradient
├── ExampleCard (wave) → /examples/wave
└── ExampleCard (color-cycle) → /examples/color-cycle

/examples/[slug] (Playground)
├── Header (title, back link, run button)
└── ShaderPlayground
    ├── MonacoEditor (left ~50%)
    └── PreviewCanvas (right ~50%)
```

## Implementation Plan

### 1. Setup Monaco

```bash
cd apps/docs
pnpm add @monaco-editor/react
```

Create `components/MonacoEditor.tsx`:

- Dark theme matching docs
- Cmd/Ctrl+Enter keyboard binding to trigger run
- TypeScript language (close enough for WGSL)

### 2. Create Examples Registry

`lib/examples.ts`:

```typescript
export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;
  uniforms?: Record<string, { value: any }>;
}

export const examples: Example[] = [
  {
    slug: "gradient",
    title: "Simple Gradient",
    description: "Map UV coordinates to colors",
    shader: `...`,
  },
  // ... more examples
];

export function getExampleBySlug(slug: string): Example | undefined;
export function getAllExamples(): Example[];
```

### 3. Gallery Page

Update `app/examples/page.tsx`:

- Grid layout with example cards
- Each card shows title, description
- Links to `/examples/[slug]`

### 4. Individual Example Pages

Create `app/examples/[slug]/page.tsx`:

- Load example from registry by slug
- Full-page ShaderPlayground
- Header with title and back link

### 5. ShaderPlayground Component

`components/ShaderPlayground.tsx`:

- Props: `example: Example`
- State: `code`, `activeCode`, `error`
- Split layout with Monaco + preview canvas
- Run button + Cmd+Enter shortcut
- Error display overlay

## Files to Create/Modify

- `apps/docs/package.json` - Add @monaco-editor/react
- `apps/docs/lib/examples.ts` - Examples registry
- `apps/docs/components/MonacoEditor.tsx` - Editor wrapper
- `apps/docs/components/ShaderPlayground.tsx` - Editor + preview
- `apps/docs/components/ExampleCard.tsx` - Gallery card component
- `apps/docs/app/examples/page.tsx` - Gallery page
- `apps/docs/app/examples/[slug]/page.tsx` - Individual playground pages

## Reference

The docs app already has working shader rendering in `app/examples/page.tsx`:

- `ExampleCanvas` component handles WebGPU init, shader compilation, animation loop
- Can be reused/adapted for the preview side of ShaderPlayground
