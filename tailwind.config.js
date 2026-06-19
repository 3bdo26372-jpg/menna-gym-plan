/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#251c24', blush: '#fff7fb', berry: '#a92f6f', rose: '#e85d9e' },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] },
      boxShadow: { glow: '0 24px 70px rgba(196, 57, 126, .18)' }
    }
  },
  plugins: []
}
