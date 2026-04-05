// theme.config.js — REPLACE ENTIRELY WITH THIS

export const theme = {
  colors: {
    // Brand
    brand: {
      primary: '#8B0000',       // Biomedia Red (unchanged)
      primaryHover: '#A50000',  // Slightly brighter on hover
      primaryMuted: '#8B000020', // Red with 12% opacity (for bg tints)
    },

    // Background layers (create depth)
    bg: {
      base: '#0D0D0D',          // Page background (slightly warm dark)
      surface: '#161616',       // Cards, panels
      elevated: '#1E1E1E',      // Modals, dropdowns, hover states
      border: '#2A2A2A',        // Borders, dividers
      borderSubtle: '#1F1F1F',  // Very subtle separators
    },

    // Text (high contrast hierarchy)
    text: {
      primary: '#F0F0F0',       // Headings, values, important text
      secondary: '#B0B0B0',     // Labels, descriptions — MUCH BRIGHTER than before
      tertiary: '#707070',      // Helper text, timestamps
      disabled: '#404040',      // Inactive/disabled
      inverse: '#0D0D0D',       // Text on light bg
    },

    // Accent (single consistent secondary)
    accent: {
      blue: '#3B82F6',          // Only for data/charts (keep minimal)
      green: '#22C55E',         // Win/success states ONLY
      yellow: '#F59E0B',        // Warning/pending ONLY
      red: '#EF4444',           // Error/loss states ONLY
    },

    // Status
    status: {
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    }
  }
}
