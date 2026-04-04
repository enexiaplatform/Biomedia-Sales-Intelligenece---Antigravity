export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      colors: {
        primary: "#69f6b8", // Emerald Neon
        secondary: "#8b5cf6", // Violet Neon
        accent: "#ffb148", // Amber Neon
        surface: {
          950: "#020617",
          900: "#060e20",
          800: "#091328",
          700: "#141f38",
          600: "#1f2b49"
        },
      },
      boxShadow: {
        "glow": "0 0 20px rgba(105, 246, 184, 0.15)",
        "glow-sm": "0 0 10px rgba(105, 246, 184, 0.1)",
        "glow-lg": "0 0 40px rgba(105, 246, 184, 0.25)",
        "glow-primary": "0 0 15px rgba(105, 246, 184, 0.3)",
      },
      dropShadow: {
        "glow": "0 0 10px rgba(105, 246, 184, 0.3)",
        "glow-sm": "0 0 5px rgba(105, 246, 184, 0.2)",
      }
    }
  },
  plugins: []
};
