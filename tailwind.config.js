/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm evening-and-celebration palette. Calm, soft contrast.
        ink: {
          DEFAULT: '#2a2320',
          soft: '#5a504a',
          faint: '#8b8079'
        },
        cream: {
          DEFAULT: '#fbf7f1',
          deep: '#f3ebe0'
        },
        amber: {
          50: '#fdf6ec',
          100: '#f8e6cb',
          200: '#f0cd97',
          300: '#e6ad5e',
          400: '#d98e34',
          500: '#c2741f',
          600: '#a35b17',
          700: '#824516',
          800: '#6a3917',
          900: '#5a3116'
        },
        plum: {
          400: '#7a5470',
          500: '#623f5a',
          600: '#4e3148'
        },
        sage: {
          400: '#6f8f6a',
          500: '#587a52',
          600: '#456140'
        },
        clay: {
          400: '#c2603f',
          500: '#a64f31'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(42, 35, 32, 0.04), 0 8px 24px -12px rgba(42, 35, 32, 0.18)',
        lift: '0 2px 4px rgba(42, 35, 32, 0.06), 0 18px 40px -20px rgba(42, 35, 32, 0.28)'
      }
    }
  },
  plugins: []
}
