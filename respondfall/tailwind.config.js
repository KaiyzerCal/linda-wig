/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0b0f',
          secondary: '#0d0e14',
        },
        card: {
          DEFAULT: '#111827',
          alt: '#13172a',
        },
        accent: {
          blue: '#2d7ff9',
          'blue-light': '#3b82f6',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        revenue: '#fb923c',
        sent: '#22c55e',
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderColor: {
        card: 'rgba(255,255,255,0.06)',
        subtle: 'rgba(255,255,255,0.07)',
        active: '#2563eb',
      },
    },
  },
  plugins: [],
}
