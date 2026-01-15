import Link from 'next/link';
import Image from 'next/image';
import { Example } from '@/lib/examples';

interface ExampleCardProps {
  example: Example;
}

export function ExampleCard({ example }: ExampleCardProps) {
  return (
    <Link
      href={`/examples/${example.slug}`}
      className="group block rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 transition-all hover:bg-slate-800/50 overflow-hidden"
    >
      <div className="aspect-video relative bg-black">
        <Image
          src={`/examples/${example.slug}.png`}
          alt={example.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-primary-400 transition-colors">
          {example.title}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {example.description}
        </p>
      </div>
    </Link>
  );
}
