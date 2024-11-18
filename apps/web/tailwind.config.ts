import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        slide: {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(4px)" },
        },
        fade: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        pulse: "pulse 1.5s ease-in-out infinite",
        slide: "slide 1.5s ease-in-out infinite",
        fade: "fade 2s linear infinite",
      },
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
        "disagree-amber": "#FFA000", // Color for disagree
        "slate-blue": "#475569", // Color for constitutionable
        black: "#000000", // For text-black
        white: "#FFFFFF", // For text-white and bg-white
        "teal-100": "#CCE4E0", // For border-teal-100
        "teal-600": "#0F766E", // For text-teal-600
        "teal-700": "#0E6760", // For hover:text-teal-700
      },
      minHeight: {
        "50": "50px", // For min-h-50
      },
      buttons: {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        secondary: "bg-gray-300 text-gray-800 hover:bg-gray-400",
        danger: "bg-danger text-white hover:bg-danger/80",
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(0, 0, 0)',
            '--tw-prose-headings': 'rgb(0, 0, 0)',
            '--tw-prose-links': 'rgb(0, 0, 0)',
            '--tw-prose-bold': 'rgb(0, 0, 0)',
          }
        },
        invert: {
          css: {
            '--tw-prose-body': 'rgb(255, 255, 255)',
            '--tw-prose-headings': 'rgb(255, 255, 255)',
            '--tw-prose-links': 'rgb(255, 255, 255)',
            '--tw-prose-bold': 'rgb(255, 255, 255)',
          }
        }
      }
    },
  },
  safelist: [
    // Add dynamic classes that might be constructed with string interpolation
    'bg-teal',
    'hover:bg-black',
    {
      pattern: /bg-(gray|teal)-\d+/,
      variants: ['hover'],
    },
  ],
  plugins: [typography, forms],
};

export default config;
