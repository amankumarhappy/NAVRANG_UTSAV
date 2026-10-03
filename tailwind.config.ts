import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#63857E",
        cream: "#F2ECCD",
        ink: "#202522",
        paper: "#F8F7F1",
        maroon: "#743F43",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-yatra)", "serif"],
        hand: ["var(--font-kalam)", "cursive"],
      },
      maxWidth: { content: "1240px" },
    },
  },
  plugins: [],
};

export default config;
