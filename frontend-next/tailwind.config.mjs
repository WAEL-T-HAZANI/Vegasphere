/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/app/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        vega: {
          accent: "#FF7EB6",
          deep: "#8B1E3F",
          ink: "rgb(var(--vega-ink) / <alpha-value>)",
          paper: "rgb(var(--vega-paper) / <alpha-value>)",
          muted: "#302C36",
        },
        brand: {
          50: "#FFF4F8",
          100: "#FCE7F0",
          200: "#F8CFE0",
          300: "#EE9FBE",
          400: "#D96898",
          500: "#BC3A73",
          600: "#A82A60",
          700: "#8B1E3F",
          800: "#6F1835",
          900: "#501126",
        },
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        ink: "rgb(var(--primary) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Noto Sans Arabic",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(168, 42, 96, 0.2)",
        "glass-dark": "0 0 0 1px rgba(139, 30, 63, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
