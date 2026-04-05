export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "sans-serif"]
      },
      colors: {
        brand: {
          primary: '#8B0000',
          hover: '#A50000',
          muted: '#8B000020',
        },
        bg: {
          base: '#0D0D0D',
          surface: '#161616',
          elevated: '#1E1E1E',
          border: '#2A2A2A',
          "border-subtle": '#1F1F1F',
        },
        text: {
          primary: '#F0F0F0',
          secondary: '#B0B0B0',
          tertiary: '#707070',
          disabled: '#404040',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      boxShadow: {
        "glow": "0 0 20px rgba(139, 0, 0, 0.15)",
        "glow-sm": "0 0 10px rgba(139, 0, 0, 0.1)",
        "glow-lg": "0 0 40px rgba(139, 0, 0, 0.25)",
        "glow-primary": "0 0 15px rgba(139, 0, 0, 0.3)",
        "glow-red": "0 0 20px rgba(139, 0, 0, 0.3)",
      },
      dropShadow: {
        "glow": "0 0 10px rgba(139, 0, 0, 0.3)",
        "glow-sm": "0 0 5px rgba(139, 0, 0, 0.2)",
      }
    }
  },
  plugins: []
};
