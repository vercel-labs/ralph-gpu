import Link from 'next/link'
import { CodeBlock } from '@/components/CodeBlock'

const apiClasses = [
  {
    title: 'GLContext',
    description: 'WebGL 2.0 context wrapper that manages state and provides factory methods',
    href: '/api/context',
    methods: ['pass()', 'material()', 'target()', 'pingPong()', 'storage()'],
  },
  {
    title: 'Pass',
    description: 'Fullscreen fragment shader rendering with automatic quad generation',
    href: '/api/pass',
    methods: ['draw()', 'setUniform()', 'setBlend()', 'destroy()'],
  },
  {
    title: 'Material',
    description: 'Custom geometry rendering with vertex and fragment shaders',
    href: '/api/material',
    methods: ['draw()', 'set()', 'storage()', 'setBlend()', 'dispose()'],
  },
  {
    title: 'RenderTarget',
    description: 'Offscreen framebuffer wrapper for render-to-texture',
    href: '/api/target',
    methods: ['resize()', 'readPixels()', 'dispose()'],
  },
]

export default function APIOverview() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">API Reference</h1>
      <p className="mb-8 text-lg text-zinc-400">
        Complete API documentation for ralph-gl. This library provides a simple, 
        ergonomic interface for WebGL 2.0 rendering with GLSL shaders.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Quick Start</h2>
        <CodeBlock 
          code={`import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create a pass and render
const pass = ctx.pass(\`
  void main() {
    fragColor = vec4(1.0, 0.0, 0.5, 1.0);
  }
\`)

pass.draw()`}
          language="typescript"
        />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-white">Global Uniforms</h2>
        <p className="mb-4 text-zinc-400">
          These uniforms are automatically available in all shaders:
        </p>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Uniform</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-zinc-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">u_resolution</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">vec2</td>
                <td className="px-4 py-3 text-zinc-400">Canvas width and height in pixels</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">u_time</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">float</td>
                <td className="px-4 py-3 text-zinc-400">Time since context creation in seconds</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">u_deltaTime</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">float</td>
                <td className="px-4 py-3 text-zinc-400">Time elapsed since last frame</td>
              </tr>
              <tr className="bg-zinc-900/50">
                <td className="px-4 py-3 text-emerald-400 font-mono">u_frame</td>
                <td className="px-4 py-3 text-zinc-400 font-mono">int</td>
                <td className="px-4 py-3 text-zinc-400">Current frame number</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-white">Classes</h2>
        <div className="grid gap-4">
          {apiClasses.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <h3 className="mb-2 text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="mb-4 text-zinc-400">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.methods.map((method) => (
                  <span
                    key={method}
                    className="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
