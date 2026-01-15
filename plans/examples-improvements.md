---
name: Examples Gallery Improvements
overview: Enhance the interactive examples gallery with full API showcase, minimal design, and preview images.
todos:
  - id: full-api-examples
    content: Refactor examples to show full ralph-gpu API with index.tsx setup code, not just shaders
    status: pending
  - id: minimal-editor-design
    content: Make editor design more minimal - remove footer blocks, maximize space for code and preview
    status: pending
  - id: button-shortcut-label
    content: Add keyboard shortcut label to the Run button (show Cmd/Ctrl+Enter)
    status: pending
  - id: fix-keyboard-shortcut
    content: Fix Cmd+Enter keyboard shortcut - currently only works once after manual button click
    status: pending
  - id: preview-images
    content: Create script to generate preview images for examples and display them on gallery page
    status: pending
---

# Examples Gallery Improvements

## Issues to Fix

### 1. Examples Only Show Shader Code

**Current**: Examples only display the WGSL shader code
**Problem**: Users don't see the full ralph-gpu API usage (ctx.pass, uniforms, draw loop)
**Solution**: Refactor to show complete `index.tsx` files with full setup code

### 2. Editor Design Too Cluttered

**Current**: Footer blocks (Controls, WGSL Syntax, Responsive) take up valuable space
**Problem**: Less room for code and preview
**Solution**: Remove footer blocks, make design more minimal

### 3. Run Button Missing Shortcut Label

**Current**: Button just says "Run Shader"
**Problem**: Users don't know about the keyboard shortcut
**Solution**: Show "Run (⌘↵)" or "Run (Ctrl+Enter)" on the button

### 4. Keyboard Shortcut Broken

**Current**: Cmd+Enter only works once after manually clicking the button
**Problem**: The Monaco editor command registration seems to lose the callback reference
**Solution**: Investigate and fix the onRun callback binding in MonacoEditor component

### 5. No Preview Images on Gallery

**Current**: Gallery cards show title and description only
**Problem**: Users can't visually browse examples
**Solution**: Generate preview screenshots and display them on example cards

## Implementation Details

### Full API Examples

Each example should have a complete setup like:

```typescript
// Example structure in registry
interface Example {
  slug: string;
  title: string;
  description: string;
  code: string; // Full index.tsx code, not just shader
}

// Example code format:
const code = `
import { gpu } from 'ralph-gpu';

const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

const pass = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\`);

function frame() {
  pass.draw();
  requestAnimationFrame(frame);
}
frame();
`;
```

### Minimal Editor Design

- Remove footer tips section entirely
- Make header bar thinner (less padding)
- Maximize editor + preview height
- Button: "Run ⌘↵" (Mac) or "Run Ctrl+↵" (Windows/Linux)

### Preview Image Generation

Create a script that:

1. Spins up a headless browser
2. Navigates to each example playground
3. Waits for shader to render
4. Takes a screenshot of the canvas
5. Saves as `public/examples/[slug].png`

Display on gallery cards as thumbnail images.

### Keyboard Shortcut Fix

Investigate the MonacoEditor component:

- The `onRun` callback might be stale due to closure issues
- Consider using `useRef` for the callback
- Or use Monaco's action system instead of `addCommand`

## Files to Modify

- `apps/docs/lib/examples.ts` - Change from shader-only to full code
- `apps/docs/components/MonacoEditor.tsx` - Fix keyboard shortcut binding
- `apps/docs/components/ShaderPlayground.tsx` - Remove footer, update to run full code
- `apps/docs/components/ExampleCard.tsx` - Add preview image
- `apps/docs/app/examples/page.tsx` - Display preview images
- `apps/docs/app/examples/[slug]/page.tsx` - Remove footer blocks
- `apps/docs/scripts/generate-previews.ts` - New script for screenshots

## Priority Order

1. **Fix keyboard shortcut** - Most annoying bug
2. **Minimal design** - Quick win, improves UX
3. **Full API examples** - Core improvement
4. **Preview images** - Nice to have enhancement
