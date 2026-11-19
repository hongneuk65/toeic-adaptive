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
          cream: '#f1f5f7',
          white: '#ffffff',
          kraft: '#dfe7ea',
          'kraft-light': '#e6f0f2',
          'kraft-dark': '#8fa5ab',
          rose: '#ffebeb',
          mint: '#e3f6f3',
          sky: '#e6f0f2',
          lavender: '#f1edff',
          peach: '#f7f4ed',
          yellow: '#fff8df',
        },
        accent: {
          coral: '#ed3838',
          sage: '#15803d',
          navy: '#004646',
          plum: '#6d4fc2',
          rust: '#a65d15',
        },
        ink: {
          dark: '#0f172a',
          medium: '#545861',
          light: '#6b7280',
          pencil: '#8fa5ab',
        },
      },
      fontFamily: {
        sans: ['var(--font-app)'],
        mono: ['var(--font-app)'],
        hand: ['var(--font-display)'],
        display: ['var(--font-display)'],
        body: ['var(--font-app)'],
        exam: ['var(--font-app)'],
      },
      boxShadow: {
        'paper-subtle': '0 2px 8px rgba(15,23,42,0.03)',
        'paper-light': '0 4px 16px rgba(15,23,42,0.05)',
        'paper-medium': '0 8px 24px rgba(15,23,42,0.07)',
        'paper-heavy': '0 16px 48px rgba(15,23,42,0.12)',
      },
    },
  },
  plugins: [],
}