import Link from 'next/link';
import { Example } from '@/lib/examples';

interface ExampleCardProps {
  example: Example;
}

export function ExampleCard({ example }: ExampleCardProps) {
  return (
    <Link
      href={`/examples/${example.slug}`}
      className="group block p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 transition-all hover:bg-slate-800/50"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-primary-400 transition-colors">
        {example.title}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed">
        {example.description}
      </p>
    </Link>
  );
}
