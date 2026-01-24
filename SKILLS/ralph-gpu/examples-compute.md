# Compute Shader Examples

This file contains code examples for compute in ralph-gpu.

## // Read in vertex shader

// Read in vertex shader
let posIdx = iid * 2u;
let x = positions[posIdx];
let y = positions[posIdx + 1u];
let life = lifetimes[iid];

```plaintext

### 7. Compute Shaders

#### Basic Compute with Storage Buffers

For GPU-parallel computation:

```

## computeShader.storage("particles", particleBuffer);

computeShader.storage("particles", particleBuffer);
// In render loop
computeShader.dispatch(Math.ceil(particleCount / 64));

```plaintext

#### Compute Shaders with Texture Sampling

Compute shaders can now sample from textures (e.g., reading from an SDF or noise texture):

```

## compute.storage("data", dataBuffer);

}
);
compute.storage("data", dataBuffer);
compute.dispatch(512);

```plaintext

#### Compute with Storage Textures (Write Operations)

For writing to textures from compute shaders:

```

