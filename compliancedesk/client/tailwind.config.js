/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          900: '#111C36',
          800: '#1B2A4A',
          700: '#243557',
          600: '#34466B',
        },
        gold: {
          DEFAULT: '#C9A84C',
          600: '#B89238',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        document: '0 10px 30px -10px rgba(27, 42, 74, 0.25)',
      },
    },
  },
  plugins: [],
};
