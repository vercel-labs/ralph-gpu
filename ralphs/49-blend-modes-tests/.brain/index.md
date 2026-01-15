# Ralph GPU - Blend Modes Tests

## Project Overview
- Working in: `/Users/matiasgf/repos/experiments/ralph-gpu/ralphs/49-blend-modes-tests`
- Project root: `../../` (ralph-gpu/)
- Target: Create browser tests for blend modes in `../../packages/core/tests/browser/`

## Blend Modes Available
- `"none"` - No blending, opaque
- `"alpha"` - Standard transparency
- `"additive"` - Colors add up (glow effect)
- `"multiply"` - Colors multiply (darken)
- `"screen"` - Inverse multiply (lighten)

## Critical autoClear Behavior
**BY DEFAULT: `context.autoClear = true`** - target is CLEARED before each draw!

For blending tests:
1. Draw first pass (base color)
2. Set `context.autoClear = false` BEFORE second draw
3. Draw second pass with blend mode
4. Read pixels to verify blend result

Without disabling autoClear, first color gets wiped!

## Task Requirements
- Create `blend-modes.browser.test.ts` 
- Implement alpha blend test (red + semi-transparent blue = purple)
- Implement additive blend test (red + green = yellow)
- Both tests must pass