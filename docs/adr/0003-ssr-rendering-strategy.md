# ADR-0003: Full SSR rendering strategy

**Status:** Accepted  
**Date:** 2026-06-21

## Context

Astro supports three rendering modes: static (SSG), server (full SSR), and hybrid (per-page). The HN API is a live feed — story scores, rankings, and comment counts change continuously.

## Decision

Use `output: 'server'` (full SSR) with a single static exception: `src/pages/index.astro` uses `export const prerender = true` as a static redirect to `/top/1`.

## Rationale

- SSG pages would be stale within minutes; a news reader with stale data defeats its purpose
- Per-page hybrid mode adds complexity with no benefit here — every data-bearing page needs fresh data
- The index page is a pure redirect with no data; making it static avoids a Worker invocation on every root visit

## Consequences

- `astro.config.mjs` must set `output: 'server'`
- Every SSR page must set `Cache-Control` headers manually (see ADR-0002 for values)
- `Astro.params` are available at request time; no `getStaticPaths()` needed for dynamic routes
- `Astro.params.page` and `Astro.params.id` are always strings — always parse and validate before use
