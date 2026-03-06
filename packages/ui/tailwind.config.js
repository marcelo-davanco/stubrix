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
        primary: '#2a9d8f',
        danger: '#e76f51',
        warning: '#e9c46a',
        success: '#2d6a4f',
        accent: '#9b5de5',
        'text-primary': '#e6e6e6',
        'text-secondary': '#a8a8b3',
      },
    },
  },
  plugins: [],
}
