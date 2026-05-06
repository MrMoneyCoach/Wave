/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bare: "#F7F4F0",
        skin: "#D4C4B5",
        earth: "#3D3632",
        clay: "#B8917A",
        stone: "#9B9590",
        sage: "#A8B5A0",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      maxWidth: {
        page: "1200px",
      },
      letterSpacing: {
        wordmark: "0.2em",
      },
    },
  },
  plugins: [],
};
