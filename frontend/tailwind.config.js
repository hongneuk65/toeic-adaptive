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
          cream: '#f4f7fc',
          white: '#ffffff',
          kraft: '#d5e0ef',
          'kraft-light': '#e8eef8',
          'kraft-dark': '#889ab4',
          rose: '#fff0f0',
          mint: '#e7f6ef',
          sky: '#e9f1ff',
          lavender: '#f1edff',
          peach: '#fff2e6',
          yellow: '#fff8df',
        },
        accent: {
          coral: '#c44f40',
          sage: '#15803d',
          navy: '#0060FD',
          plum: '#7255c7',
          rust: '#a65d15',
        },
        ink: {
          dark: '#23242D',
          medium: '#536580',
          light: '#637590',
          pencil: '#889ab4',
        },
      },
      fontFamily: {
        sans: ['var(--font-app)'],
        mono: ['var(--font-app)'],
        hand: ['var(--font-app)'],
        display: ['var(--font-app)'],
        body: ['var(--font-app)'],
        exam: ['var(--font-app)'],
      },
      boxShadow: {
        'paper-subtle': '0 2px 8px rgba(25,52,99,0.04)',
        'paper-light': '0 4px 16px rgba(25,52,99,0.06)',
        'paper-medium': '0 8px 24px rgba(25,52,99,0.09)',
        'paper-heavy': '0 16px 48px rgba(15,23,42,0.12)',
      },
    },
  },
  plugins: [],
}