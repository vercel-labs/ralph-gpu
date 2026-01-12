import { CodeBlock } from '@/components/CodeBlock';
import { Callout } from '@/components/mdx/Callout';

const contextCode = `import { gpu } from "ralph-gpu";

const ctx = await gpu.init(canvas, {
  dpr: Math.min(window.devicePixelRatio, 2),
  debug: true,
});

// Properties
ctx.width       // Canvas width in pixels
ctx.height      // Canvas height in pixels
ctx.time        // Elapsed time in seconds
ctx.timeScale   // Time multiplier (default: 1)
ctx.paused      // Pause time updates
ctx.autoClear   // Auto-clear before draw (default: true)`;

const passCode = `const gradient = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\`);

gradient.draw(); // Render to screen`;

const materialCode = `const particles = ctx.material(\`
  struct Particle { pos: vec2f, color: vec3f }
  @group(1) @binding(0) var<storage, read> particles: array<Particle>;

  @vertex
  fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32
  ) -> @builtin(position) vec4f {
    var quad = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
    );
    return vec4f(particles[iid].pos + quad[vid] * 0.01, 0.0, 1.0);
  }

  @fragment
  fn fs_main() -> @location(0) vec4f {
    return vec4f(1.0);
  }
\`, {
  vertexCount: 6,      // Vertices per instance (quad)
  instances: 10000,    // Number of particles
  blend: "additive",   // Blending mode
});

particles.storage("particles", particleBuffer);
particles.draw();`;

const targetCode = `// Create a 512x512 render target
const buffer = ctx.target(512, 512, {
  format: "rgba16float", // High precision
  filter: "linear",      // Smooth sampling
  wrap: "clamp",         // Edge handling
});

// Render to the target
ctx.setTarget(buffer);
scene.draw();

// Use as texture in another shader
const displayUniforms = {
  inputTex: { value: buffer.texture },
};
ctx.setTarget(null); // Back to screen
display.draw();`;

const pingPongCode = `// Create ping-pong buffers for iterative effects
const velocity = ctx.pingPong(128, 128, { format: "rg16float" });

// Simulation loop
function simulate() {
  // Read from .read, write to .write
  advectionUniforms.source.value = velocity.read.texture;
  ctx.setTarget(velocity.write);
  advection.draw();
  
  // Swap buffers for next iteration
  velocity.swap();
}`;

const computeCode = `const simulation = ctx.compute(\`
  struct Particle { pos: vec2f, vel: vec2f }
  @group(1) @binding(0) var<storage, read_write> particles: array<Particle>;

  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    particles[i].pos += particles[i].vel * globals.deltaTime;
    
    // Wrap around edges
    particles[i].pos = fract(particles[i].pos);
  }
\`);

// Bind storage and dispatch
simulation.storage("particles", particleBuffer);
simulation.dispatch(numParticles / 64);`;

const storageCode = `// Create a storage buffer (4 floats per particle × 1000 particles)
const particleBuffer = ctx.storage(4 * 4 * 1000);

// Write initial data
const initialData = new Float32Array(4 * 1000);
for (let i = 0; i < 1000; i++) {
  initialData[i * 4 + 0] = Math.random(); // x
  initialData[i * 4 + 1] = Math.random(); // y
  initialData[i * 4 + 2] = Math.random() * 0.01; // vx
  initialData[i * 4 + 3] = Math.random() * 0.01; // vy
}
particleBuffer.write(initialData);

// Use in compute shader
compute.storage("particles", particleBuffer);`;

const globalsCode = `struct Globals {
  resolution: vec2f,  // Render target size in pixels
  time: f32,          // Elapsed time (seconds, affected by timeScale)
  deltaTime: f32,     // Time since last frame (seconds)
  frame: u32,         // Frame count since init
  aspect: f32,        // resolution.x / resolution.y
}
@group(0) @binding(0) var<uniform> globals: Globals;`;

const uniformsCode = `const uniforms = {
  amplitude: { value: 0.5 },
  color: { value: [1.0, 0.2, 0.5] },
};

const wave = ctx.pass(\`
  struct Params { amplitude: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let y = sin(uv.x * 10.0 + globals.time) * u.amplitude;
    return vec4f(u.color, 1.0);
  }
\`, { uniforms });

// Update at any time - changes reflected automatically
uniforms.amplitude.value = 0.8;
uniforms.color.value = [0.2, 1.0, 0.5];`;

export default function ConceptsPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Core Concepts
      </h1>
      <p className="text-xl text-neutral-400 mb-12">
        Understanding the key abstractions in ralph-gpu.
      </p>

      {/* Overview Diagram */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-neutral-300 mb-6">
          ralph-gpu provides a small set of composable primitives that cover most GPU graphics needs:
        </p>
        
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">ctx</div>
              <div className="text-neutral-400 text-sm">GPU Context</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">pass</div>
              <div className="text-neutral-400 text-sm">Fullscreen Shader</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">material</div>
              <div className="text-neutral-400 text-sm">Custom Vertex</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">target</div>
              <div className="text-neutral-400 text-sm">Render Target</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">pingPong</div>
              <div className="text-neutral-400 text-sm">Double Buffer</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="text-blue-400 font-mono text-lg mb-2">compute</div>
              <div className="text-neutral-400 text-sm">GPU Compute</div>
            </div>
          </div>
        </div>

        {/* Data Flow Diagram */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800">
          <h3 className="font-semibold text-white mb-4">Typical Data Flow</h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
            <div className="px-4 py-2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Storage Buffer
            </div>
            <span className="text-neutral-500">→</span>
            <div className="px-4 py-2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Compute Shader
            </div>
            <span className="text-neutral-500">→</span>
            <div className="px-4 py-2 rounded bg-green-500/20 text-green-300 border border-green-500/30">
              Material / Pass
            </div>
            <span className="text-neutral-500">→</span>
            <div className="px-4 py-2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Target / Screen
            </div>
          </div>
        </div>
      </section>

      {/* GPUContext */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="context">
          GPUContext (ctx)
        </h2>
        <p className="text-neutral-300 mb-4">
          The context is your entry point to ralph-gpu. It manages the WebGPU device, canvas, and provides factory methods for all other primitives.
        </p>
        <CodeBlock code={contextCode} language="typescript" />
        <div className="mt-4 p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <h3 className="font-semibold text-white mb-2">Context Responsibilities</h3>
          <ul className="text-neutral-400 space-y-1 text-sm">
            <li>• Manages the WebGPU device and canvas</li>
            <li>• Tracks time and updates the globals uniform</li>
            <li>• Creates shaders, targets, and compute pipelines</li>
            <li>• Handles resource cleanup with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">dispose()</code></li>
          </ul>
        </div>
      </section>

      {/* Pass */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="pass">
          Pass (Fullscreen Shader)
        </h2>
        <p className="text-neutral-300 mb-4">
          A <strong>pass</strong> is the simplest way to draw something — just write a fragment shader and it renders fullscreen. Perfect for backgrounds, post-processing, and visual effects.
        </p>
        <CodeBlock code={passCode} language="typescript" />
        <Callout type="info">
          <strong>Behind the scenes:</strong> ralph-gpu creates an internal full-screen quad and runs your fragment shader for every pixel. You only write the fragment code.
        </Callout>
      </section>

      {/* Material */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="material">
          Material (Custom Geometry)
        </h2>
        <p className="text-neutral-300 mb-4">
          A <strong>material</strong> gives you full control over the vertex and fragment stages. Use it for particles, instanced geometry, or any custom rendering.
        </p>
        <CodeBlock code={materialCode} language="typescript" />
      </section>

      {/* Render Target */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="target">
          Render Target
        </h2>
        <p className="text-neutral-300 mb-4">
          A <strong>target</strong> is an offscreen texture you can render to. Use it for multi-pass effects, blur, reflections, or any technique that needs intermediate results.
        </p>
        <CodeBlock code={targetCode} language="typescript" />
      </section>

      {/* Ping-Pong */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="ping-pong">
          Ping-Pong Buffers
        </h2>
        <p className="text-neutral-300 mb-4">
          <strong>Ping-pong</strong> is a pair of render targets used for iterative effects. You read from one while writing to the other, then swap them. Essential for fluid simulation, blur, and any feedback effect.
        </p>
        <CodeBlock code={pingPongCode} language="typescript" />
        <div className="mt-4 p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <h4 className="font-semibold text-white mb-2">Why ping-pong?</h4>
          <p className="text-neutral-400 text-sm">
            GPUs can&apos;t read from and write to the same texture in a single pass. Ping-pong gives you two textures that trade roles each frame: one is the source, one is the destination.
          </p>
        </div>
      </section>

      {/* Compute */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="compute">
          Compute Shaders
        </h2>
        <p className="text-neutral-300 mb-4">
          <strong>Compute shaders</strong> run parallel computations on the GPU without rendering anything. Use them for physics, particle updates, or any data processing.
        </p>
        <CodeBlock code={computeCode} language="typescript" />
        <Callout type="warning">
          <strong>Workgroup size:</strong> The <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">@workgroup_size(64)</code> annotation defines how many threads run together. When dispatching, divide your total count by the workgroup size.
        </Callout>
      </section>

      {/* Storage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="storage">
          Storage Buffers
        </h2>
        <p className="text-neutral-300 mb-4">
          <strong>Storage buffers</strong> hold large amounts of data on the GPU. Unlike uniforms (which are limited in size), storage buffers can hold millions of items.
        </p>
        <CodeBlock code={storageCode} language="typescript" />
      </section>

      {/* Auto-Injected Globals */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="globals">
          Auto-Injected Globals
        </h2>
        <p className="text-neutral-300 mb-4">
          Every shader automatically has access to the <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">globals</code> uniform. You don&apos;t need to declare it — ralph-gpu injects it for you.
        </p>
        <CodeBlock code={globalsCode} language="wgsl" />
      </section>

      {/* Custom Uniforms */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="uniforms">
          Custom Uniforms
        </h2>
        <p className="text-neutral-300 mb-4">
          Pass custom data to your shaders using the three.js-style <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">{`{ value: X }`}</code> pattern. Changes to <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">.value</code> are automatically uploaded to the GPU.
        </p>
        <CodeBlock code={uniformsCode} language="typescript" />
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/api"
            className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 transition-colors"
          >
            <h3 className="font-semibold text-white mb-2">API Reference →</h3>
            <p className="text-neutral-400 text-sm">
              Complete documentation of all methods and properties.
            </p>
          </a>
          <a
            href="/examples"
            className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 transition-colors"
          >
            <h3 className="font-semibold text-white mb-2">Examples →</h3>
            <p className="text-neutral-400 text-sm">
              Interactive demos with live code.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
