import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nova: {
          bg: '#0b0d14',
          panel: '#121625',
          accent: '#5b6cff',
          cyan: '#22d3ee',
          purple: '#8b5cf6'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
