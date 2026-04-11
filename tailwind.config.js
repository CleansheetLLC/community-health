/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Questrial", "sans-serif"],
        body: ["Barlow", "sans-serif"],
      },
      colors: {
        cs: {
          dark: "#0f1724",
          bg: "#f8f9fb",
          text: "#1a202c",
          "text-muted": "#64748b",
          border: "#e2e8f0",
          blue: "#0066CC",
          "blue-dark": "#004d99",
          badge: "#e8f4fd",
        },
      },
    },
  },
  plugins: [],
}
