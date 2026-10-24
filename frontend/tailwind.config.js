/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Semantic token palette */
        surface: {
          DEFAULT: '#0a1628',
          raised: '#0f1e35',
          overlay: '#142040',
        },
        accent: {
          DEFAULT: '#3b82f6',
          muted: '#1d4ed8',
        },
        healthy: '#22c55e',
        warning: '#f59e0b',
        critical: '#ef4444',
        offline: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        'card-hover': '0 4px 16px -2px rgb(0 0 0 / 0.5)',
        node: '0 2px 8px 0 rgb(0 0 0 / 0.5)',
        'node-selected': '0 0 0 2px #3b82f6, 0 4px 16px -2px rgb(59 130 246 / 0.3)',
        glow: '0 0 20px -4px rgb(59 130 246 / 0.4)',
      },
    },
  },
  plugins: [],
};
