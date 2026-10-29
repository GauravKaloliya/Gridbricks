/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Runtime theme tokens. The channel triples live in index.css so
        // opacity modifiers such as bg-ink/25 keep working in every theme.
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        "paper-raised": "rgb(var(--color-paper-raised) / <alpha-value>)",
        "paper-tint": "rgb(var(--color-paper-tint) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--color-ink-soft) / <alpha-value>)",
        "ink-mute": "rgb(var(--color-ink-mute) / <alpha-value>)",
        rule: "var(--color-rule)",
        "rule-soft": "var(--color-rule-soft)",
        signal: "rgb(var(--color-signal) / <alpha-value>)",
        "signal-soft": "rgb(var(--color-signal-soft) / <alpha-value>)",
        actual: "rgb(var(--color-actual) / <alpha-value>)",
        "actual-soft": "rgb(var(--color-actual-soft) / <alpha-value>)",
        ochre: "rgb(var(--color-ochre) / <alpha-value>)",
        "ochre-soft": "rgb(var(--color-ochre-soft) / <alpha-value>)",
        oxblood: "rgb(var(--color-oxblood) / <alpha-value>)",
        "oxblood-soft": "rgb(var(--color-oxblood-soft) / <alpha-value>)",
        // Always-dark chrome (top strip, footer) so themes never invert it.
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        "panel-ink": "rgb(var(--color-panel-ink) / <alpha-value>)",
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
        plate: "var(--shadow-plate)",
        lift: "var(--shadow-lift)",
        sheet: "var(--shadow-sheet)",
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
        "guide-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "guide-step": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "guide-pulse": {
          "0%": { opacity: "0.7", transform: "scale(1)" },
          "70%": { opacity: "0", transform: "scale(1.045)" },
          "100%": { opacity: "0", transform: "scale(1.045)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rule-in": "rule-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ink-in": "ink-in 0.9s ease-out both",
        "guide-fade": "guide-fade 0.28s ease-out both",
        "guide-step": "guide-step 0.38s cubic-bezier(0.22, 1, 0.36, 1) both",
        "guide-pulse": "guide-pulse 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },
    },
  },
  plugins: [],
};
