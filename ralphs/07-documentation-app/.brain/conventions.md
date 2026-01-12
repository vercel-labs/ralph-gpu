# Conventions for Documentation App

## File Structure

```
apps/docs/
├── app/
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Landing page
│   ├── getting-started/
│   │   └── page.tsx
│   ├── concepts/
│   │   └── page.tsx
│   ├── api/
│   │   ├── page.tsx         # API overview
│   │   ├── gpu/page.tsx     # gpu module
│   │   ├── context/page.tsx # GPUContext
│   │   ├── pass/page.tsx    # Pass
│   │   └── ...
│   └── examples/
│       └── page.tsx
├── components/
│   ├── Navigation.tsx
│   ├── CodeBlock.tsx
│   ├── LiveDemo.tsx
│   └── ApiTable.tsx
└── package.json
```

## Component Patterns

### Page Template

```tsx
export default function DocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>Title</h1>
      <p className="lead">Description</p>
      {/* Content */}
    </article>
  );
}
```

### Code Examples

- Use syntax highlighting
- Include copy button
- Show TypeScript/WGSL examples

### Live Demos

- Small canvas (400x300)
- Simple shaders that load fast
- Error boundaries for WebGPU failures

## Styling

- Dark theme (matches creative coding aesthetic)
- Tailwind CSS classes
- Consistent spacing and typography

## Navigation

- Sidebar on desktop
- Hamburger menu on mobile
- Clear hierarchy
