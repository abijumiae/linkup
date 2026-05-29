/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4B1F9D',
          'primary-hover': '#5A28B8',
          secondary: '#3C7BE2',
          'secondary-hover': '#4A8AEF',
          dark: '#121025',
          text: '#111111',
          light: '#FFFFFF',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to right, #4B1F9D, #3C7BE2)',
        'gradient-brand-hover': 'linear-gradient(to right, #5A28B8, #4A8AEF)',
        'gradient-dark': 'linear-gradient(to bottom right, #4B1F9D, #3C7BE2)',
        'gradient-light': 'linear-gradient(to bottom right, #4B1F9D, #3C7BE2)',
      },
      borderRadius: {
        lg: '1rem',
      },
    },
  },
  plugins: [],
};
