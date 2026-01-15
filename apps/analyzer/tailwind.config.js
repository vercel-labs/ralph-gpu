/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#000000',
          secondary: '#0a0a0a',
          tertiary: '#111111',
        },
        foreground: {
          DEFAULT: '#fafafa',
          secondary: '#a1a1a1',
          muted: '#666666',
        },
        accent: {
          blue: '#0070f3',
          'blue-hover': '#0366d6',
          green: '#50e3c2',
          purple: '#7928ca',
          red: '#ee0000',
          yellow: '#f5a623',
          orange: '#ff6b35',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
