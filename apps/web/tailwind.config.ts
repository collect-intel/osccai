import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#121212",
        "medium-gray": "#777777",
        gray: "#A4A4A4",
        "light-gray": "#E0E0E0",
        "soft-gray": "#FAFAFA",
        "almost-white": "#F0F0F0",
        "off-white": "#F9F3E5",
        "light-blue": "#EEF5FF",
        teal: "#185849",
        "dark-green": "#0E342B",
        yellow: "#ECC156",
        green: "#008302",
        peach: "#F3CE99",
        "light-beige": "#E3E3D6",
        danger: "#e53e3e",
        "statement-green": "#BAD2BA", // Color for statement background
        "agree-green": "#185849", // Color for agree
        "disagree-green": "#517852", // Color for disagree
        "slate-blue": "#475569", // Color for constitutionable
      },
      buttons: {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        secondary: "bg-gray-300 text-gray-800 hover:bg-gray-400",
        danger: "bg-danger text-white hover:bg-danger/80",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
