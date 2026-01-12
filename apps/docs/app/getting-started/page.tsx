import { CodeBlock } from '@/components/CodeBlock';
import { Callout } from '@/components/mdx/Callout';

const installCode = `npm install ralph-gpu
# or
pnpm add ralph-gpu`;

const typesCode = `# Optional but recommended for TypeScript
npm install -D @webgpu/types`;

const basicSetupCode = `import { gpu, WebGPUNotSupportedError } from "ralph-gpu";

// Always check support first
if (!gpu.isSupported()) {
  console.log('WebGPU not supported');
  // Show fallback UI
  return;
}

try {
  const ctx = await gpu.init(canvas, {
    dpr: Math.min(window.devicePixelRatio, 2), // Limit pixel ratio
    debug: true // Enable debug logs
  });
} catch (e) {
  if (e instanceof WebGPUNotSupportedError) {
    // Browser doesn't support WebGPU
  }
}`;

const firstShaderCode = `import { gpu } from "ralph-gpu";

const canvas = document.querySelector('canvas')!;
const ctx = await gpu.init(canvas);

// Create a simple gradient shader
const gradient = ctx.pass(\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
  }
\`);

// Animation loop
function frame() {
  gradient.draw();
  requestAnimationFrame(frame);
}
frame();`;

const reactCode = `import { useEffect, useRef } from "react";
import { gpu, GPUContext, Pass } from "ralph-gpu";

function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let pass: Pass;
    let animationId: number;
    let disposed = false;

    const onResize = () => {
      if (!ctx || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      ctx.resize(rect.width, rect.height);
    };

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;

      ctx = await gpu.init(canvasRef.current, {
        dpr: Math.min(window.devicePixelRatio, 2),
      });

      if (disposed) {
        ctx.dispose();
        return;
      }

      pass = ctx.pass(\`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let uv = pos.xy / globals.resolution;
          return vec4f(uv, sin(globals.time) * 0.5 + 0.5, 1.0);
        }
      \`);

      window.addEventListener("resize", onResize);
      onResize();

      function frame() {
        if (disposed) return;
        pass.draw();
        animationId = requestAnimationFrame(frame);
      }
      frame();
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      ctx?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export default ShaderCanvas;`;

export default function GettingStartedPage() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Getting Started
      </h1>
      <p className="text-xl text-neutral-400 mb-12">
        Get up and running with ralph-gpu in minutes.
      </p>

      {/* Installation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="installation">
          Installation
        </h2>
        <p className="text-neutral-300 mb-4">
          Install ralph-gpu using your preferred package manager:
        </p>
        <CodeBlock code={installCode} language="bash" />
        <p className="text-neutral-300 mt-4 mb-4">
          For better TypeScript support, also install WebGPU types:
        </p>
        <CodeBlock code={typesCode} language="bash" />
      </section>

      {/* Browser Support */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="browser-support">
          Browser Support
        </h2>
        <p className="text-neutral-300 mb-4">
          WebGPU is a modern API and requires a compatible browser:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">✅ Supported</h3>
            <ul className="text-neutral-400 text-sm space-y-1">
              <li>Chrome 113+ (desktop)</li>
              <li>Chrome 121+ (Android)</li>
              <li>Edge 113+</li>
              <li>Safari 17+ (macOS Sonoma, iOS 17)</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">⚠️ Limited</h3>
            <ul className="text-neutral-400 text-sm space-y-1">
              <li>Firefox Nightly (behind flag)</li>
              <li>Older browser versions</li>
            </ul>
          </div>
        </div>
        <Callout type="warning">
          Always check <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">gpu.isSupported()</code> before initializing to handle unsupported browsers gracefully.
        </Callout>
      </section>

      {/* Basic Setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="basic-setup">
          Basic Setup
        </h2>
        <p className="text-neutral-300 mb-4">
          Here&apos;s how to properly initialize ralph-gpu with error handling:
        </p>
        <CodeBlock code={basicSetupCode} language="typescript" />
      </section>

      {/* First Shader */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="first-shader">
          Your First Shader
        </h2>
        <p className="text-neutral-300 mb-4">
          Let&apos;s create a simple animated gradient shader. This demonstrates the basics of creating a pass and running an animation loop:
        </p>
        <CodeBlock code={firstShaderCode} language="typescript" />
        <div className="mt-4 p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <h3 className="font-semibold text-white mb-2">What&apos;s happening here?</h3>
          <ul className="text-neutral-400 space-y-2">
            <li>
              <strong className="text-neutral-200">Line 5:</strong> We create a <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">pass</code> — a fullscreen fragment shader.
            </li>
            <li>
              <strong className="text-neutral-200">Line 8:</strong> <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">globals.resolution</code> gives us the canvas size.
            </li>
            <li>
              <strong className="text-neutral-200">Line 9:</strong> <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">globals.time</code> is automatically updated each frame.
            </li>
            <li>
              <strong className="text-neutral-200">Line 15:</strong> <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">draw()</code> renders the shader to the screen.
            </li>
          </ul>
        </div>
      </section>

      {/* React Integration */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="react-integration">
          React Integration
        </h2>
        <p className="text-neutral-300 mb-4">
          Here&apos;s a complete React component with proper initialization, cleanup, and resize handling:
        </p>
        <CodeBlock code={reactCode} language="tsx" filename="ShaderCanvas.tsx" showLineNumbers />
        <Callout type="info">
          <strong>Key patterns:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Use a <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">disposed</code> flag to prevent rendering after unmount</li>
            <li>• Clean up with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">ctx.dispose()</code> in the effect cleanup</li>
            <li>• Handle resize events with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">ctx.resize()</code></li>
          </ul>
        </Callout>
      </section>

      {/* Common Issues */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4" id="common-issues">
          Common Setup Issues
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">❓ Canvas is blank</h3>
            <p className="text-neutral-400 text-sm">
              Make sure you&apos;re calling <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">draw()</code> in a loop with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">requestAnimationFrame</code>. Also check that the canvas has explicit dimensions.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">❓ WebGPU not supported error</h3>
            <p className="text-neutral-400 text-sm">
              Check your browser version. Chrome 113+ and Safari 17+ are required. On Firefox, WebGPU must be enabled in about:config.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">❓ Shader compilation errors</h3>
            <p className="text-neutral-400 text-sm">
              WGSL is strictly typed. Make sure all variables have explicit types and function return types are specified. Enable <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">debug: true</code> for detailed errors.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="font-semibold text-white mb-2">❓ Low frame rate / poor performance</h3>
            <p className="text-neutral-400 text-sm">
              Limit the device pixel ratio with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">dpr: Math.min(window.devicePixelRatio, 2)</code> to avoid rendering at 4x resolution on high-DPI displays.
            </p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="/concepts"
            className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 transition-colors"
          >
            <h3 className="font-semibold text-white mb-2">Core Concepts →</h3>
            <p className="text-neutral-400 text-sm">
              Learn about passes, materials, targets, and more.
            </p>
          </a>
          <a
            href="/api"
            className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 transition-colors"
          >
            <h3 className="font-semibold text-white mb-2">API Reference →</h3>
            <p className="text-neutral-400 text-sm">
              Complete documentation of all methods.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
