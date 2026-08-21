/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202223",
        muted: "#7B827F",
        line: "#E8ECEA",
        canvas: "#F7FAF8",
        brand: {
          50: "#EFFAF4",
          100: "#D9F4E5",
          500: "#12B76A",
          600: "#079455",
          700: "#067647"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(18, 52, 35, 0.04), 0 10px 28px rgba(18, 52, 35, 0.04)",
        modal: "0 24px 80px rgba(17, 24, 39, 0.18)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
