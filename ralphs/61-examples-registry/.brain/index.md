# Examples Registry

The examples for the documentation app have been moved from being hardcoded in `apps/docs/app/examples/page.tsx` to a central registry in `apps/docs/lib/examples.ts`.

## Structure
The registry defines an `Example` interface and provides helper functions to retrieve examples.

```typescript
export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
}
```

## Available Examples
1. `gradient`: Simple UV to color mapping.
2. `wave`: Animated sine wave with uniforms.
3. `color-cycle`: Complex time-based color cycling pattern.
