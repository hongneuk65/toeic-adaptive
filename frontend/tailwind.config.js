/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          cream: '#f7f4ec',
          white: '#fffdf7',
          kraft: '#d8cfbe',
          'kraft-light': '#e7dfd0',
          'kraft-dark': '#a2a18f',
          rose: '#f5e1e1',
          mint: '#e1f0e8',
          sky: '#e1ebf5',
          lavender: '#ebe1f5',
          peach: '#f5ebe1',
          yellow: '#f5f0d0',
        },
        accent: {
          coral: '#a6533c',
          sage: '#15803d',
          navy: '#304f46',
          plum: '#6d4c7d',
          rust: '#bc6c25',
        },
        ink: {
          dark: '#303d37',
          medium: '#61675c',
          light: '#75796e',
          pencil: '#a2a18f',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        mono: ['Arial', 'Helvetica', 'sans-serif'],
        hand: ['Arial', 'Helvetica', 'sans-serif'],
        display: ['Arial', 'Helvetica', 'sans-serif'],
        body: ['Arial', 'Helvetica', 'sans-serif'],
        exam: ['Arial', 'Helvetica', 'sans-serif'],
      },
      boxShadow: {
        'paper-subtle': '0 1px 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04)',
        'paper-light': '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)',
        'paper-medium': '0 2px 4px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.06)',
        'paper-heavy': '0 16px 48px rgba(15,23,42,0.12)',
      },
    },
  },
  plugins: [],
}