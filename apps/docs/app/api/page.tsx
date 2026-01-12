import { CodeBlock } from '@/components/CodeBlock';

const moduleApiCode = `import { gpu, WebGPUNotSupportedError, DeviceCreationError, ShaderCompileError } from "ralph-gpu";

// Check if WebGPU is supported in this browser
gpu.isSupported()  // → boolean

// Initialize the GPU context
gpu.init(canvas, options?)  // → Promise<GPUContext>`;

const initOptionsCode = `interface InitOptions {
  dpr?: number;      // Device pixel ratio (default: window.devicePixelRatio)
  debug?: boolean;   // Enable debug logging (default: false)
}

const ctx = await gpu.init(canvas, {
  dpr: Math.min(window.devicePixelRatio, 2),
  debug: true,
});`;

const contextCreationCode = `// Create a fullscreen pass
ctx.pass(fragmentWGSL, options?)         // → Pass

// Create custom geometry material  
ctx.material(wgsl, options?)             // → Material

// Create compute shader
ctx.compute(wgsl, options?)              // → ComputeShader

// Create render target
ctx.target(width, height, options?)      // → RenderTarget

// Create ping-pong buffers
ctx.pingPong(width, height, options?)    // → PingPongTarget

// Create multi-render target (MRT)
ctx.mrt(outputs, width, height)          // → MultiRenderTarget

// Create storage buffer
ctx.storage(byteSize)                    // → StorageBuffer`;

const contextStateCode = `// Render target management
ctx.setTarget(target)      // Set render target (pass null for screen)
ctx.setTarget(null)        // Render to screen

// Viewport and scissor
ctx.setViewport(x?, y?, w?, h?)  // Set viewport rectangle
ctx.setScissor(x?, y?, w?, h?)   // Set scissor rectangle

// Clearing
ctx.autoClear = true        // Auto-clear before each draw (default: true)
ctx.clear(target?, color?)  // Manual clear (color as [r, g, b, a])

// Resize
ctx.resize(width, height)   // Resize context and internal buffers`;

const contextPropertiesCode = `ctx.width: number         // Canvas width in pixels
ctx.height: number        // Canvas height in pixels
ctx.time: number          // Elapsed time in seconds
ctx.timeScale: number     // Time multiplier (default: 1)
ctx.paused: boolean       // Pause time updates
ctx.autoClear: boolean    // Auto-clear before draw (default: true)`;

const timeControlCode = `// Pause/resume time
ctx.paused = true;         // Freeze globals.time
ctx.paused = false;        // Resume time

// Time scale
ctx.timeScale = 0.5;       // Slow motion (half speed)
ctx.timeScale = 2.0;       // Fast forward (double speed)

// Reset time
ctx.time = 0;              // Jump to time 0`;

const passOptionsCode = `interface PassOptions {
  uniforms?: Record<string, { value: any }>;
  blend?: BlendMode;
}

// Create with options
const pass = ctx.pass(shaderCode, {
  uniforms: {
    amplitude: { value: 0.5 },
    color: { value: [1, 0.5, 0.2] },
  },
  blend: "additive",
});`;

const passMethodsCode = `// Draw the pass to current target
pass.draw()

// Access uniforms
pass.uniforms.amplitude.value = 0.8

// Set uniform (alternative syntax)
pass.set("amplitude", 0.8)

// Bind a storage buffer
pass.storage("particles", particleBuffer)

// Clean up resources
pass.dispose()`;

const materialOptionsCode = `interface MaterialOptions {
  uniforms?: Record<string, { value: any }>;
  blend?: BlendMode;
  vertexCount?: number;    // Vertices per instance (default: 6)
  instances?: number;      // Number of instances (default: 1)
  topology?: "triangle-list" | "line-list" | "point-list";
}

const particles = ctx.material(shaderCode, {
  vertexCount: 6,        // Quad has 6 vertices (2 triangles)
  instances: 10000,      // 10k particles
  blend: "additive",
});`;

const computeCode = `// Create compute shader
const sim = ctx.compute(\`
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    // GPU-parallel computation
  }
\`);

// Dispatch compute work
sim.dispatch(workgroupsX, workgroupsY?, workgroupsZ?)

// Bind storage buffer
sim.storage("data", buffer)

// Access uniforms (if any)
sim.uniforms

// Cleanup
sim.dispose()`;

const targetOptionsCode = `interface TargetOptions {
  format?: "rgba8unorm" | "rgba16float" | "r16float" | "rg16float";
  filter?: "linear" | "nearest";
  wrap?: "clamp" | "repeat" | "mirror";
}

const buffer = ctx.target(512, 512, {
  format: "rgba16float",  // HDR
  filter: "linear",       // Smooth sampling
  wrap: "clamp",          // Clamp to edge
});`;

const targetPropertiesCode = `target.texture    // GPUTexture - use in uniforms
target.sampler    // GPUSampler
target.view       // GPUTextureView
target.width      // Width in pixels
target.height     // Height in pixels
target.format     // Texture format string

// Methods
target.resize(width, height)           // Resize the target
target.readPixels(x?, y?, w?, h?)      // → Promise<Uint8Array | Float32Array>
target.dispose()                       // Cleanup resources`;

const pingPongCode = `const velocity = ctx.pingPong(128, 128, { format: "rg16float" });

// Access buffers
velocity.read    // Current state (RenderTarget)
velocity.write   // Next state (RenderTarget)

// Swap after writing
velocity.swap()

// Resize both buffers
velocity.resize(width, height)

// Cleanup
velocity.dispose()`;

const storageCode = `// Create buffer (size in bytes)
const buffer = ctx.storage(4 * 4 * 1000);  // 1000 vec4s

// Write data
const data = new Float32Array(4 * 1000);
buffer.write(data)

// Access GPUBuffer directly
buffer.gpuBuffer

// Cleanup
buffer.dispose()`;

const blendModesCode = `// Preset blend modes
ctx.pass(shader, { blend: "alpha" })      // Standard transparency
ctx.pass(shader, { blend: "additive" })   // Add colors (glow, fire)
ctx.pass(shader, { blend: "multiply" })   // Multiply (darken)
ctx.pass(shader, { blend: "screen" })     // Screen (lighten)

// Custom blend configuration
ctx.pass(shader, {
  blend: {
    color: {
      src: "src-alpha",
      dst: "one",
      operation: "add"
    },
    alpha: {
      src: "one",
      dst: "one-minus-src-alpha",
      operation: "add"
    }
  }
});`;

const blendFactorsCode = `// Blend factors
"zero"                  // 0
"one"                   // 1
"src"                   // Source color/alpha
"one-minus-src"         // 1 - source
"src-alpha"             // Source alpha
"one-minus-src-alpha"   // 1 - source alpha
"dst"                   // Destination color/alpha
"one-minus-dst"         // 1 - destination
"dst-alpha"             // Destination alpha
"one-minus-dst-alpha"   // 1 - destination alpha

// Blend operations
"add"                   // src + dst
"subtract"              // src - dst
"reverse-subtract"      // dst - src
"min"                   // min(src, dst)
"max"                   // max(src, dst)`;

const errorsCode = `import {
  WebGPUNotSupportedError,
  DeviceCreationError,
  ShaderCompileError,
} from "ralph-gpu";

try {
  const ctx = await gpu.init(canvas);
} catch (e) {
  if (e instanceof WebGPUNotSupportedError) {
    // Browser doesn't support WebGPU
    // navigator.gpu is undefined
  } else if (e instanceof DeviceCreationError) {
    // GPU device couldn't be created
    // May happen with unsupported hardware
  } else if (e instanceof ShaderCompileError) {
    // WGSL syntax error
    console.error(\`Line \${e.line}, Col \${e.column}: \${e.message}\`);
  }
}`;

const globalsStructCode = `struct Globals {
  resolution: vec2f,  // Current render target size in pixels
  time: f32,          // Seconds since init (affected by timeScale)
  deltaTime: f32,     // Seconds since last frame
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}

// Automatically available in all shaders
@group(0) @binding(0) var<uniform> globals: Globals;`;

const uniformTypesCode = `// Scalar → f32
{ value: 0.5 }

// Vec2 → vec2f
{ value: [0.5, 0.5] }

// Vec3 → vec3f
{ value: [1.0, 0.5, 0.2] }

// Vec4 → vec4f
{ value: [1.0, 0.5, 0.2, 1.0] }

// Texture → texture_2d<f32> + sampler
{ value: renderTarget.texture }`;

export default function ApiPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
        API Reference
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        Complete documentation of all ralph-gpu methods and properties.
      </p>

      {/* Table of Contents */}
      <nav className="mb-12 p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Contents</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          <li><a href="#module" className="text-primary-400 hover:text-primary-300">gpu Module</a></li>
          <li><a href="#context" className="text-primary-400 hover:text-primary-300">GPUContext</a></li>
          <li><a href="#pass" className="text-primary-400 hover:text-primary-300">Pass</a></li>
          <li><a href="#material" className="text-primary-400 hover:text-primary-300">Material</a></li>
          <li><a href="#compute" className="text-primary-400 hover:text-primary-300">ComputeShader</a></li>
          <li><a href="#target" className="text-primary-400 hover:text-primary-300">RenderTarget</a></li>
          <li><a href="#pingpong" className="text-primary-400 hover:text-primary-300">PingPongTarget</a></li>
          <li><a href="#storage" className="text-primary-400 hover:text-primary-300">StorageBuffer</a></li>
          <li><a href="#blend" className="text-primary-400 hover:text-primary-300">Blend Modes</a></li>
          <li><a href="#globals" className="text-primary-400 hover:text-primary-300">Auto-Injected Globals</a></li>
          <li><a href="#uniforms" className="text-primary-400 hover:text-primary-300">Uniform Types</a></li>
          <li><a href="#errors" className="text-primary-400 hover:text-primary-300">Errors</a></li>
        </ul>
      </nav>

      {/* gpu Module */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="module">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">module</span>
          gpu
        </h2>
        <p className="text-gray-300 mb-4">
          The main entry point for initializing WebGPU.
        </p>
        <CodeBlock code={moduleApiCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Init Options</h3>
        <CodeBlock code={initOptionsCode} language="typescript" />
      </section>

      {/* GPUContext */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="context">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          GPUContext
        </h2>
        <p className="text-gray-300 mb-4">
          The main context object returned by <code>gpu.init()</code>. Creates and manages all GPU resources.
        </p>

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Factory Methods</h3>
        <CodeBlock code={contextCreationCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">State Management</h3>
        <CodeBlock code={contextStateCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Properties</h3>
        <CodeBlock code={contextPropertiesCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Time Control</h3>
        <CodeBlock code={timeControlCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Cleanup</h3>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <code className="text-primary-400">ctx.dispose()</code>
          <p className="text-gray-400 text-sm mt-2">
            Releases all GPU resources created by this context. Call this when unmounting a component or destroying the canvas.
          </p>
        </div>
      </section>

      {/* Pass */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="pass">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          Pass
        </h2>
        <p className="text-gray-300 mb-4">
          A fullscreen shader pass. Renders a fragment shader to the entire render target using an internal quad.
        </p>

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Creation Options</h3>
        <CodeBlock code={passOptionsCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Methods & Properties</h3>
        <CodeBlock code={passMethodsCode} language="typescript" />
      </section>

      {/* Material */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="material">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          Material
        </h2>
        <p className="text-gray-300 mb-4">
          A shader with custom vertex code. Use for particles, instanced geometry, or any non-fullscreen rendering.
        </p>

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Creation Options</h3>
        <CodeBlock code={materialOptionsCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-gray-400 text-sm">
            <strong className="text-gray-100">Note:</strong> Material has the same methods as Pass (<code>draw()</code>, <code>storage()</code>, <code>dispose()</code>, etc.)
          </p>
        </div>
      </section>

      {/* ComputeShader */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="compute">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          ComputeShader
        </h2>
        <p className="text-gray-300 mb-4">
          A compute shader for GPU-parallel computation. Doesn&apos;t render anything — just processes data.
        </p>
        <CodeBlock code={computeCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
          <strong>Workgroups:</strong> The dispatch count should be <code>totalItems / workgroupSize</code>. If your shader has <code>@workgroup_size(64)</code> and you have 1000 particles, dispatch <code>Math.ceil(1000/64)</code> = 16 workgroups.
        </div>
      </section>

      {/* RenderTarget */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="target">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          RenderTarget
        </h2>
        <p className="text-gray-300 mb-4">
          An offscreen texture that can be rendered to and sampled from.
        </p>

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Creation Options</h3>
        <CodeBlock code={targetOptionsCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Properties & Methods</h3>
        <CodeBlock code={targetPropertiesCode} language="typescript" />

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-gray-100 mb-2">Formats</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li><code>rgba8unorm</code> — Standard 8-bit color</li>
              <li><code>rgba16float</code> — HDR, negative values</li>
              <li><code>r16float</code> — Single channel float</li>
              <li><code>rg16float</code> — Two channel float</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-gray-100 mb-2">Read Pixels</h4>
            <p className="text-gray-400 text-sm">
              Returns <code>Uint8Array</code> for 8-bit formats, <code>Float32Array</code> for float formats. This is a GPU→CPU transfer and may be slow.
            </p>
          </div>
        </div>
      </section>

      {/* PingPongTarget */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="pingpong">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          PingPongTarget
        </h2>
        <p className="text-gray-300 mb-4">
          A pair of render targets for iterative effects. Read from one, write to the other, then swap.
        </p>
        <CodeBlock code={pingPongCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="font-semibold text-gray-100 mb-2">Usage Pattern</h4>
          <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
            <li>Read from <code>pingPong.read.texture</code> in your shader</li>
            <li>Set target to <code>pingPong.write</code></li>
            <li>Draw your pass</li>
            <li>Call <code>pingPong.swap()</code></li>
            <li>Repeat next frame</li>
          </ol>
        </div>
      </section>

      {/* StorageBuffer */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3" id="storage">
          <span className="px-2 py-1 bg-primary-500/20 rounded text-primary-400 font-mono text-sm">class</span>
          StorageBuffer
        </h2>
        <p className="text-gray-300 mb-4">
          A GPU buffer for large data sets. Used with compute shaders and materials for particles, simulations, etc.
        </p>
        <CodeBlock code={storageCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-gray-400 text-sm">
            <strong className="text-gray-100">Size calculation:</strong> Multiply the number of items by bytes per item. A <code>vec4f</code> is 16 bytes (4 floats × 4 bytes). For 1000 particles with position and velocity (2 × vec2f), that&apos;s <code>1000 × 16 = 16000</code> bytes.
          </p>
        </div>
      </section>

      {/* Blend Modes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="blend">
          Blend Modes
        </h2>
        <p className="text-gray-300 mb-4">
          Control how colors are combined when rendering.
        </p>

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Presets & Custom</h3>
        <CodeBlock code={blendModesCode} language="typescript" />

        <h3 className="text-lg font-semibold text-gray-100 mt-6 mb-3">Blend Factors & Operations</h3>
        <CodeBlock code={blendFactorsCode} language="typescript" />

        <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <h4 className="font-semibold text-gray-100 mb-2">alpha</h4>
            <p className="text-gray-400 text-xs">Standard transparency</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <h4 className="font-semibold text-gray-100 mb-2">additive</h4>
            <p className="text-gray-400 text-xs">Glow, fire, bright effects</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <h4 className="font-semibold text-gray-100 mb-2">multiply</h4>
            <p className="text-gray-400 text-xs">Darken, shadows</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <h4 className="font-semibold text-gray-100 mb-2">screen</h4>
            <p className="text-gray-400 text-xs">Lighten, highlights</p>
          </div>
        </div>
      </section>

      {/* Auto-Injected Globals */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="globals">
          Auto-Injected Globals
        </h2>
        <p className="text-gray-300 mb-4">
          Every shader automatically has access to the <code>globals</code> uniform — no declaration needed.
        </p>
        <CodeBlock code={globalsStructCode} language="wgsl" />

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-mono text-primary-400 mb-2">resolution</h4>
            <p className="text-gray-400 text-sm">Width and height of current render target in pixels.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-mono text-primary-400 mb-2">time</h4>
            <p className="text-gray-400 text-sm">Seconds since init. Affected by <code>timeScale</code> and <code>paused</code>.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-mono text-primary-400 mb-2">deltaTime</h4>
            <p className="text-gray-400 text-sm">Seconds since last frame. Use for frame-rate independent animation.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-mono text-primary-400 mb-2">frame</h4>
            <p className="text-gray-400 text-sm">Integer frame count. Useful for alternating effects or debugging.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 sm:col-span-2">
            <h4 className="font-mono text-primary-400 mb-2">aspect</h4>
            <p className="text-gray-400 text-sm">Resolution width divided by height. Use to correct for non-square pixels.</p>
          </div>
        </div>
      </section>

      {/* Uniform Types */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="uniforms">
          Uniform Types
        </h2>
        <p className="text-gray-300 mb-4">
          JavaScript values are automatically converted to WGSL types.
        </p>
        <CodeBlock code={uniformTypesCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-200">
          <strong>Reactive updates:</strong> When you change a uniform&apos;s <code>.value</code>, the change is automatically uploaded to the GPU before the next draw call. No manual update needed.
        </div>
      </section>

      {/* Errors */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="errors">
          Error Types
        </h2>
        <p className="text-gray-300 mb-4">
          ralph-gpu exports typed errors for better error handling.
        </p>
        <CodeBlock code={errorsCode} language="typescript" />

        <div className="mt-4 space-y-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-red-400 mb-2">WebGPUNotSupportedError</h4>
            <p className="text-gray-400 text-sm">
              Thrown when <code>navigator.gpu</code> is undefined. The browser doesn&apos;t support WebGPU. Show a fallback UI.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-red-400 mb-2">DeviceCreationError</h4>
            <p className="text-gray-400 text-sm">
              Thrown when the GPU device couldn&apos;t be created. May happen with unsupported hardware or driver issues.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="font-semibold text-red-400 mb-2">ShaderCompileError</h4>
            <p className="text-gray-400 text-sm">
              Thrown when WGSL code has syntax errors. Includes <code>line</code>, <code>column</code>, and <code>message</code> properties for debugging.
            </p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/examples"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">Examples →</h3>
            <p className="text-gray-400 text-sm">
              See the API in action with live demos.
            </p>
          </a>
          <a
            href="/concepts"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">Core Concepts →</h3>
            <p className="text-gray-400 text-sm">
              Understand the architecture and patterns.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
