import { CodeBlock } from '@/components/CodeBlock'

export default function GLContextAPI() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">GLContext</h1>
      <p className="mb-8 text-lg text-zinc-400">
        WebGL 2.0 context wrapper that manages the WebGL context, global state, and provides 
        factory methods for creating passes, materials, and render targets.
      </p>

      {/* Initialization */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Initialization</h2>
        <p className="mb-4 text-zinc-400">
          Use the <code className="text-emerald-400">gl</code> factory to create a GLContext:
        </p>
        <CodeBlock 
          code={`import { gl } from 'ralph-gl'

// Check WebGL 2.0 support
if (!gl.isSupported()) {
  console.error('WebGL 2.0 not supported')
}

// Initialize context
const ctx = await gl.init(canvas, {
  alpha: true,           // Enable alpha channel
  antialias: false,      // Disable antialiasing
  depth: false,          // Disable depth buffer
  stencil: false,        // Disable stencil buffer
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
})`}
          language="typescript"
        />

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
                <td className="px-4 py-3 text-emerald-400 font-mono">alpha</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                <td className="px-4 py-3 text-zinc-500">true</td>
                <td className="px-4 py-3 text-zinc-400">Enable alpha channel</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">antialias</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                <td className="px-4 py-3 text-zinc-500">false</td>
                <td className="px-4 py-3 text-zinc-400">Enable antialiasing</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">depth</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                <td className="px-4 py-3 text-zinc-500">false</td>
                <td className="px-4 py-3 text-zinc-400">Enable depth buffer</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">stencil</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                <td className="px-4 py-3 text-zinc-500">false</td>
                <td className="px-4 py-3 text-zinc-400">Enable stencil buffer</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">powerPreference</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">string</td>
                <td className="px-4 py-3 text-zinc-500">'high-performance'</td>
                <td className="px-4 py-3 text-zinc-400">GPU preference hint</td>
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
                <td className="px-4 py-3 text-emerald-400 font-mono">gl</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">WebGL2RenderingContext</td>
                <td className="px-4 py-3 text-zinc-400">Underlying WebGL context</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">canvas</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">HTMLCanvasElement</td>
                <td className="px-4 py-3 text-zinc-400">The canvas element</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">width</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Canvas width in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">height</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Canvas height in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">time</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Time since creation in seconds</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">deltaTime</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Time elapsed since last frame</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">frame</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Current frame number</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">dpr</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Device pixel ratio</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">timeScale</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Time scale multiplier (default: 1.0)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">paused</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">boolean</td>
                <td className="px-4 py-3 text-zinc-400">Whether the context is paused</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Factory Methods */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Factory Methods</h2>

        {/* pass() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            pass(fragmentGLSL, options?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Create a fullscreen fragment shader pass.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">fragmentGLSL</code> - Fragment shader source</li>
            <li><code className="text-emerald-400">options</code> - Optional PassOptions</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">Pass</p>
          <CodeBlock 
            code={`const pass = ctx.pass(\`
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(uv, sin(u_time) * 0.5 + 0.5, 1.0);
  }
\`)`}
            language="typescript"
          />
        </div>

        {/* material() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            material(vertexGLSL, fragmentGLSL, options?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Create a material with custom vertex and fragment shaders.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">vertexGLSL</code> - Vertex shader source</li>
            <li><code className="text-emerald-400">fragmentGLSL</code> - Fragment shader source</li>
            <li><code className="text-emerald-400">options</code> - Optional MaterialOptions</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">Material</p>
          <CodeBlock 
            code={`const material = ctx.material(
  vertexShader,
  fragmentShader,
  { vertexCount: 3, topology: 'triangles' }
)`}
            language="typescript"
          />
        </div>

        {/* target() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            target(width?, height?, options?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Create an offscreen render target for render-to-texture.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">width</code> - Width in pixels (default: canvas width)</li>
            <li><code className="text-emerald-400">height</code> - Height in pixels (default: canvas height)</li>
            <li><code className="text-emerald-400">options</code> - Optional RenderTargetOptions</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">RenderTarget</p>
          <CodeBlock 
            code={`const target = ctx.target(512, 512, {
  format: 'rgba16f',
  filter: 'linear',
  wrap: 'clamp'
})`}
            language="typescript"
          />
        </div>

        {/* pingPong() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            pingPong(width?, height?, options?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Create a ping-pong buffer pair for iterative effects like feedback or simulation.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">width</code> - Width in pixels (default: canvas width)</li>
            <li><code className="text-emerald-400">height</code> - Height in pixels (default: canvas height)</li>
            <li><code className="text-emerald-400">options</code> - Optional RenderTargetOptions</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">PingPongTarget</p>
          <CodeBlock 
            code={`const buffer = ctx.pingPong(512, 512)

// In render loop:
ctx.setTarget(buffer.write)
feedbackPass.setUniform('u_input', buffer.read)
feedbackPass.draw()
buffer.swap()`}
            language="typescript"
          />
        </div>

        {/* storage() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            storage(byteSize)
          </h3>
          <p className="mb-4 text-zinc-400">
            Create a storage buffer for large data (emulated via vertex buffers).
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">byteSize</code> - Size in bytes</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">StorageBuffer</p>
          <CodeBlock 
            code={`const positions = ctx.storage(1024 * 4 * 4) // 1024 vec4s
positions.write(new Float32Array([...]))

// Bind to material as vertex attribute
material.storage('a_position', positions, { divisor: 1 })`}
            language="typescript"
          />
        </div>
      </section>

      {/* Other Methods */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Methods</h2>

        {/* setTarget() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            setTarget(target)
          </h3>
          <p className="mb-4 text-zinc-400">
            Set the active render target. Pass null to render to the canvas.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">target</code> - RenderTarget or null for canvas</li>
          </ul>
          <CodeBlock 
            code={`// Render to texture
ctx.setTarget(offscreen)
pass1.draw()

// Render to canvas
ctx.setTarget(null)
pass2.draw()`}
            language="typescript"
          />
        </div>

        {/* clear() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            clear(color?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Clear the current render target.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">color</code> - Optional RGBA array [r, g, b, a]</li>
          </ul>
          <CodeBlock 
            code={`ctx.clear() // Clear to default
ctx.clear([0.1, 0.1, 0.1, 1.0]) // Clear to dark gray`}
            language="typescript"
          />
        </div>

        {/* resize() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            resize(width, height)
          </h3>
          <p className="mb-4 text-zinc-400">
            Resize the canvas.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">width</code> - New width in pixels</li>
            <li><code className="text-emerald-400">height</code> - New height in pixels</li>
          </ul>
          <CodeBlock 
            code={`ctx.resize(1920, 1080)`}
            language="typescript"
          />
        </div>

        {/* dispose() */}
        <div className="rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            dispose()
          </h3>
          <p className="mb-4 text-zinc-400">
            Clean up all WebGL resources.
          </p>
          <CodeBlock 
            code={`ctx.dispose()`}
            language="typescript"
          />
        </div>
      </section>
    </div>
  )
}
