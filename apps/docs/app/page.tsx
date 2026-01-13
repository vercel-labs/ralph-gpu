import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';

const heroCode = `import { gpu } from "ralph-gpu";

const ctx = await gpu.init(canvas);

const gradient = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
\`);

function frame() {
  gradient.draw();
  requestAnimationFrame(frame);
}
frame();`;

const features = [
  {
    title: '~6kB Gzipped',
    description: 'Tiny footprint. Full WebGPU power without the bloat.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Simple API',
    description: 'Write shaders, draw them. No boilerplate, no complexity.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Auto-Injected Uniforms',
    description: 'resolution, time, deltaTime, frame, and aspect available in all shaders automatically.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Ping-Pong Buffers',
    description: 'First-class support for iterative effects like fluid simulations and blur.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: 'Three.js-Style Uniforms',
    description: 'Use the familiar { value: X } pattern for reactive uniform updates.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Compute Shaders',
    description: 'GPU-accelerated parallel computation with full texture support.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
  },
  {
    title: 'Custom Samplers',
    description: 'Explicit control over texture filtering and wrapping. Reusable across shaders.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Storage Textures',
    description: 'Write directly to textures from compute shaders for advanced effects.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    title: 'Blend Modes',
    description: 'Presets for additive, alpha, multiply, screen, and custom blending.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="px-6 py-16 lg:px-12 lg:py-20">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center mb-24">
        {/* Badges */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            ~6kB gzipped
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-tertiary border border-border-default text-text-secondary text-sm">
            <span className="w-2 h-2 rounded-full bg-accent-green"></span>
            WebGPU Ready
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary mb-6 tracking-tight">
          ralph-gpu
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
          A minimal, ergonomic WebGPU shader library for creative coding and real-time graphics.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link
            href="/getting-started"
            className="px-5 py-2.5 rounded-lg bg-text-primary text-bg-primary font-medium text-sm hover:bg-text-secondary transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/examples"
            className="px-5 py-2.5 rounded-lg bg-bg-tertiary text-text-primary font-medium text-sm border border-border-default hover:border-border-hover hover:bg-bg-secondary transition-colors"
          >
            View Examples
          </Link>
        </div>

        {/* Code Example */}
        <div className="text-left max-w-2xl mx-auto">
          <CodeBlock code={heroCode} language="typescript" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-4xl mx-auto mb-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-text-primary text-center mb-4">
          Everything You Need
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
          Built for creative coders who want to harness the power of WebGPU without the complexity.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-colors group"
            >
              <div className="w-9 h-9 rounded-md bg-bg-tertiary flex items-center justify-center text-text-secondary mb-4 group-hover:text-text-primary transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-text-primary text-center mb-12">
          Explore the Docs
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/getting-started"
            className="group p-6 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                Getting Started
              </h3>
              <svg className="w-4 h-4 text-text-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">
              Installation, setup, and your first shader in minutes.
            </p>
          </Link>
          
          <Link
            href="/concepts"
            className="group p-6 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                Core Concepts
              </h3>
              <svg className="w-4 h-4 text-text-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">
              Learn about contexts, passes, materials, and more.
            </p>
          </Link>
          
          <Link
            href="/api"
            className="group p-6 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                API Reference
              </h3>
              <svg className="w-4 h-4 text-text-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">
              Complete documentation of all methods and properties.
            </p>
          </Link>
          
          <Link
            href="/examples"
            className="group p-6 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                Examples
              </h3>
              <svg className="w-4 h-4 text-text-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary">
              Interactive demos with live code.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
