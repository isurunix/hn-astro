# ADR-0002: Cloudflare Pages as deployment target

**Status:** Accepted  
**Date:** 2026-06-21

## Context

The project needs free hosting for a personal Hacker News reader. Options considered:
- Cloudflare Pages (free tier)
- Vercel (free tier)
- Netlify (free tier)
- Self-hosted Node.js

## Decision

Deploy on **Cloudflare Pages** free tier using the `@astrojs/cloudflare` SSR adapter.

## Rationale

- Free tier includes unlimited requests, 500 builds/month, 100k Worker invocations/day
- Global CDN with edge SSR means low latency worldwide
- `Cache-Control` headers on SSR responses are respected by Cloudflare's CDN, avoiding repeated HN API calls
- No cold starts compared to serverless functions on other platforms

## Consequences

- Must use `@astrojs/cloudflare` adapter, NOT `@astrojs/node`
- Runtime is the **Cloudflare Workers runtime** — no Node.js APIs available at runtime
  - No `fs`, `path`, `os`, `stream`, `crypto` (Web Crypto is fine), `child_process`
  - No Firebase JS SDK (Node-dependent; use plain REST `fetch()` instead)
  - No `process.env` without declaring variables in Cloudflare Pages dashboard
- Bundle size limit: 1MB compressed (free tier Workers limit) — avoid heavy dependencies
- Build command: `npm run build`; output directory: `dist/`
- SSR pages count as Worker invocations (well within 100k/day limit for a personal reader)

## Cache-Control strategy

| Route | Header |
|---|---|
| `/top/[page]`, `/new/[page]`, etc. | `s-maxage=60, stale-while-revalidate=300` |
| `/item/[id]` | `s-maxage=120, stale-while-revalidate=600` |
| `/user/[id]` | `s-maxage=300, stale-while-revalidate=3600` |
