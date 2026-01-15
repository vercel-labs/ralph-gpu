import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ralph Analyzer',
  description: 'Analyze Ralph AI agent execution traces',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
