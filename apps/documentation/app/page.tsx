export default function Home() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-4xl font-bold text-white">ralph-gl</h1>
      <p className="mb-6 text-lg text-zinc-400">
        A minimal WebGL library for creative coding and graphics experiments.
      </p>
      
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">Features</h2>
          <ul className="list-inside list-disc space-y-2 text-zinc-400">
            <li>Simple, ergonomic API</li>
            <li>GLSL ES 3.0 support</li>
            <li>Fullscreen shader passes</li>
            <li>Render targets and ping-pong buffers</li>
            <li>Custom materials with instancing</li>
            <li>Blend modes</li>
          </ul>
        </section>
        
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">Quick Start</h2>
          <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 border border-zinc-800">
            <code>{`npm install ralph-gl`}</code>
          </pre>
        </section>
      </div>
    </div>
  )
}
