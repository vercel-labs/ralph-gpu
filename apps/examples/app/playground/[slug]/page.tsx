import { getExampleBySlug } from '../../../lib/examples';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default function PlaygroundPage({ params }: { params: { slug: string } }) {
  const example = getExampleBySlug(params.slug);

  if (!example) {
    notFound();
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0f', 
      color: '#f8f9fa',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ 
            color: '#94a3b8', 
            textDecoration: 'none',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ← Back to Gallery
          </Link>
        </header>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{example.title}</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2rem' }}>{example.description}</p>
        
        <div style={{ 
          backgroundColor: '#16161a', 
          border: '1px solid #2a2a32', 
          borderRadius: '12px',
          padding: '4rem',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <p>Interactive Playground for <strong>{example.slug}</strong> coming soon!</p>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            This will be fully implemented in the next task.
          </p>
        </div>
      </div>
    </div>
  );
}
