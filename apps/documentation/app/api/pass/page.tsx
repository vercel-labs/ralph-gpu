import { CodeBlock } from '@/components/CodeBlock'

export default function PassAPI() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">Pass</h1>
      <p className="mb-8 text-lg text-zinc-400">
        Fullscreen fragment shader rendering. Automatically generates a fullscreen quad
        and injects global uniforms. Perfect for post-processing, raymarching, and shader art.
      </p>

      {/* Constructor */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Constructor</h2>
        <p className="mb-4 text-zinc-400">
          Create a Pass using the context factory method:
        </p>
        <CodeBlock
            code={`const pass = ctx.pass(fragmentGLSL, options?)`}
            language="typescript"
          />

        <h3 className="mb-3 text-lg font-semibold text-white">Options</h3>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Option</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">vertexShader</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">string</td>
                <td className="px-4 py-3 text-zinc-400">Custom vertex shader (default: fullscreen quad)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">uniforms</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">Record&lt;string, {'{value}'}&gt;</td>
                <td className="px-4 py-3 text-zinc-400">Initial uniform values</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">blend</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">BlendMode | BlendConfig</td>
                <td className="px-4 py-3 text-zinc-400">Blend mode preset or custom config</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Fragment Shader */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Fragment Shader</h2>
        <p className="mb-4 text-zinc-400">
          Write GLSL ES 3.0 fragment shaders. The fragment output is <code className="text-emerald-400">fragColor</code>.
          UV coordinates are available via <code className="text-emerald-400">v_uv</code> (0-1 range).
        </p>
        <CodeBlock
            code={`#version 300 es
precision highp float;

// Automatically provided by vertex shader
in vec2 v_uv;

// Automatically injected global uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_deltaTime;
uniform int u_frame;

// Custom uniforms
uniform float u_speed;
uniform vec3 u_color;

out vec4 fragColor;

void main() {
  vec2 uv = v_uv;
  
  // Create animated pattern
  float wave = sin(uv.x * 10.0 + u_time * u_speed) * 0.5 + 0.5;
  
  fragColor = vec4(u_color * wave, 1.0);
}`}
            language="glsl"
          />

        <div className="rounded-lg bg-zinc-900/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-white">Note:</strong> The <code className="text-emerald-400">#version 300 es</code> and 
            <code className="text-emerald-400">precision</code> declarations are recommended but 
            ralph-gl will work without them for simple shaders.
          </p>
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
            Draw the fullscreen quad with the fragment shader.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <CodeBlock
            code={`function render() {
  ctx.clear()
  pass.draw()
  requestAnimationFrame(render)
}
render()`}
            language="typescript"
          />
        </div>

        {/* setUniform() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            setUniform(name, value)
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
          <CodeBlock
            code={`// Float
pass.setUniform('u_intensity', 0.5)

// Vec2
pass.setUniform('u_mouse', [mouseX, mouseY])

// Vec3
pass.setUniform('u_color', [1.0, 0.5, 0.0])

// Vec4
pass.setUniform('u_bounds', [0, 0, 100, 100])

// Texture (RenderTarget)
pass.setUniform('u_texture', renderTarget)

// Chaining
pass
  .setUniform('u_speed', 2.0)
  .setUniform('u_color', [1, 0, 0])
  .draw()`}
            language="typescript"
          />
        </div>

        {/* setBlend() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            setBlend(blend)
          </h3>
          <p className="mb-4 text-zinc-400">
            Set the blend mode for this pass.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">blend</code> - Blend mode: 'alpha' | 'additive' | 'multiply' | 'screen' | 'none' | BlendConfig</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">this (for chaining)</p>
          <CodeBlock
            code={`// Use preset
pass.setBlend('additive')

// Or set in constructor
const pass = ctx.pass(shader, { blend: 'alpha' })`}
            language="typescript"
          />
        </div>

        {/* destroy() */}
        <div className="rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            destroy()
          </h3>
          <p className="mb-4 text-zinc-400">
            Clean up WebGL resources (program, VAO).
          </p>
          <CodeBlock
            code={`pass.destroy()`}
            language="typescript"
          />
        </div>
      </section>

      {/* Uniform Types */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Supported Uniform Types</h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">JavaScript Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">GLSL Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">float</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">0.5</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">[n, n]</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">vec2</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">[1.0, 2.0]</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">[n, n, n]</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">vec3</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">[1.0, 0.5, 0.0]</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">[n, n, n, n]</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">vec4</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">[1, 1, 1, 1]</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">Float32Array(9)</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">mat3</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">new Float32Array(9)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">Float32Array(16)</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">mat4</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">new Float32Array(16)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-400 font-mono">RenderTarget</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">sampler2D</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">ctx.target()</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Example */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-white">Complete Example</h2>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
          <code>{`import { gl } from 'ralph-gl'

const canvas = document.getElementById('canvas')
const ctx = await gl.init(canvas)

// Create animated gradient pass
const pass = ctx.pass(\`
  #version 300 es
  precision highp float;
  
  in vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  
  out vec4 fragColor;
  
  void main() {
    vec2 uv = v_uv;
    
    // Animated gradient
    float t = sin(uv.x * 3.14159 + u_time) * 0.5 + 0.5;
    vec3 color = mix(u_colorA, u_colorB, t);
    
    fragColor = vec4(color, 1.0);
  }
\`)

// Set initial uniforms
pass
  .setUniform('u_colorA', [0.1, 0.2, 0.5])
  .setUniform('u_colorB', [0.9, 0.3, 0.1])

// Render loop
function render() {
  ctx.time = performance.now() / 1000
  pass.draw()
  requestAnimationFrame(render)
}
render()`}</code>
        </pre>
      </section>
    </div>
  )
}
