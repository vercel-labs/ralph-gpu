import { examples, getAllCategories, getExamplesByCategory } from '../lib/examples';
import ExampleCard from '../components/ExampleCard';

export default function Home() {
  const categories = getAllCategories();

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#f8f9fa',
      padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            marginBottom: '1rem',
            background: 'linear-gradient(to right, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            ralph-gpu Gallery
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
            A collection of high-performance WebGPU shaders and techniques.
          </p>
        </header>

        {categories.map(category => {
          const categoryExamples = getExamplesByCategory(category);
          if (categoryExamples.length === 0) return null;

          return (
            <section key={category} style={{ marginBottom: '4rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: '2rem',
                borderBottom: '1px solid #1e1e26',
                paddingBottom: '0.75rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 600, 
                  textTransform: 'capitalize',
                  margin: 0
                }}>
                  {category}
                </h2>
                <span style={{ 
                  backgroundColor: '#16161a', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem', 
                  color: '#64748b',
                  border: '1px solid #2a2a32'
                }}>
                  {categoryExamples.length}
                </span>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '2rem' 
              }}>
                {categoryExamples.map(example => (
                  <ExampleCard
                    key={example.slug}
                    slug={example.slug}
                    title={example.title}
                    description={example.description}
                    category={example.category}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <footer style={{ 
          marginTop: '6rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid #1e1e26', 
          textAlign: 'center',
          color: '#475569',
          fontSize: '0.9rem'
        }}>
          <p>© {new Date().getFullYear()} ralph-gpu. Built with Next.js and WebGPU.</p>
        </footer>
      </div>
    </main>
  );
}
