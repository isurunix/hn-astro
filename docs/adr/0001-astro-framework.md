# ADR-0001: Astro as the web framework

**Status:** Accepted  
**Date:** 2026-06-21

## Context

We need a framework for building a server-rendered, read-only Hacker News reader. The requirements are:
- Server-side rendering (content changes constantly; SSG is unsuitable)
- No interactivity requiring a client-side framework
- TypeScript support
- Good Cloudflare Workers integration
- Minimal client-side JavaScript

## Decision

Use **Astro v6** as the framework with TypeScript strict mode.

## Rationale

- Astro is designed for content sites with minimal JS; every component is zero-JS by default
- Has a first-class `@astrojs/cloudflare` adapter for Workers SSR
- `Astro.self` enables recursive components (needed for comment trees) without a client framework
- `output: 'server'` mode matches the on-demand SSR requirement

## Consequences

- All pages are `.astro` files; no React/Vue/Svelte needed
- Client-side interactivity (comment collapse toggle) uses minimal inline `<script>` tags
- Recursive components use `Astro.self` rather than importing themselves by name
