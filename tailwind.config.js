/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Height-based rather than width-based on purpose: the practice
      // screen's constraint is vertical budget, not width. iPad landscape is
      // ~768-820px tall and hits this; iPad portrait is ~1024-1180px and does
      // not. One variant therefore covers both orientations correctly, which
      // a width breakpoint could not do.
      screens: {
        short: { raw: "(max-height: 860px)" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -14px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
};
