export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'Geist', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          900: 'oklch(0.18 0 0)',
          800: 'oklch(0.26 0 0)',
          700: 'oklch(0.38 0 0)',
          600: 'oklch(0.50 0 0)',
          500: 'oklch(0.62 0 0)',
          400: 'oklch(0.74 0 0)',
          300: 'oklch(0.86 0 0)',
          200: 'oklch(0.93 0 0)',
          100: 'oklch(0.965 0 0)',
          50: 'oklch(0.985 0 0)',
        },
        paper: 'oklch(1 0 0)',
        canvas: '#FFFFFF',
        edge: '#ECECEC',
        brand: {
          50: 'rgb(139 111 232 / 0.08)',
          100: 'rgb(139 111 232 / 0.12)',
          200: '#CBBEFF',
          500: '#A48BFF',
          600: '#8B6FE8',
          700: '#8B6FE8',
          900: '#5B45B8',
        },
        sage: {
          50: 'oklch(0.95 0.04 145)',
          500: 'oklch(0.56 0.10 145)',
          700: 'oklch(0.38 0.08 145)',
        },
        coral: {
          50: 'oklch(0.96 0.035 25)',
          500: 'oklch(0.60 0.16 25)',
          700: 'oklch(0.44 0.13 25)',
        },
        gold: {
          50: 'oklch(0.97 0.045 85)',
          500: 'oklch(0.70 0.13 75)',
          700: 'oklch(0.47 0.10 65)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px oklch(0.20 0.01 250 / 0.04), 0 1px 1px oklch(0.20 0.01 250 / 0.03)',
        card: '0 1px 2px oklch(0.20 0.01 250 / 0.04), 0 4px 16px -8px oklch(0.20 0.01 250 / 0.08)',
        lift: '0 4px 24px -8px oklch(0.20 0.01 250 / 0.12), 0 2px 6px -2px oklch(0.20 0.01 250 / 0.06)',
        pop: '0 24px 64px -24px oklch(0.20 0.01 250 / 0.25), 0 8px 24px -8px oklch(0.20 0.01 250 / 0.10)',
      },
    },
  },
  plugins: [],
};
