# HN Astro — Hacker News Alternative UI

A read-only alternative UI for Hacker News. Fetches from the official HN Firebase REST API (`https://hacker-news.firebaseio.com/v0/`). No auth, no posting. Deployed free on Cloudflare Pages.

---

## Working with this codebase

### ADR process — read this first

**Before writing any code**, read `docs/adr/README.md` and any ADRs relevant to the area you are working in. ADRs record every architectural decision and the reasoning behind it. Violating an ADR without a new one to supersede it is a bug, not a style choice.

**When a new architectural decision is needed** (new dependency, change to rendering strategy, new infra, different algorithm for a core concern, etc.):

1. Draft an ADR and present it to the user for review
2. **Do not implement anything until the user explicitly approves the ADR**
3. Once approved, implement and commit the ADR alongside the code change
4. Number ADRs sequentially from the last entry in `docs/adr/README.md`

**ADRs are immutable.** Never edit an accepted ADR. If a decision changes, create a new ADR with `Supersedes ADR-XXXX` in the status line, then update the old ADR's status to `Superseded by ADR-XXXX`.

---

## Critical runtime constraints

This project runs in the **Cloudflare Workers runtime**, not Node.js. These constraints are hard limits — violating them causes build failures or silent runtime errors in production:

- **No Node.js built-ins**: `fs`, `path`, `os`, `stream`, `crypto` (Web Crypto API is fine), `child_process` — none are available
- **No Firebase JS SDK** — it is Node-dependent; use plain `fetch()` to the REST API
- **No `process.env`** — declare any env vars in Cloudflare Pages dashboard; this project needs none
- **Bundle size ≤ 1MB compressed** — avoid large dependencies; always check before adding a package
- **All new dependencies**: verify Workers-runtime compatibility before installing; check for Node built-in imports

See ADR-0002 for the full deployment rationale.

---

## Project structure

```
hn-astro/
├── docs/adr/               # Architecture Decision Records — read before coding
├── src/
│   ├── lib/
│   │   ├── api.ts          # HN API calls + comment tree BFS (ADR-0006)
│   │   ├── types.ts        # HNItem, HNUser, ResolvedComment, FeedType
│   │   ├── utils.ts        # timeAgo(), getDomain()
│   │   └── sanitize.ts     # Custom HTML sanitizer (ADR-0005)
│   ├── components/
│   │   ├── NavBar.astro
│   │   ├── StoryItem.astro
│   │   ├── StoryList.astro
│   │   ├── Pagination.astro
│   │   ├── Comment.astro
│   │   ├── CommentTree.astro   # Recursive via Astro.self
│   │   └── UserCard.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── styles/
│   │   └── global.css      # @import "tailwindcss" + hn-text prose styles
│   └── pages/
│       ├── index.astro         # prerender=true → redirect /top/1
│       ├── top/[page].astro
│       ├── new/[page].astro
│       ├── ask/[page].astro
│       ├── show/[page].astro
│       ├── jobs/[page].astro
│       ├── item/[id].astro     # Story + comment tree
│       └── user/[id].astro     # User profile
├── .nvmrc                  # Node 24 (ADR-0007)
├── astro.config.mjs
├── tsconfig.json
└── package.json            # packageManager field pins npm 11 (ADR-0008)
```

---

## Key behaviours to preserve

- **HTML from HN API**: always pass through `sanitize()` before `set:html` — never render raw HN HTML
- **Comment tree**: fetched via parallel BFS in `getCommentTree()` — do not replace with sequential fetching
- **Deleted comments**: render a `[deleted]` placeholder; do not remove them (preserves thread structure)
- **Dead items**: skip silently (`dead: true`)
- **Page params**: `Astro.params.page` / `Astro.params.id` are strings — always `parseInt` and validate range before any API call
- **`submitted` arrays on users**: can be thousands of IDs — never fetch them all; show count only
- **Cache-Control headers**: set on every SSR page — values are in ADR-0002

---

## Cloudflare Pages deployment

Build command: `npm run build` · Output directory: `dist/`

The `ENABLE_EXPERIMENTAL_COREPACK=1` environment variable must be set in the Cloudflare Pages dashboard for npm version pinning (ADR-0008) to take effect. This is not in the repo.
