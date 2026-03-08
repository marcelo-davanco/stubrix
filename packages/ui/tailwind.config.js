/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../db-ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#264653',
        'main-bg': '#1a1a2e',
        'surface-1': '#1f2040',
        'surface-2': '#252650',
        'surface-3': '#2c2d5e',
        primary: '#2a9d8f',
        danger: '#e76f51',
        warning: '#e9c46a',
        success: '#2d6a4f',
        accent: '#9b5de5',
        'text-primary': '#e6e6e6',
        'text-secondary': '#a8a8b3',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.3s ease-out forwards',
        'toast-out': 'toast-out 0.2s ease-in forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
