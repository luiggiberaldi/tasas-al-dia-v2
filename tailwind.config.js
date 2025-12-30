/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Control manual del modo oscuro
  theme: {
    extend: {
      // 1. SISTEMA DE COLOR (Palette Tokens)
      colors: {
        // Tu identidad de marca: "Electric Gold"
        brand: {
          DEFAULT: '#FCD535', // Primario
          dark: '#E5C020',    // Hover/Active
          light: '#FDE060',   // Highlights
          bg: '#FFFBE6'       // Fondos muy claros
        },
        // Tokens Semánticos (Feedback)
        feedback: {
          success: '#10B981', // Emerald-500
          error: '#F43F5E',   // Rose-500
          warning: '#F59E0B'  // Amber-500
        }
      },
      // 2. TIPOGRAFÍA (Typography Tokens)
      fontFamily: {
        // Inter para textos generales (UI limpia)
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // JetBrains Mono para NÚMEROS (Tabular y técnico)
        mono: ['"JetBrains Mono"', 'monospace'], 
      },
      // 3. FORMAS (Shape Tokens)
      borderRadius: {
        'squircle': '1.25rem', // Un radio moderno, entre xl y 2xl
      }
    },
  },
  plugins: [],
}