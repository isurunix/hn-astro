# ADR-0004: Tailwind CSS v4 via @tailwindcss/vite

**Status:** Accepted  
**Date:** 2026-06-21

## Context

Tailwind CSS is the chosen styling solution. Astro's official Tailwind integration is `@astrojs/tailwind`, but compatibility between package versions became an issue.

## Decision

Use **Tailwind CSS v4** integrated via `@tailwindcss/vite` (Tailwind's own Vite plugin), configured directly in `astro.config.mjs` under `vite.plugins`. Do NOT use `@astrojs/tailwind`.

## Rationale

`@astrojs/tailwind@6.0.2` declares a peer dependency of `astro@^3.0.0 || ^4.0.0 || ^5.0.0` — it does not support Astro v6. Installing both causes `npm` to report an unresolvable peer conflict. Tailwind v4 ships its own Vite plugin (`@tailwindcss/vite`) that integrates directly with Vite and works with any Vite-based framework including Astro v6.

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

CSS is imported via `@import "tailwindcss"` in the global stylesheet (no `tailwind.config.js` needed — Tailwind v4 uses CSS-first configuration).

## Consequences

- No `tailwind.config.js` or `tailwind.config.mjs` file in the project root
- Tailwind directives go in `src/styles/global.css` via `@import "tailwindcss"`
- Custom theme tokens use CSS `@layer` / CSS custom properties, not a JS config object
- `@astrojs/tailwind` must not be installed
