'use client';

import { useEffect, useRef, useState } from 'react';
import { gpu, GPUContext, Pass } from 'ralph-gpu';
import { CodeBlock } from '@/components/CodeBlock';

// Example 1: Simple Gradient
const gradientCode = `const gradient = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\`);

gradient.draw();`;

const gradientShader = `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
`;

// Example 2: Animated Wave
const waveCode = `const uniforms = {
  amplitude: { value: 0.3 },
  frequency: { value: 8.0 },
  color: { value: [0.2, 0.8, 1.0] },
};

const wave = ctx.pass(\`
  struct Params { amplitude: f32, frequency: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let wave = sin(uv.x * u.frequency + globals.time * 2.0) * u.amplitude;
    let d = abs(uv.y - 0.5 - wave);
    let glow = 0.02 / d;
    return vec4f(u.color * glow, 1.0);
  }
\`, { uniforms });

wave.draw();`;

const waveShader = `
  struct Params { amplitude: f32, frequency: f32, color: vec3f }
  @group(1) @binding(0) var<uniform> u: Params;

  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let wave = sin(uv.x * u.frequency + globals.time * 2.0) * u.amplitude;
    let d = abs(uv.y - 0.5 - wave);
    let glow = 0.02 / d;
    return vec4f(u.color * glow, 1.0);
  }
`;

// Example 3: Color Cycling
const colorCycleCode = `const colorCycle = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let t = globals.time * 0.5;
    
    // Cycle through hues
    let r = sin(t) * 0.5 + 0.5;
    let g = sin(t + 2.094) * 0.5 + 0.5;  // +120°
    let b = sin(t + 4.188) * 0.5 + 0.5;  // +240°
    
    // Create radial pattern
    let center = uv - 0.5;
    let dist = length(center);
    let angle = atan2(center.y, center.x);
    let pattern = sin(dist * 20.0 - globals.time * 3.0 + angle * 3.0);
    
    let color = vec3f(r, g, b) * (pattern * 0.3 + 0.7);
    return vec4f(color, 1.0);
  }
\`);

colorCycle.draw();`;

const colorCycleShader = `
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    let t = globals.time * 0.5;
    
    // Cycle through hues
    let r = sin(t) * 0.5 + 0.5;
    let g = sin(t + 2.094) * 0.5 + 0.5;
    let b = sin(t + 4.188) * 0.5 + 0.5;
    
    // Create radial pattern
    let center = uv - 0.5;
    let dist = length(center);
    let angle = atan2(center.y, center.x);
    let pattern = sin(dist * 20.0 - globals.time * 3.0 + angle * 3.0);
    
    let color = vec3f(r, g, b) * (pattern * 0.3 + 0.7);
    return vec4f(color, 1.0);
  }
`;

interface ExampleCanvasProps {
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
}

function ExampleCanvas({ shader, uniforms, animated = true }: ExampleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check support first
    if (!gpu.isSupported()) {
      setSupported(false);
      return;
    }
    setSupported(true);

    let ctx: GPUContext | null = null;
    let pass: Pass;
    let animationId: number;
    let disposed = false;

    async function init() {
      if (!canvasRef.current) return;

      try {
        ctx = await gpu.init(canvasRef.current, {
          dpr: Math.min(window.devicePixelRatio, 2),
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        pass = ctx.pass(shader, uniforms ? { uniforms } : undefined);

        const onResize = () => {
          if (!ctx || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          ctx.resize(rect.width, rect.height);
        };

        window.addEventListener('resize', onResize);
        onResize();

        function frame() {
          if (disposed) return;
          pass.draw();
          if (animated) {
            animationId = requestAnimationFrame(frame);
          }
        }
        frame();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize WebGPU');
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      ctx?.dispose();
    };
  }, [shader, uniforms, animated]);

  if (supported === false) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
        <div className="text-center p-6">
          <div className="text-yellow-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-gray-100 font-semibold mb-1">WebGPU Not Supported</h3>
          <p className="text-gray-400 text-sm">
            Your browser doesn&apos;t support WebGPU. Try Chrome 113+, Edge 113+, or Safari 17+.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-red-800">
        <div className="text-center p-6">
          <div className="text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-100 font-semibold mb-1">Error</h3>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}

export default function ExamplesPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
        Examples
      </h1>
      <p className="text-xl text-gray-400 mb-12">
        Interactive demos showing ralph-gpu in action.
      </p>

      {/* Example 1: Simple Gradient */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="gradient">
          Simple Gradient
        </h2>
        <p className="text-gray-300 mb-4">
          The simplest possible shader — map UV coordinates to colors. This creates a gradient from black (bottom-left) to cyan (top-right).
        </p>

        <div className="mb-4">
          <ExampleCanvas shader={gradientShader} animated={false} />
        </div>

        <CodeBlock code={gradientCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="font-semibold text-gray-100 mb-2">How it works</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• <code>pos.xy</code> is the pixel position in screen space</li>
            <li>• <code>globals.resolution</code> is the canvas size</li>
            <li>• <code>uv</code> is normalized to 0-1 range</li>
            <li>• <code>uv.x</code> maps to red, <code>uv.y</code> maps to green</li>
          </ul>
        </div>
      </section>

      {/* Example 2: Animated Wave */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="wave">
          Animated Wave
        </h2>
        <p className="text-gray-300 mb-4">
          A glowing sine wave with custom uniforms. The wave animates over time using <code>globals.time</code>.
        </p>

        <div className="mb-4">
          <ExampleCanvas
            shader={waveShader}
            uniforms={{
              amplitude: { value: 0.3 },
              frequency: { value: 8.0 },
              color: { value: [0.2, 0.8, 1.0] },
            }}
          />
        </div>

        <CodeBlock code={waveCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="font-semibold text-gray-100 mb-2">Key concepts</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Custom uniforms defined with <code>{`{ value: X }`}</code> pattern</li>
            <li>• WGSL struct matches the uniforms layout</li>
            <li>• <code>globals.time</code> provides animation</li>
            <li>• Glow effect using inverse distance: <code>0.02 / d</code></li>
          </ul>
        </div>
      </section>

      {/* Example 3: Color Cycling */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-100 mb-4" id="color-cycle">
          Time-Based Color Cycling
        </h2>
        <p className="text-gray-300 mb-4">
          A hypnotic pattern that cycles through colors over time. Combines time, distance, and angle for a mesmerizing effect.
        </p>

        <div className="mb-4">
          <ExampleCanvas shader={colorCycleShader} />
        </div>

        <CodeBlock code={colorCycleCode} language="typescript" />

        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="font-semibold text-gray-100 mb-2">Key concepts</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• RGB color cycling with phase-shifted sine waves (120° apart)</li>
            <li>• <code>length()</code> for radial distance</li>
            <li>• <code>atan2()</code> for angle from center</li>
            <li>• Multiple sine waves create complex patterns</li>
          </ul>
        </div>
      </section>

      {/* Tips Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          Tips for Shader Development
        </h2>
        
        <div className="grid gap-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="font-semibold text-gray-100 mb-2">🎨 UV Coordinates</h3>
            <p className="text-gray-400 text-sm">
              Always normalize pixel coordinates: <code>let uv = pos.xy / globals.resolution</code>. 
              This gives you values from 0-1 which are easier to work with.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="font-semibold text-gray-100 mb-2">⏱️ Time Animation</h3>
            <p className="text-gray-400 text-sm">
              Use <code>globals.time</code> for smooth animation. For physics, use <code>globals.deltaTime</code> to stay frame-rate independent.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="font-semibold text-gray-100 mb-2">🔧 Debugging</h3>
            <p className="text-gray-400 text-sm">
              Output intermediate values as colors to debug: <code>return vec4f(myValue, 0.0, 0.0, 1.0)</code>. 
              Red channel shows your value visually.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="font-semibold text-gray-100 mb-2">📐 Aspect Ratio</h3>
            <p className="text-gray-400 text-sm">
              For circular effects, correct for aspect ratio: <code>let centered = (uv - 0.5) * vec2f(globals.aspect, 1.0)</code>
            </p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/concepts"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">Core Concepts →</h3>
            <p className="text-gray-400 text-sm">
              Learn about ping-pong, compute, and more.
            </p>
          </a>
          <a
            href="/api"
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-100 mb-2">API Reference →</h3>
            <p className="text-gray-400 text-sm">
              Complete documentation of all methods.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
