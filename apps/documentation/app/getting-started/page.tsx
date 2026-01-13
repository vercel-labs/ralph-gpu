import { CodeBlock } from '@/components/CodeBlock'

export default function GettingStarted() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-4xl font-bold text-white">Getting Started</h1>
      <p className="mb-6 text-lg text-zinc-400">
        Learn how to set up ralph-gl in your project.
      </p>
      
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">Installation</h2>
          <CodeBlock 
            code={`npm install ralph-gl
# or
pnpm add ralph-gl`}
            language="bash"
          />
        </section>
        
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">Basic Usage</h2>
          <CodeBlock 
            code={`import { gl } from 'ralph-gl'

// Initialize context
const ctx = await gl.init(canvas)

// Create a fullscreen pass
const pass = ctx.pass(\`
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(uv, 0.5, 1.0);
  }
\`)

// Render loop
function render() {
  ctx.clear()
  pass.draw()
  requestAnimationFrame(render)
}
render()`}
            language="typescript"
          />
        </section>
        
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">Next Steps</h2>
          <p className="text-zinc-400">
            Check out the examples to see ralph-gl in action.
          </p>
        </section>
      </div>
    </div>
  )
}
