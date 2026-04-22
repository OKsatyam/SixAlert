import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            borderColor: "rgba(249, 115, 22, 0.3)",
            boxShadow: "0 0 0 0 rgba(249, 115, 22, 0)",
          },
          "50%": {
            borderColor: "rgba(249, 115, 22, 0.9)",
            boxShadow: "0 0 24px 4px rgba(249, 115, 22, 0.25)",
          },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "live-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in-right 0.35s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "spin-slow": "spin-slow 8s linear infinite",
        "live-dot": "live-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
