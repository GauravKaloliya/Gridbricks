/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f1e9",
        "paper-raised": "#fbf9f3",
        "paper-tint": "#ebe6d8",
        ink: "#17150f",
        "ink-soft": "#464339",
        "ink-mute": "#6b665a",
        rule: "rgba(23, 21, 15, 0.16)",
        "rule-soft": "rgba(23, 21, 15, 0.08)",
        signal: "#c6431e",
        "signal-soft": "#f3e2da",
        actual: "#1b5e57",
        "actual-soft": "#dde8e4",
        ochre: "#74530d",
        "ochre-soft": "#f0e7d2",
        oxblood: "#8e2a1f",
        "oxblood-soft": "#f2dfdb",
      },
      fontFamily: {
        serif: ["Newsreader Variable", "Newsreader", "Georgia", "serif"],
        sans: [
          "IBM Plex Sans Variable",
          "IBM Plex Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        plate: "0 1px 0 rgba(23,21,15,0.04)",
        lift: "0 18px 40px -28px rgba(23,21,15,0.55)",
        sheet: "0 1px 2px rgba(23,21,15,0.04), 0 24px 60px -44px rgba(23,21,15,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rule-in": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "ink-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rule-in": "rule-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ink-in": "ink-in 0.9s ease-out both",
      },
    },
  },
  plugins: [],
};
