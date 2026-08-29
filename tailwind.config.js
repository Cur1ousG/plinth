/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },

        // The two page backgrounds. Everything else sits on one of these.
        //
        // Neither is a true white or a true black. Tailwind's `neutral` scale is
        // a cool grey, and against it food photography reads clinical — the
        // reference apps all use a warm canvas so the food is the only cool or
        // neutral thing on screen. `cream` is white pulled a few points toward
        // brand-50; `charcoal` is black pulled toward brand-900.
        //
        // Surfaces above the canvas use the `stone` scale, which is Tailwind's
        // warm neutral and shares its steps with `neutral` exactly.
        cream: '#fffbf7',
        charcoal: {
          DEFAULT: '#12100e',
          raised: '#1c1917', // = stone-900, for cards on the dark canvas
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
