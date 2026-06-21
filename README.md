# HN Astro

A modern, fast alternative UI for [Hacker News](https://news.ycombinator.com), built with Astro and deployed on Cloudflare Pages.

## Features

- Browse Top, New, Ask HN, Show HN, and Jobs feeds
- Full comment threads with collapse/expand
- User profiles
- No JavaScript required for reading — comments collapse with minimal inline JS
- Fast: server-rendered at the edge with CDN caching, no client-side data fetching
- Clean typography and mobile-friendly layout

## Tech stack

- [Astro](https://astro.build) v6 — SSR framework
- [Tailwind CSS](https://tailwindcss.com) v4 — styling
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting (free tier)
- [HN Firebase API](https://github.com/HackerNews/API) — data source

## Getting started

**Prerequisites:** Node.js 24, npm 11

```bash
git clone <repo-url>
cd hn-astro
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run check` | TypeScript type checking |

## Deploying to Cloudflare Pages

1. Push this repo to GitHub (or any Git provider)
2. In the [Cloudflare Pages dashboard](https://dash.cloudflare.com), create a new project and connect your repo
3. Set the build configuration:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add one environment variable under **Settings → Environment variables:**
   - `ENABLE_EXPERIMENTAL_COREPACK=1` — required for npm version pinning to work correctly in CI (see [ADR-0008](docs/adr/0008-corepack-npm-version.md))
5. Deploy

Subsequent pushes to `main` deploy automatically.

## Project structure

```
src/
├── lib/          # HN API client, types, utilities, HTML sanitizer
├── components/   # Astro components (StoryItem, Comment, Pagination, …)
├── layouts/      # BaseLayout
├── styles/       # Global CSS (Tailwind entry point)
└── pages/        # File-based routes
    ├── top/[page].astro
    ├── new/[page].astro
    ├── ask/[page].astro
    ├── show/[page].astro
    ├── jobs/[page].astro
    ├── item/[id].astro
    └── user/[id].astro
docs/adr/         # Architecture Decision Records
```

## Contributing

Architectural decisions are documented as ADRs in `docs/adr/`. Read those before making changes that affect the framework, deployment, or data-fetching strategy. See `CLAUDE.md` for the full process.
