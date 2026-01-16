# Examples Registry

The examples registry is located at `apps/examples/lib/examples.ts`.
It contains metadata and shader code for selected examples, which are used by the gallery and playground.

## Structure
- `ExampleMeta`: interface for example metadata.
- `examples`: array of `ExampleMeta` objects.
- Helper functions: `getExampleBySlug`, `getExamplesByCategory`, `getAllCategories`.

## Examples Included
1. basic
2. uniforms
3. raymarching
4. lines
