/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b6ef5',
        success: '#12b76a',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
