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
          cream: '#faf8f5',
          white: '#ffffff',
          kraft: '#c4a77d',
          'kraft-light': '#dbc8a9',
          'kraft-dark': '#a08060',
          rose: '#f5e1e1',
          mint: '#e1f0e8',
          sky: '#e1ebf5',
          lavender: '#ebe1f5',
          peach: '#f5ebe1',
          yellow: '#f5f0d0',
        },
        accent: {
          coral: '#e07a5f',
          sage: '#7d9a78',
          navy: '#3d5a80',
          plum: '#6d4c7d',
          rust: '#bc6c25',
        },
        ink: {
          dark: '#2c2c2c',
          medium: '#5c5c5c',
          light: '#8c8c8c',
          pencil: '#a0a0a0',
        },
      },
      fontFamily: {
        // Phông thống nhất toàn hệ thống (Sổ tay Paper Craft)
        sans: ['"Patrick Hand"', 'cursive', 'sans-serif'],
        hand: ['"Patrick Hand"', 'cursive', 'sans-serif'],
        // Phông chữ bình thường chuẩn mực dành riêng cho thi cử / quiz
        exam: ['"Nunito"', 'sans-serif'],
      },
      boxShadow: {
        'paper-subtle': '0 1px 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04)',
        'paper-light': '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)',
        'paper-medium': '0 2px 4px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.06)',
        'paper-heavy': '0 4px 8px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}