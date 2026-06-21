# ADR-0005: Custom regex HTML sanitizer (not sanitize-html)

**Status:** Accepted  
**Date:** 2026-06-21

## Context

HN API returns `text` fields (comments, Ask HN bodies, user `about`) as HTML strings. These must be sanitized before rendering with `set:html` to prevent XSS.

The initial plan was to use `sanitize-html` (npm). It was installed and worked in local dev, but failed in production.

## Decision

Use a **custom regex-based sanitizer** in `src/lib/sanitize.ts`. Do not install `sanitize-html` or any external sanitizer library.

## Rationale

`sanitize-html` depends on Node.js built-in modules (`path`, `fs`, `url`) via its transitive dependencies. When bundled for the Cloudflare Workers runtime, these imports cause build warnings and runtime failures — the Workers runtime does not provide Node.js built-ins (see ADR-0002).

HN's text output uses a narrow, known set of HTML tags: `<p>`, `<a href>`, `<i>`, `<b>`, `<pre>`, `<code>`, `<br>`. A custom regex sanitizer over this constrained input is safe and Workers-compatible.

## Implementation

`src/lib/sanitize.ts` allowlists `p`, `a`, `i`, `b`, `pre`, `code`, `br`. For `<a>` tags it:
- Strips `javascript:`, `data:`, and `vbscript:` hrefs
- Adds `rel="noopener noreferrer"`
- All other attributes are dropped

All other tags are stripped (replaced with empty string).

## Consequences

- No external sanitizer dependency
- The sanitizer is intentionally narrow — if HN ever uses additional tags (e.g. `<ul>`, `<li>`), the sanitizer must be updated and a new ADR recorded for the change
- All `set:html` usages in `.astro` files must pass through `sanitize()` — never render raw HN HTML directly
