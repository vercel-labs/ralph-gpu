'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ExampleCard({ title, description, href }: { title: string; description: string; href: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '1.5rem',
        border: '1px solid',
        borderColor: isHovered ? '#0070f3' : '#e0e0e0',
        borderRadius: '8px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 112, 243, 0.1)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>{title}</h3>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>{description}</p>
    </Link>
  );
}
