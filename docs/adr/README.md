# Architecture Decision Records

Decisions are recorded here as immutable ADRs. Once an ADR is accepted, it is never edited.
If a decision is revisited or reversed, a new ADR is created that supersedes the old one.
The old ADR's status is updated to `Superseded by ADR-XXXX`.

## Format

Each ADR follows this structure:

```
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD

## Context
## Decision
## Rationale
## Consequences
```

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-astro-framework.md) | Astro as the web framework | Accepted |
| [0002](0002-cloudflare-pages-deployment.md) | Cloudflare Pages as deployment target | Accepted |
| [0003](0003-ssr-rendering-strategy.md) | Full SSR rendering strategy | Accepted |
| [0004](0004-tailwind-vite-plugin.md) | Tailwind CSS v4 via @tailwindcss/vite | Accepted |
| [0005](0005-html-sanitizer.md) | Custom regex HTML sanitizer (not sanitize-html) | Accepted |
| [0006](0006-comment-tree-bfs.md) | Parallel BFS for comment tree fetching | Accepted |
| [0007](0007-nodejs-version-nvmrc.md) | Pin Node.js version via .nvmrc | Accepted |
| [0008](0008-corepack-npm-version.md) | Pin npm version via packageManager field and Corepack | Accepted |
