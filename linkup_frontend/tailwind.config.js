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
        primary: {
          light: '#8b5cf6', // purple-500
          dark: '#6366f1', // indigo-500
        },
        accent: '#3b82f6', // blue-500
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom right, #4338CA, #3B82F6)',
        'gradient-light': 'linear-gradient(to bottom right, #8B5CF6, #3B82F6)',
      },
      borderRadius: {
        'lg': '1rem',
      },
    },
  },
  plugins: [],
};
