# ralph-gpu

Minimal WebGPU shader library inspired by Three.js and OGL.

## Project Structure

```
ralph-gpu/
├── apps/
│   └── examples/          # Next.js 14 examples app
├── packages/
│   └── core/              # ralph-gpu library
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json          # Root package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Start examples dev server
pnpm dev --filter=examples
```

## Packages

### `ralph-gpu` (packages/core)

The core WebGPU library. See [DX_EXAMPLES.md](./DX_EXAMPLES.md) for API documentation.

### `examples` (apps/examples)

Interactive shader examples built with Next.js 14.

## Documentation

- [DX_EXAMPLES.md](./DX_EXAMPLES.md) - API design and usage examples
- [RALPH_IMPLEMENTATION_PLAN.md](./RALPH_IMPLEMENTATION_PLAN.md) - Implementation roadmap

## License

MIT
