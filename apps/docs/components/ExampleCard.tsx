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
      className="group block rounded-lg bg-gray-1 border border-gray-4 hover:border-gray-5 transition-all hover:bg-gray-2 overflow-hidden"
    >
      <div className="aspect-video relative bg-black">
        <Image
          src={`/examples/${example.slug}.webp`}
          alt={example.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-12 mb-2 group-hover:text-blue-9 transition-colors">
          {example.title}
        </h3>
        <p className="text-gray-9 text-sm leading-relaxed line-clamp-2">
          {example.description}
        </p>
      </div>
    </Link>
  );
}
