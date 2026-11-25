import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./sections/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-text": "#4B5563",
        "primary-blue": "#2589BD",
        "secundary-blue":"233263",
        "primary-blue-light": "#18A7B3",
        "primary-grenn": "#86BD51",
        "primary-fundo": "#FFFFFF",
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
