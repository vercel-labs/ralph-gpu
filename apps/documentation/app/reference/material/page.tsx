export default function MaterialAPI() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">Material</h1>
      <p className="mb-8 text-lg text-zinc-400">
        Custom geometry rendering with vertex and fragment shaders. Supports instanced rendering,
        different topologies (triangles, lines, points), and storage buffer bindings.
      </p>

      {/* Constructor */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Constructor</h2>
        <p className="mb-4 text-zinc-400">
          Create a Material using the context factory method:
        </p>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto mb-4">
          <code>{`const material = ctx.material(vertexGLSL, fragmentGLSL, options?)`}</code>
        </pre>

        <h3 className="mb-3 text-lg font-semibold text-white">Options</h3>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Option</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Default</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">uniforms</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">Record&lt;string, {'{value}'}&gt;</td>
                <td className="px-4 py-3 text-zinc-500">{'{}'}</td>
                <td className="px-4 py-3 text-zinc-400">Initial uniform values</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">vertexCount</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-500">3</td>
                <td className="px-4 py-3 text-zinc-400">Number of vertices to draw</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">instances</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-500">1</td>
                <td className="px-4 py-3 text-zinc-400">Number of instances for instanced rendering</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">topology</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">Topology</td>
                <td className="px-4 py-3 text-zinc-500">'triangles'</td>
                <td className="px-4 py-3 text-zinc-400">Primitive topology</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">blend</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">BlendMode | BlendConfig</td>
                <td className="px-4 py-3 text-zinc-500">undefined</td>
                <td className="px-4 py-3 text-zinc-400">Blend mode preset or custom config</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Topology */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Topology Options</h2>
        <p className="mb-4 text-zinc-400">
          Available topology values for the <code className="text-emerald-400">topology</code> option:
        </p>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Value</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">WebGL Mode</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'triangles'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">TRIANGLES</td>
                <td className="px-4 py-3 text-zinc-400">Independent triangles (default)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'triangle-strip'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">TRIANGLE_STRIP</td>
                <td className="px-4 py-3 text-zinc-400">Connected triangle strip</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'triangle-fan'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">TRIANGLE_FAN</td>
                <td className="px-4 py-3 text-zinc-400">Fan of triangles from first vertex</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'lines'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">LINES</td>
                <td className="px-4 py-3 text-zinc-400">Independent line segments</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'line-strip'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">LINE_STRIP</td>
                <td className="px-4 py-3 text-zinc-400">Connected line segments</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'line-loop'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">LINE_LOOP</td>
                <td className="px-4 py-3 text-zinc-400">Closed connected lines</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'points'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">POINTS</td>
                <td className="px-4 py-3 text-zinc-400">Individual points</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Properties */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Properties</h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Property</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">uniforms</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">Record&lt;string, {'{value}'}&gt;</td>
                <td className="px-4 py-3 text-zinc-400">Uniform values (Three.js style)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">vertexCount</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Number of vertices to draw</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">instances</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Instance count for instanced rendering</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">topology</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">Topology</td>
                <td className="px-4 py-3 text-zinc-400">Primitive topology</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Methods */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Methods</h2>

        {/* draw() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            draw()
          </h3>
          <p className="mb-4 text-zinc-400">
            Draw the geometry using the material shaders. Uses instanced rendering when instances &gt; 1.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
            <code>{`function render() {
  ctx.clear()
  material.draw()
  requestAnimationFrame(render)
}
render()`}</code>
          </pre>
        </div>

        {/* set() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            set(name, value)
          </h3>
          <p className="mb-4 text-zinc-400">
            Set a uniform value. The value type is automatically detected.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">name</code> - Uniform name in shader</li>
            <li><code className="text-emerald-400">value</code> - Value to set</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
            <code>{`// Set individual uniforms
material.set('u_scale', 2.0)
material.set('u_color', [1.0, 0.5, 0.0])

// Chaining
material
  .set('u_scale', 2.0)
  .set('u_color', [1, 0, 0])
  .draw()

// Or access uniforms directly
material.uniforms.u_scale = { value: 2.0 }
material.uniforms.u_color = { value: [1.0, 0.5, 0.0] }`}</code>
          </pre>
        </div>

        {/* storage() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            storage(name, buffer, options?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Bind a storage buffer as a vertex attribute. Used for passing large data arrays to shaders.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">name</code> - Attribute name in vertex shader</li>
            <li><code className="text-emerald-400">buffer</code> - StorageBuffer to bind</li>
            <li><code className="text-emerald-400">options</code> - Optional attribute configuration</li>
          </ul>
          
          <h4 className="mb-2 text-sm font-semibold text-zinc-300 mt-4">Attribute Options</h4>
          <div className="rounded-lg border border-zinc-800 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-zinc-300 font-medium">Option</th>
                  <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-zinc-300 font-medium">Default</th>
                  <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">size</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                  <td className="px-4 py-3 text-zinc-500">4</td>
                  <td className="px-4 py-3 text-zinc-400">Components per vertex (1-4)</td>
                </tr>
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">type</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                  <td className="px-4 py-3 text-zinc-500">FLOAT</td>
                  <td className="px-4 py-3 text-zinc-400">GL type (FLOAT, INT, etc)</td>
                </tr>
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">normalized</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                  <td className="px-4 py-3 text-zinc-500">false</td>
                  <td className="px-4 py-3 text-zinc-400">Normalize integers</td>
                </tr>
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">stride</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                  <td className="px-4 py-3 text-zinc-500">0</td>
                  <td className="px-4 py-3 text-zinc-400">Bytes between vertices</td>
                </tr>
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">offset</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                  <td className="px-4 py-3 text-zinc-500">0</td>
                  <td className="px-4 py-3 text-zinc-400">Byte offset in buffer</td>
                </tr>
                <tr className="bg-zinc-900/50">
                  <td className="px-4 py-3 text-emerald-400 font-mono">divisor</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                  <td className="px-4 py-3 text-zinc-500">0</td>
                  <td className="px-4 py-3 text-zinc-400">Instance divisor (1 for per-instance data)</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
            <code>{`// Create storage buffer with position data
const positions = ctx.storage(1000 * 4 * 4) // 1000 vec4s
positions.write(new Float32Array(positionData))

// Bind to material with per-instance divisor
material.storage('a_position', positions, { 
  size: 4,
  divisor: 1  // One value per instance
})`}</code>
          </pre>
        </div>

        {/* setBlend() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            setBlend(blend)
          </h3>
          <p className="mb-4 text-zinc-400">
            Set the blend mode for this material.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">blend</code> - Blend mode: 'alpha' | 'additive' | 'multiply' | 'screen' | 'none' | BlendConfig</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
            <code>{`// Use preset for additive blending (good for particles)
material.setBlend('additive')

// Or set in constructor
const material = ctx.material(vertex, fragment, { 
  blend: 'alpha' 
})`}</code>
          </pre>
        </div>

        {/* dispose() */}
        <div className="rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            dispose()
          </h3>
          <p className="mb-4 text-zinc-400">
            Clean up WebGL resources (program, VAO).
          </p>
          <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
            <code>{`material.dispose()`}</code>
          </pre>
        </div>
      </section>

      {/* Example - Basic Triangle */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Example: Basic Triangle</h2>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
          <code>{`import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)

const vertexShader = \`#version 300 es
precision highp float;

uniform vec2 u_resolution;

// Generate triangle vertices using gl_VertexID
void main() {
  float angle = float(gl_VertexID) / 3.0 * 6.28318 - 1.5708;
  vec2 pos = vec2(cos(angle), sin(angle)) * 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
\`

const fragmentShader = \`#version 300 es
precision highp float;

uniform vec3 u_color;
out vec4 fragColor;

void main() {
  fragColor = vec4(u_color, 1.0);
}
\`

const triangle = ctx.material(vertexShader, fragmentShader, {
  vertexCount: 3,
  topology: 'triangles'
})

triangle.set('u_color', [0.2, 0.8, 0.4])

function render() {
  ctx.clear()
  triangle.draw()
  requestAnimationFrame(render)
}
render()`}</code>
        </pre>
      </section>

      {/* Example - Instanced Particles */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-white">Example: Instanced Particles</h2>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
          <code>{`import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)
const PARTICLE_COUNT = 1000

const vertexShader = \`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// Per-instance attribute
in vec4 a_particle;  // xy: position, zw: velocity

void main() {
  // Animate position
  vec2 pos = a_particle.xy + a_particle.zw * u_time;
  pos = fract(pos);  // Wrap around
  
  // Convert to clip space
  vec2 clipPos = pos * 2.0 - 1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);
  gl_PointSize = 4.0;
}
\`

const fragmentShader = \`#version 300 es
precision highp float;
out vec4 fragColor;

void main() {
  // Circular point
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float d = length(coord);
  if (d > 1.0) discard;
  
  fragColor = vec4(1.0, 0.5, 0.2, 1.0 - d);
}
\`

// Create material for instanced point rendering
const particles = ctx.material(vertexShader, fragmentShader, {
  vertexCount: 1,
  instances: PARTICLE_COUNT,
  topology: 'points',
  blend: 'additive'
})

// Create storage buffer with random particle data
const particleData = new Float32Array(PARTICLE_COUNT * 4)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particleData[i * 4 + 0] = Math.random()     // x
  particleData[i * 4 + 1] = Math.random()     // y
  particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.1  // vx
  particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.1  // vy
}

const storage = ctx.storage(PARTICLE_COUNT * 4 * 4)
storage.write(particleData)
particles.storage('a_particle', storage, { size: 4, divisor: 1 })

function render() {
  ctx.time = performance.now() / 1000
  ctx.clear([0, 0, 0, 1])
  particles.draw()
  requestAnimationFrame(render)
}
render()`}</code>
        </pre>
      </section>
    </div>
  )
}
