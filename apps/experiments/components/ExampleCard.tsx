'use client';

import Link from 'next/link';
import { useState } from 'react';

export type Category = "basics" | "techniques" | "simulations" | "advanced" | "features";

interface ExampleCardProps {
  slug: string;
  title: string;
  description: string;
  category: Category;
}

const categoryGradients: Record<Category, string> = {
  basics: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  techniques: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  simulations: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
  advanced: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  features: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
};

const categoryColors: Record<Category, string> = {
  basics: '#3b82f6',
  techniques: '#8b5cf6',
  simulations: '#06b6d4',
  advanced: '#f97316',
  features: '#22c55e',
};

export default function ExampleCard({ slug, title, description, category }: ExampleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/${slug}`}
      className="example-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#16161a',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #2a2a32',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 12px 24px -10px rgba(0, 0, 0, 0.5), 0 0 20px -5px ${categoryColors[category]}44`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textDecoration: 'none',
        height: '100%',
      }}
    >
      <div 
        style={{
          height: '160px',
          background: categoryGradients[category],
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Abstract pattern placeholder */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.3,
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }} />
        
        <span style={{ 
          fontSize: '3rem', 
          opacity: 0.8,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}>
          {title.charAt(0)}
        </span>
      </div>

      <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            color: '#f8f9fa',
          }}>
            {title}
          </h3>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${categoryColors[category]}22`,
            color: categoryColors[category],
            border: `1px solid ${categoryColors[category]}44`,
            letterSpacing: '0.05em',
          }}>
            {category}
          </span>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '0.9rem', 
          lineHeight: '1.5',
          color: '#94a3b8',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {description}
        </p>
      </div>
    </Link>
  );
}
