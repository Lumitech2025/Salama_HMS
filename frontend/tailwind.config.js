/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Adding some professional medical colors
        hospital: {
          light: '#f0f9ff',
          primary: '#0369a1',
          dark: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
}