import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getExampleBySlug, getAllExamples } from '@/lib/examples';
import { ShaderPlayground } from '@/components/ShaderPlayground';

interface PageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  const examples = getAllExamples();
  return examples.map((example) => ({
    slug: example.slug,
  }));
}

export default function ExamplePage({ params }: PageProps) {
  const example = getExampleBySlug(params.slug);

  if (!example) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full max-w-[1600px] mx-auto px-4 py-6 md:px-8">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/examples"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Gallery
          </Link>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
              {example.title}
            </h1>
            <p className="text-slate-400 mt-1 max-w-2xl">
              {example.description}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <ShaderPlayground initialExample={example} />
      </main>

      <footer className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 className="text-slate-200 font-semibold mb-2 text-sm flex items-center gap-2">
            <span className="p-1 bg-primary-500/10 rounded text-primary-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Controls
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Click <strong>Run</strong> or press <code>Cmd/Ctrl + Enter</code> to re-compile the shader after making changes.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 className="text-slate-200 font-semibold mb-2 text-sm flex items-center gap-2">
            <span className="p-1 bg-primary-500/10 rounded text-primary-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            WGSL Syntax
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Use standard WebGPU Shading Language. <code>globals</code> are automatically available including <code>resolution</code> and <code>time</code>.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 className="text-slate-200 font-semibold mb-2 text-sm flex items-center gap-2">
            <span className="p-1 bg-primary-500/10 rounded text-primary-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            Responsive
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            The canvas automatically resizes to fill its container. <code>globals.resolution</code> updates accordingly in your shader.
          </p>
        </div>
      </footer>
    </div>
  );
}
