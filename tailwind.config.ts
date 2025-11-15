import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        'wb': 'var(--wb-radius)',
      },
      spacing: {
        'wb': 'var(--wb-padding)',
        'section': 'var(--wb-section-spacing)',
      },
      boxShadow: {
        'wb': 'var(--wb-shadow)',
      },
    },
  },
  plugins: [],
};
export default config;

