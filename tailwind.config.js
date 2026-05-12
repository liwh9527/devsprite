/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#667eea",
          dark: "#764ba2",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      borderRadius: {
        widget: "24px",
      },
      animation: {
        "bounce-slow": "bounce 2s ease-in-out infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "shake": "shake 0.5s ease-in-out infinite",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
      },
    },
  },
  plugins: [],
};
