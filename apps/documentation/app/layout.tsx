import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'ralph-gl Documentation',
  description: 'Documentation for ralph-gl WebGL library',
}

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/getting-started', label: 'Getting Started' },
  { href: '/examples', label: 'Examples' },
  { href: '/api', label: 'API Reference' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="flex">
          {/* Sidebar */}
          <aside className="fixed left-0 top-0 h-screen w-64 border-r border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-8">
              <Link href="/" className="text-xl font-bold text-white">
                ralph-gl
              </Link>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          
          {/* Main content */}
          <main className="ml-64 min-h-screen flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
