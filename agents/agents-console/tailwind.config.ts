import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        line: "#d9e0e8",
        field: "#f6f8fb",
        action: "#0f766e",
        warn: "#b45309"
      }
    }
  },
  plugins: []
};

export default config;
