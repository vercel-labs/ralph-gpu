# Redesign Plan - Vercel-like Docs with MDX

## Design Inspiration

- Vercel's documentation: https://vercel.com/docs
- Next.js docs: https://nextjs.org/docs
- Clean, minimal, professional

## Key Design Elements

### Colors (Vercel-inspired)

```css
/* Dark mode (primary) */
--background: #000000;
--foreground: #fafafa;
--muted: #888888;
--border: #333333;
--accent: #0070f3; /* Vercel blue */
--accent-hover: #0366d6;

/* Cards/surfaces */
--card: #111111;
--card-hover: #1a1a1a;
```

### Typography

- Font: Geist or Inter
- Sizes: Clear hierarchy
- Line height: Generous for readability

### Layout

- Max-width container (~1200px)
- Left sidebar for navigation
- Right sidebar for table of contents (optional)
- Generous whitespace

### Components

- Clean code blocks with copy button
- Callout boxes (info, warning, tip)
- API tables
- Step indicators

## MDX Setup

### Dependencies

```json
{
  "@next/mdx": "^14.0.0",
  "@mdx-js/react": "^3.0.0",
  "shiki": "^1.0.0",
  "rehype-pretty-code": "^0.13.0"
}
```

### File Structure

```
apps/docs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── docs/
│       ├── [[...slug]]/
│       │   └── page.tsx    # Catches all doc routes
│       └── layout.tsx      # Docs layout with sidebar
├── content/
│   ├── getting-started.mdx
│   ├── concepts.mdx
│   ├── api/
│   │   ├── gpu.mdx
│   │   ├── context.mdx
│   │   └── ...
│   └── examples.mdx
├── components/
│   ├── mdx/
│   │   ├── CodeBlock.tsx
│   │   ├── Callout.tsx
│   │   ├── ApiTable.tsx
│   │   └── index.tsx       # MDX components export
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── ui/
│       └── ...
└── lib/
    └── mdx.ts              # MDX utilities
```

## Syntax Highlighting

### Using Shiki with rehype-pretty-code

- Support for WGSL highlighting
- Line numbers
- Line highlighting
- Copy button
- File name display

### Code Block Features

````tsx
// Usage in MDX:
```typescript title="example.ts" {3-5} showLineNumbers
const ctx = await gpu.init(canvas);
const pass = ctx.pass(/* wgsl */`
  @fragment
  fn main() -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
  }
`);
````

## Custom MDX Components

### Callout

```mdx
<Callout type="info">
  WebGPU requires a secure context (HTTPS or localhost).
</Callout>

<Callout type="warning">Always call `ctx.dispose()` when done.</Callout>
```

### Steps

```mdx
<Steps>
  <Step title="Install">npm install ralph-gpu</Step>
  <Step title="Initialize">const ctx = await gpu.init(canvas);</Step>
</Steps>
```

### API Reference Card

```mdx
<ApiCard
  name="gpu.init"
  signature="(canvas: HTMLCanvasElement, options?: InitOptions) => Promise<GPUContext>"
  description="Initialize WebGPU context"
/>
```
