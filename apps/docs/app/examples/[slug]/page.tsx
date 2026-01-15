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
    </div>
  );
}
