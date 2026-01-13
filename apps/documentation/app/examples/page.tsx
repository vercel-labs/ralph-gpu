import Link from 'next/link'

const examples = [
  // Beginner Examples
  {
    title: 'Basic Gradient',
    description: 'Simple fullscreen gradient using fragment shaders',
    href: '/examples/basic',
    tags: ['beginner', 'fragment-shader'],
    category: 'Basics',
  },
  {
    title: 'Animated Uniforms',
    description: 'Dynamic wave effects with custom uniforms and animation',
    href: '/examples/uniforms',
    tags: ['beginner', 'uniforms', 'animation'],
    category: 'Basics',
  },
  {
    title: 'Lines & Points',
    description: 'Different line rendering techniques - SDF lines and storage buffer lines',
    href: '/examples/lines',
    tags: ['beginner', 'lines', 'topology'],
    category: 'Basics',
  },
  {
    title: 'Custom Geometry',
    description: 'Triangle and 3D cube with vertex buffers and index buffers',
    href: '/examples/geometry',
    tags: ['intermediate', 'geometry', '3d'],
    category: 'Basics',
  },

  // Intermediate Examples
  {
    title: 'Instanced Particles',
    description: 'GPU instancing for efficient particle rendering with storage buffers',
    href: '/examples/particles',
    tags: ['intermediate', 'instancing', 'particles'],
    category: 'Rendering',
  },
  {
    title: 'Material System',
    description: 'Custom vertex shaders and material properties',
    href: '/examples/material',
    tags: ['intermediate', 'materials', 'shaders'],
    category: 'Rendering',
  },
  {
    title: 'Render Target',
    description: 'Multi-pass rendering with offscreen textures and post-processing',
    href: '/examples/render-target',
    tags: ['intermediate', 'render-targets', 'post-processing'],
    category: 'Rendering',
  },
  {
    title: 'Ping-Pong Buffers',
    description: 'Iterative effects using buffer swapping for simulations',
    href: '/examples/pingpong',
    tags: ['intermediate', 'ping-pong', 'simulation'],
    category: 'Rendering',
  },

  // Advanced Raymarching Examples
  {
    title: '3D Raymarching',
    description: 'Raymarched scene with SDF primitives, lighting, soft shadows, and AO',
    href: '/examples/raymarching',
    tags: ['advanced', 'raymarching', 'sdf', 'lighting'],
    category: 'Raymarching',
  },
  {
    title: 'Metaballs',
    description: 'Organic blob shapes with smooth blending, subsurface scattering, and iridescence',
    href: '/examples/metaballs',
    tags: ['advanced', 'raymarching', 'metaballs', 'organic'],
    category: 'Raymarching',
  },
  {
    title: 'Shape Morphing',
    description: 'Smooth transitions between SDF shapes with twist and bend distortions',
    href: '/examples/morphing',
    tags: ['advanced', 'raymarching', 'morphing', 'holographic'],
    category: 'Raymarching',
  },
  {
    title: 'Mandelbulb Fractal',
    description: '3D fractal with orbit traps, iteration-based coloring, and edge glow',
    href: '/examples/mandelbulb',
    tags: ['advanced', 'raymarching', 'fractal', 'mandelbulb'],
    category: 'Raymarching',
  },
]

const categories = ['Basics', 'Rendering', 'Raymarching']

export default function Examples() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-4xl font-bold text-white">Examples</h1>
      <p className="mb-8 text-lg text-zinc-400">
        Interactive examples demonstrating ralph-gl features. Each example includes
        working code and explanations. All examples run entirely in WebGL 2.0.
      </p>

      <div className="mb-8 rounded-lg border border-emerald-900 bg-emerald-900/20 p-4">
        <p className="text-sm text-emerald-100">
          <strong>New!</strong> Added 6 new examples including advanced raymarching techniques: 
          3D scenes with lighting, metaballs with subsurface scattering, shape morphing, and the Mandelbulb fractal.
        </p>
      </div>
      
      {categories.map((category) => {
        const categoryExamples = examples.filter(ex => ex.category === category)
        return (
          <div key={category} className="mb-10">
            <h2 className="mb-4 text-2xl font-semibold text-white border-b border-zinc-800 pb-2">
              {category}
            </h2>
            <div className="grid gap-4">
              {categoryExamples.map((example) => (
                <Link
                  key={example.href}
                  href={example.href}
                  className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <h3 className="mb-2 text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {example.title}
                  </h3>
                  <p className="mb-3 text-zinc-400">{example.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {example.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-12 p-6 rounded-lg border border-zinc-800 bg-zinc-900/50">
        <h3 className="text-lg font-semibold text-white mb-2">Example Statistics</h3>
        <p className="text-zinc-400 text-sm mb-4">
          {examples.length} total examples across {categories.length} categories
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {examples.filter(e => e.tags.includes('beginner')).length}
            </div>
            <div className="text-sm text-zinc-500">Beginner</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {examples.filter(e => e.tags.includes('intermediate')).length}
            </div>
            <div className="text-sm text-zinc-500">Intermediate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {examples.filter(e => e.tags.includes('advanced')).length}
            </div>
            <div className="text-sm text-zinc-500">Advanced</div>
          </div>
        </div>
      </div>
    </div>
  )
}
