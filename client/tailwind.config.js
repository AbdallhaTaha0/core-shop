/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bench: '#f4f5f2',
        ink: '#1c2425',
        alloy: '#d8deda',
        slate: '#5d6866',
        signal: '#c34719',
        stock: '#216e67',
      },
      fontFamily: {
        body: ['Barlow', 'Arial', 'sans-serif'],
        display: ['Barlow Condensed', 'Arial', 'sans-serif'],
      },
      maxWidth: { content: '1280px' },
    },
  },
  plugins: [],
};
