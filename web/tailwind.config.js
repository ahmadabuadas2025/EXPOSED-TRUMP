/** @type {import('tailwindcss').Config} */
// Colours are CSS variables defined in src/index.css so light and dark themes swap in one place.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: v("page"), surface: v("surface"), raised: v("raised"),
        ink: v("ink"), ink2: v("ink2"), muted: v("muted"), line: v("line"),
        accent: v("accent"), accentInk: v("accent-ink"),
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        serif: ['"Source Serif 4 Variable"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
