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
        "dark-green": "#0E352C",
        yellow: "#ECC156",
        green: "#008302",
        peach: "#F3CE99",
        "light-beige": "#E3E3D6",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
