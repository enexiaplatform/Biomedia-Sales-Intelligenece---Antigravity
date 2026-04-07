export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          DEFAULT: '#DC2626',
          dim:     '#B91C1C',
          light:   '#EF4444',
          bg:      'rgba(220,38,38,0.08)',
          border:  'rgba(220,38,38,0.2)',
        },
      },
      boxShadow: {
        "brand-sm":  "0 0 10px rgba(220,38,38,0.12)",
        "brand":     "0 0 20px rgba(220,38,38,0.18)",
        "brand-lg":  "0 0 40px rgba(220,38,38,0.24)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
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
