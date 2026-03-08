/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--color-bg-main)",
          panel: "var(--color-bg-panel)",
          muted: "var(--color-bg-muted)",
        },
        copy: {
          DEFAULT: "var(--color-text-main)",
          muted: "var(--color-text-secondary)",
        },
        border: {
          DEFAULT: "var(--color-border)",
        },
        brand: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          hover: "var(--color-danger-hover)",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
}

