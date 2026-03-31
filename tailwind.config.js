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
          900: "#060e20",
          800: "#091328",
          700: "#141f38",
          600: "#1f2b49"
        }
      }
    }
  },
  plugins: []
};
