import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0a0b0f',
        surface: '#111827',
        blue: '#2d7ff9',
        brand: '#10b981',
        orange: '#fb923c',
        danger: '#ef4444',
        'text-base': '#f1f5f9',
      },
    },
  },
  plugins: [],
} satisfies Config
