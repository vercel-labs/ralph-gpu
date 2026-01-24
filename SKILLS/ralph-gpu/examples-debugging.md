# Debugging and Profiling Examples

This file contains code examples for debugging in ralph-gpu.

## // Connected line strip

// Connected line strip
const strip = ctx.material(shader, {
  vertexCount: 20, // 20 connected points
  topology: "line-strip",
});

```plaintext

#### Available Topologies

| Topology           | Description                                | Use Case                   |
| ------------------ | ------------------------------------------ | -------------------------- |
| `"triangle-list"`  | Default, separate triangles (3 verts each) | Standard geometry          |
| `"triangle-strip"` | Connected triangles (shared verts)         | Efficient meshes           |
| `"line-list"`      | Separate line segments (2 verts each)      | Disconnected lines         |
| `"line-strip"`     | Connected line (shared vertices)           | Paths, waveforms           |
| `"point-list"`     | Individual points (**1px only, no size**)  | Sparse point clouds, debug |

#### Line-List Example (Separate Segments)

```

## enabled: true,

enabled: true,
    types: ["draw", "compute", "frame", "memory"], // Optional filter
    historySize: 1000, // Event history buffer size
  },
});

```plaintext

### Using the Profiler

```

## requestAnimationFrame(animate);

requestAnimationFrame(animate);
}
// Cleanup
profiler.dispose();

```plaintext

### Profiler API

```

## profiler.setEnabled(enabled)           // Enable/disable profiling

// Control
profiler.setEnabled(enabled)           // Enable/disable profiling
profiler.reset()                       // Clear all data
profiler.dispose()                     // Cleanup and unsubscribe

```plaintext

### Listening to Events

```

