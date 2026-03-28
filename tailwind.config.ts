import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F3F6FB',
        foreground: '#10233F',
        glass: {
          DEFAULT: 'rgba(255,255,255,0.78)',
          soft: 'rgba(255,255,255,0.92)',
          strong: 'rgba(255,255,255,1)',
          border: 'rgba(148,163,184,0.18)',
          shine: 'rgba(255,255,255,0.65)',
        },
        brand: {
          50: '#edf7ff',
          100: '#d7ebff',
          200: '#b8ddff',
          300: '#8ec9ff',
          400: '#60b2ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
      },
      boxShadow: {
        glass: '0 12px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.20)',
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 10px 40px rgba(37,99,235,0.14)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'liquid-mesh': 'radial-gradient(circle at top left, rgba(37,99,235,0.14), transparent 25%), radial-gradient(circle at bottom right, rgba(148,163,184,0.10), transparent 20%), linear-gradient(180deg, rgba(243,246,251,0.96), rgba(243,246,251,1))',
      },
      keyframes: {
        pulseAlert: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.75' },
        },
      },
      animation: {
        pulseAlert: 'pulseAlert 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
