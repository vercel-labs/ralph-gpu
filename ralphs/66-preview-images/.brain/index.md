# Ralph GPU Documentation Preview Images

This project aims to add preview images to the examples gallery in the `ralph-gpu` documentation.

## Architecture
- Screenshots are generated using Playwright.
- Images are stored in `apps/docs/public/examples/`.
- `ExampleCard` component is updated to display these images.

## Scripting
- `apps/docs/scripts/generate-previews.ts` uses `tsx` to run and imports from `lib/examples.ts`.
