/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Keep the established lesson-engine tokens mapped to Vestor's palette.
        // Several Learn controls still use the design-system accent/ink vocabulary.
        accent: {
          DEFAULT: "#0F766E",
          soft: "#CCFBF1",
        },
        ink: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#0B1220",
        },
        app: "var(--bg-app)",
        canvas: "var(--bg-canvas)",
        surface: "var(--card-surface)",
        dark: "var(--card-dark)",
        "dark-sub": "var(--card-dark-sub)",
        border: "var(--border-light)",
        "border-dark": "var(--border-dark)",
        main: "var(--text-main)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        brand: {
          DEFAULT: "var(--brand-green)",
          hover: "var(--brand-green-hover)",
          soft: "var(--brand-green-soft)",
          pill: "var(--brand-green-pill)",
        },
        positive: "var(--positive)",
        negative: "var(--negative)",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      borderRadius: {
        card: "28px",
        "card-sm": "20px",
        control: "14px",
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(20, 28, 22, 0.03), 0 1px 3px rgba(20, 28, 22, 0.02)",
        glow: "0 0 24px -4px rgba(34, 197, 94, 0.3)",
      },
    },
  },
  plugins: [],
};
