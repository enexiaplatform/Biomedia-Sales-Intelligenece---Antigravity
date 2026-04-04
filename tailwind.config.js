export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      colors: {
        primary: "#991B1B", // Biomedia Red
        secondary: "#B91C1C", // Lighter Red
        accent: "#FACC15", // Warm Yellow (Gold) for accents
        surface: {
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
          950: "#020617"
        },
      },
      boxShadow: {
        "glow": "0 0 20px rgba(153, 27, 27, 0.15)",
        "glow-sm": "0 0 10px rgba(153, 27, 27, 0.1)",
        "glow-lg": "0 0 40px rgba(153, 27, 27, 0.25)",
        "glow-primary": "0 0 15px rgba(153, 27, 27, 0.3)",
        "glow-red": "0 0 20px rgba(153, 27, 27, 0.3)",
      },
      dropShadow: {
        "glow": "0 0 10px rgba(153, 27, 27, 0.3)",
        "glow-sm": "0 0 5px rgba(153, 27, 27, 0.2)",
      }
    }
  },
  plugins: []
};
