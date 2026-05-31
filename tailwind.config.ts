import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg:           "#050e05",
          card:         "#040c04",
          border:       "#1a3d1a",       // lebih terang dari #0d2b0d
          border2:      "#2a6a2a",       // hover border
          dim:          "#2a6a2a",       // queue label, clear buttons
          muted:        "#4aaa4a",       // secondary text
          text:         "#a0d0a0",       // body text
          bright:       "#c8f0c8",       // filename, primary text
          accent:       "#39ff14",       // neon green
          "accent-dim": "#1a5a1a",
          "accent-glow":"rgba(57,255,20,0.15)",
          err:          "#4a1a0a",       // error border
          "err-text":   "#cc6633",       // error text — lebih visible
          warn:         "#3a6a0a",
          "warn-text":  "#7abd2a",
          done:         "#1a3d1a",
        },
      },
      fontFamily: {
        sans: ["JetBrains Mono", "monospace"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none:    "0px",
        sm:      "0px",
        md:      "0px",
        lg:      "0px",
        xl:      "0px",
        "2xl":   "0px",
        full:    "0px",
      },
      animation: {
        "blink":      "blink 1s step-end infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.15s ease-out",
        "slide-up":   "slideUp 0.15s ease-out",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
