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
    <div className="flex flex-col h-screen bg-black">
      {/* Minimal Vercel-style header */}
      <header className="flex items-center px-4 py-2 bg-black border-b border-[#333] shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/examples"
            className="text-[#666] hover:text-[#fafafa] transition-colors flex items-center gap-1 text-[13px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-[#333]">/</span>
          <span className="text-[13px] text-[#fafafa]">
            {example.title}
          </span>
          <span className="text-[#666] text-[12px] hidden md:block max-w-sm truncate">
            — {example.description}
          </span>
        </div>
      </header>

      {/* Fullscreen playground */}
      <main className="flex-1 min-h-0">
        <ShaderPlayground initialExample={example} />
      </main>
    </div>
  );
}
