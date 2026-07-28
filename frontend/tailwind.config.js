/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#1e40af',
          700: '#1e3a8a',
          900: '#172554',
        },
      },
    },
  },
  plugins: [],
};
