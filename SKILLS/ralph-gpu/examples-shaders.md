# WGSL Shader Examples

This file contains code examples for shaders in ralph-gpu.

## 0.0, // vertex 2

0.5,
    -0.5,
    0.0, // vertex 2
  ])
);

```plaintext

**Correct (16-byte aligned):**

```

## 0.0, // vertex 2 (x, y, z, padding)

-0.5,
    0.0,
    0.0, // vertex 2 (x, y, z, padding)
  ])
);

```plaintext

**Alternative: Use vec4f or structs with explicit padding:**

```

## // Resize later - uniform reference stays valid automatically!

// Resize later - uniform reference stays valid automatically!
sdfTarget.resize(800, 800); // ✅ No need to update uniforms
// Under the hood: TextureReference wrapper keeps the same object
// but updates the internal GPUTexture during resize

```plaintext

**API Properties:**

- `.texture` → `TextureReference` (stable, use for uniforms)
- `.gpuTexture` → `GPUTexture` (direct access, becomes invalid after resize)
- `.view` → Auto-updated on resize

## Common WGSL Patterns

### UV Coordinates

```

## // Pattern 4: Direct GPU texture access (advanced - becomes invalid after resize)

// Pattern 4: Direct GPU texture access (advanced - becomes invalid after resize)
const uniforms4 = {
  directTexture: { value: renderTarget.gpuTexture }, // Direct GPUTexture
};

```plaintext

**Sampler Naming Convention:**
The system automatically matches samplers to textures using conventions:

- `myTexture` → looks for `myTextureSampler`
- `inputTex` → looks for `inputSampler` or `inputTexSampler`
- `someTexture` → looks for `someSampler` or `someTextureSampler`

### SDF Primitives

```

