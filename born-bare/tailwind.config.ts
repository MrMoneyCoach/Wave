import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
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
        serif: ["var(--font-serif)", "Cormorant Garamond", "serif"],
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        // Tall condensed display accent (Bebas Neue today, swap to "Dense" later)
        display: ["var(--font-display)", "Bebas Neue", "Impact", "sans-serif"],
        // Logo wordmark — Mango Grotesque
        wordmark: ["var(--font-wordmark)", "Mango Grotesque", "sans-serif"],
      },
      fontSize: {
        // From brand guidelines
        "display-1": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.01em", fontWeight: "300" }],
        "display-2": ["2.25rem", { lineHeight: "1.15", letterSpacing: "0em", fontWeight: "400" }],
        "h3": ["1.5rem", { lineHeight: "1.3", fontWeight: "500" }],
        "body": ["1.0625rem", { lineHeight: "1.6", letterSpacing: "0.01em", fontWeight: "400" }],
        "caption": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.02em", fontWeight: "400" }],
        "btn": ["0.875rem", { lineHeight: "1", letterSpacing: "0.03em", fontWeight: "500" }],
      },
      maxWidth: {
        page: "1200px",
        prose: "640px",
      },
      letterSpacing: {
        wordmark: "0.2em",
      },
      spacing: {
        section: "8rem",
        "section-lg": "10rem",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
