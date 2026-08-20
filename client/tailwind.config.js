/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#170C08",
        "bg-secondary": "#1E110B",
        card: "#2E160C",
        "text-primary": "#FBEEDD",
        "text-secondary": "#C9A88C",
        accent: "#E87522",
        "accent-secondary": "#F2B544",
        success: "#9BC46E",
        error: "#E2593F",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        signature: ["'Fraunces'", "Georgia", "serif"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(232, 117, 34, 0.55)",
      },
      keyframes: {
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 },
        },
      },
      animation: {
        eq1: "eq 0.8s ease-in-out infinite",
        eq2: "eq 1.1s ease-in-out infinite",
        eq3: "eq 0.65s ease-in-out infinite",
        eq4: "eq 0.95s ease-in-out infinite",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
