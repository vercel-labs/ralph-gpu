'use client';

import { getAllExamples } from '@/lib/examples';
import { ExampleCard } from '@/components/ExampleCard';

export default function ExamplesPage() {
  const examples = getAllExamples();

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          Examples Gallery
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl">
          Explore interactive WebGPU shaders built with ralph-gpu. Click any example to open it in the playground and experiment with the code.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {examples.map((example) => (
          <ExampleCard key={example.slug} example={example} />
        ))}
      </div>

      {/* Tips Section */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">
          Tips for Shader Development
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-2">🎨 UV Coordinates</h3>
            <p className="text-slate-400 text-sm">
              Always normalize pixel coordinates: <code>let uv = pos.xy / globals.resolution</code>. 
              This gives you values from 0-1 which are easier to work with.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-2">⏱️ Time Animation</h3>
            <p className="text-slate-400 text-sm">
              Use <code>globals.time</code> for smooth animation. For physics, use <code>globals.deltaTime</code> to stay frame-rate independent.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-2">🔧 Debugging</h3>
            <p className="text-slate-400 text-sm">
              Output intermediate values as colors to debug: <code>return vec4f(myValue, 0.0, 0.0, 1.0)</code>. 
              Red channel shows your value visually.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-2">📐 Aspect Ratio</h3>
            <p className="text-slate-400 text-sm">
              For circular effects, correct for aspect ratio: <code>let centered = (uv - 0.5) * vec2f(globals.aspect, 1.0)</code>
            </p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/concepts"
            className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 transition-colors group"
          >
            <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-primary-400 transition-colors">Core Concepts →</h3>
            <p className="text-slate-400 text-sm">
              Learn about ping-pong, compute, and more.
            </p>
          </a>
          <a
            href="/api"
            className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 transition-colors group"
          >
            <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-primary-400 transition-colors">API Reference →</h3>
            <p className="text-slate-400 text-sm">
              Complete documentation of all methods.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
