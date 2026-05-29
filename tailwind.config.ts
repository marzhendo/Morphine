import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0b0c10',
          darker: '#07080a',
          card: '#151b26',
        },
        primary: {
          DEFAULT: '#6366f1', // Sleek Premium Indigo
          hover: '#4f46e5',
        },
        accent: {
          DEFAULT: '#14b8a6', // Teal accent
          hover: '#0d9488',
        },
        text: {
          primary: '#f3f4f6',
          secondary: '#d1d5db',
          muted: '#9ca3af',
        }
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Open Sans',
          'Helvetica Neue',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
