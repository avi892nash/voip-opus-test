// Tailwind 4 moved its PostCSS plugin out of the `tailwindcss` package into
// its own `@tailwindcss/postcss` package. Same input/output shape, just a
// different require path. Autoprefixer is still wired in here because the
// PostCSS plugin doesn't yet ship with the same auto-vendor-prefixing the
// Lightning CSS-based @tailwindcss/vite plugin provides — keeping it for
// browser parity with the v3 build.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
