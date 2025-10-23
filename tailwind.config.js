/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // main
          light: '#60a5fa',
          dark: '#1e3a8a',
        },
        secondary: {
          DEFAULT: '#14b8a6',
          light: '#5eead4',
          dark: '#0f766e',
        },
        gray: {
          950: '#0f0f0f',
        },
      },
    },
  },
  plugins: [],
}
