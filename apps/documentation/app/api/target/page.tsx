import { CodeBlock } from '@/components/CodeBlock'

export default function RenderTargetAPI() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">RenderTarget</h1>
      <p className="mb-8 text-lg text-zinc-400">
        Offscreen framebuffer wrapper for render-to-texture operations. Allows rendering to a texture
        instead of the canvas, enabling post-processing effects, multi-pass rendering, and texture sampling.
      </p>

      {/* Constructor */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Constructor</h2>
        <p className="mb-4 text-zinc-400">
          Create a RenderTarget using the context factory method:
        </p>
        <CodeBlock
            code={`const target = ctx.target(width?, height?, options?)`}
            language="typescript"
          />

        <h3 className="mb-3 text-lg font-semibold text-white">Parameters</h3>
        <div className="rounded-lg border border-zinc-800 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Parameter</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Default</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">width</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-500">canvas width</td>
                <td className="px-4 py-3 text-zinc-400">Width in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">height</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-500">canvas height</td>
                <td className="px-4 py-3 text-zinc-400">Height in pixels</td>
              </tr>
            </tbody>
          </table>
        </div>

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
                <td className="px-4 py-3 text-emerald-400 font-mono">format</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">TextureFormat</td>
                <td className="px-4 py-3 text-zinc-500">'rgba8'</td>
                <td className="px-4 py-3 text-zinc-400">Texture format</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">filter</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">'nearest' | 'linear'</td>
                <td className="px-4 py-3 text-zinc-500">'linear'</td>
                <td className="px-4 py-3 text-zinc-400">Texture filtering mode</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">wrap</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">'clamp' | 'repeat' | 'mirror'</td>
                <td className="px-4 py-3 text-zinc-500">'clamp'</td>
                <td className="px-4 py-3 text-zinc-400">Texture wrapping mode</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Texture Formats */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Texture Formats</h2>
        <p className="mb-4 text-zinc-400">
          Available texture formats for the <code className="text-emerald-400">format</code> option:
        </p>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Format</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Bytes/Pixel</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'rgba8'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">4</td>
                <td className="px-4 py-3 text-zinc-400">8-bit per channel RGBA (default, most compatible)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'rgba16f'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">8</td>
                <td className="px-4 py-3 text-zinc-400">16-bit float per channel (HDR, better precision)</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">'rgba32f'</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">16</td>
                <td className="px-4 py-3 text-zinc-400">32-bit float per channel (highest precision)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg bg-zinc-900/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-white">Note:</strong> Float formats (rgba16f, rgba32f) require the 
            <code className="text-emerald-400">EXT_color_buffer_float</code> extension which is widely supported
            on modern hardware. Use them for simulations, HDR effects, or when you need values outside 0-1 range.
          </p>
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
                <td className="px-4 py-3 text-emerald-400 font-mono">framebuffer</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">WebGLFramebuffer | null</td>
                <td className="px-4 py-3 text-zinc-400">Underlying framebuffer object</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">texture</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">WebGLTexture | null</td>
                <td className="px-4 py-3 text-zinc-400">Color attachment texture</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">width</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Width in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">height</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">number</td>
                <td className="px-4 py-3 text-zinc-400">Height in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">format</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">TextureFormat</td>
                <td className="px-4 py-3 text-zinc-400">Texture format</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">filter</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">'nearest' | 'linear'</td>
                <td className="px-4 py-3 text-zinc-400">Texture filtering mode</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">wrap</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">'clamp' | 'repeat' | 'mirror'</td>
                <td className="px-4 py-3 text-zinc-400">Texture wrapping mode</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Methods */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Methods</h2>

        {/* resize() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            resize(width, height)
          </h3>
          <p className="mb-4 text-zinc-400">
            Resize the render target. Recreates the texture with the new dimensions.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">width</code> - New width in pixels</li>
            <li><code className="text-emerald-400">height</code> - New height in pixels</li>
          </ul>
          <CodeBlock
            code={`// Resize to match canvas
target.resize(ctx.width, ctx.height)

// Resize to fixed dimensions
target.resize(512, 512)`}
            language="typescript"
          />
        </div>

        {/* readPixels() */}
        <div className="mb-8 rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            readPixels(x?, y?, width?, height?)
          </h3>
          <p className="mb-4 text-zinc-400">
            Read pixel data from the render target. Returns a typed array with RGBA values.
          </p>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Parameters</h4>
          <ul className="mb-4 list-disc pl-6 text-zinc-400 space-y-1">
            <li><code className="text-emerald-400">x</code> - Starting x coordinate (default: 0)</li>
            <li><code className="text-emerald-400">y</code> - Starting y coordinate (default: 0)</li>
            <li><code className="text-emerald-400">width</code> - Width to read (default: full width)</li>
            <li><code className="text-emerald-400">height</code> - Height to read (default: full height)</li>
          </ul>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">Returns</h4>
          <p className="mb-4 text-zinc-400 font-mono">Uint8Array (for rgba8) or Float32Array (for float formats)</p>
          <CodeBlock
            code={`// Read all pixels
const pixels = target.readPixels()
// pixels.length = width * height * 4 (RGBA)

// Read a region
const region = target.readPixels(100, 100, 50, 50)

// Access pixel values
const r = pixels[0]  // Red (0-255 for rgba8, 0-1+ for float)
const g = pixels[1]  // Green
const b = pixels[2]  // Blue
const a = pixels[3]  // Alpha

// For float formats, values can exceed 1.0
const hdrTarget = ctx.target(512, 512, { format: 'rgba16f' })
const hdrPixels = hdrTarget.readPixels() // Float32Array`}
            language="typescript"
          />
        </div>

        {/* dispose() */}
        <div className="rounded-lg border border-zinc-800 p-6">
          <h3 className="mb-2 text-xl font-semibold text-emerald-400 font-mono">
            dispose()
          </h3>
          <p className="mb-4 text-zinc-400">
            Clean up WebGL resources (framebuffer, texture).
          </p>
          <CodeBlock
            code={`target.dispose()`}
            language="typescript"
          />
        </div>
      </section>

      {/* Usage with ctx.setTarget() */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Rendering to Target</h2>
        <p className="mb-4 text-zinc-400">
          Use <code className="text-emerald-400">ctx.setTarget()</code> to switch between render targets:
        </p>
        <CodeBlock
            code={`// Create an offscreen target
const offscreen = ctx.target(512, 512)

// Render to offscreen target
ctx.setTarget(offscreen)
pass1.draw()

// Render to canvas
ctx.setTarget(null)
pass2.setUniform('u_texture', offscreen)
pass2.draw()`}
            language="typescript"
          />
      </section>

      {/* Example - Post-processing */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Example: Post-Processing</h2>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
          <code>{`import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)

// Create render target at canvas size
const sceneTarget = ctx.target()

// Scene pass renders to target
const scenePass = ctx.pass(\`
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(uv, sin(u_time) * 0.5 + 0.5, 1.0);
  }
\`)

// Post-process pass reads from target
const postPass = ctx.pass(\`
  uniform sampler2D u_scene;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec4 color = texture(u_scene, uv);
    
    // Apply vignette effect
    float d = length(uv - 0.5) * 1.5;
    color.rgb *= 1.0 - d * d;
    
    fragColor = color;
  }
\`)

function render() {
  ctx.time = performance.now() / 1000
  
  // Pass 1: Render scene to target
  ctx.setTarget(sceneTarget)
  ctx.clear()
  scenePass.draw()
  
  // Pass 2: Post-process to canvas
  ctx.setTarget(null)
  postPass.setUniform('u_scene', sceneTarget)
  postPass.draw()
  
  requestAnimationFrame(render)
}
render()`}</code>
        </pre>
      </section>

      {/* Example - PingPong Feedback */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-white">Example: Ping-Pong Feedback</h2>
        <p className="mb-4 text-zinc-400">
          For iterative effects like feedback or simulation, use <code className="text-emerald-400">ctx.pingPong()</code>:
        </p>
        <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800 overflow-x-auto">
          <code>{`import { gl } from 'ralph-gl'

const ctx = await gl.init(canvas)

// Create ping-pong buffer
const buffer = ctx.pingPong(512, 512, { format: 'rgba16f' })

// Feedback pass reads from one target, writes to other
const feedbackPass = ctx.pass(\`
  uniform sampler2D u_previous;
  uniform vec2 u_mouse;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    
    // Sample previous frame with slight offset (creates trail)
    vec2 offset = vec2(0.002, 0.0);
    vec4 prev = texture(u_previous, uv + offset) * 0.99;
    
    // Add new content at mouse position
    float d = length(uv - u_mouse);
    vec3 newColor = vec3(0.0);
    if (d < 0.02) {
      newColor = vec3(1.0, 0.5, 0.2);
    }
    
    fragColor = max(prev, vec4(newColor, 1.0));
  }
\`)

// Display pass shows result
const displayPass = ctx.pass(\`
  uniform sampler2D u_buffer;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = texture(u_buffer, uv);
  }
\`)

function render() {
  // Render to write target
  ctx.setTarget(buffer.write)
  feedbackPass.setUniform('u_previous', buffer.read)
  feedbackPass.setUniform('u_mouse', [mouseX, mouseY])
  feedbackPass.draw()
  
  // Swap read/write targets
  buffer.swap()
  
  // Display on canvas
  ctx.setTarget(null)
  displayPass.setUniform('u_buffer', buffer.read)
  displayPass.draw()
  
  requestAnimationFrame(render)
}
render()`}</code>
        </pre>
      </section>
    </div>
  )
}
