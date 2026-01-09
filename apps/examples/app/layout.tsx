import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ralph-gpu Examples',
  description: 'Interactive WebGPU shader examples using ralph-gpu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
