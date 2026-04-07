export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        /* ── New design tokens ── */
        brand: {
          DEFAULT: '#DC2626',
          dim:     '#B91C1C',
          light:   '#EF4444',
        },
        /* ── Backward-compat aliases (Pipeline, BDTool, etc.) ── */
        primary: '#DC2626',
        secondary: '#8B5CF6',
        surface: {
          950: '#0C0C0F',
          900: '#131318',
          800: '#1A1A20',
          700: '#252530',
        },
      },
      boxShadow: {
        "brand-sm":  "0 0 10px rgba(220,38,38,0.12)",
        "brand":     "0 0 20px rgba(220,38,38,0.18)",
        "brand-lg":  "0 0 40px rgba(220,38,38,0.24)",
        /* backward compat */
        "glow":      "0 0 20px rgba(220,38,38,0.18)",
        "glow-sm":   "0 0 10px rgba(220,38,38,0.12)",
        "glow-lg":   "0 0 40px rgba(220,38,38,0.24)",
        "glow-primary": "0 0 15px rgba(220,38,38,0.25)",
        "glow-red":   "0 0 20px rgba(220,38,38,0.25)",
      },
      dropShadow: {
        "glow":    "0 0 10px rgba(220,38,38,0.3)",
        "glow-sm": "0 0 5px rgba(220,38,38,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: []
};
