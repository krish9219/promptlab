import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lessons/**/*.md"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        panel: "#141414",
        panel2: "#1c1c1c",
        line: "#262626",
        muted: "#737373",
        accent: "#7c3aed",
        good: "#34d399",
        warn: "#facc15",
        danger: "#ef4444",
        beginner: "#34d399",
        intermediate: "#22d3ee",
        advanced: "#a855f7",
        expert: "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;
