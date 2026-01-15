# Ralph GPU Knowledge Base

## Overview
Ralph-gpu is a WebGPU wrapper library. This knowledge base tracks patterns and decisions made during development.

## Testing
Browser tests are located in `packages/core/tests/browser/` and use Playwright.
They typically involve setting up a WebGPU context, creating materials/targets, and drawing.
Test utilities are available in `RalphTestUtils` on the window object in the browser.

## Topology
Ralph-gpu supports several primitive topologies via the `Material` configuration:
- `triangle-list` (default)
- `triangle-strip`
- `line-list`
- `line-strip`
- `point-list`
Topology is set on the Material, not the Pass.
