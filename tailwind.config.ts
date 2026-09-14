import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF9F0",
        ink: "#203126",
        leaf: "#26734D",
        lime: "#DFF2B0",
        peach: "#FFDDB8"
      },
      boxShadow: { soft: "0 18px 50px rgba(62, 74, 54, 0.12)" }
    }
  },
  plugins: []
} satisfies Config;