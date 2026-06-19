# HN Astro — Hacker News Alternative UI

A modern Hacker News reader built with Astro, deployed free on Cloudflare Pages.

## What this is

A read-only alternative UI for Hacker News that fetches data from the official HN Firebase REST API (`https://hacker-news.firebaseio.com/v0/`). No authentication, no posting. Pure reading experience with better typography and navigation than news.ycombinator.com.

## Deployment Target

**Cloudflare Pages** (free tier). This drives several technical decisions:

- Use `@astrojs/cloudflare` adapter, NOT `@astrojs/node`
- Runtime is the Cloudflare Workers runtime — no Node.js APIs available
- `fetch()` is available natively; all HN API calls use plain `fetch()`
- Do NOT use `fs`, `path`, `child_process`, or any Node built-ins
- Do NOT use the Firebase JS SDK — it's Node-dependent and unnecessary; the HN API is plain REST
- Cloudflare Pages free tier: unlimited requests, 500 builds/month, 100k Worker invocations/day (SSR pages count as Worker invocations — well within limits for a personal reader)

### Deploy command
```
npm run build
```
Output goes to `dist/`. Point Cloudflare Pages at this repo, set build command to `npm run build`, output directory to `dist/`.

## Rendering Strategy

`output: 'server'` (full SSR) — every page renders on-demand via Cloudflare Workers. HN content changes constantly; stale SSG pages would defeat the purpose.

Exception: `src/pages/index.astro` uses `export const prerender = true` and redirects to `/top/1`.

### Caching

Set `Cache-Control` headers on rendered responses to avoid hammering the HN API on repeated visits:

- Story list pages (`/top/[page]`, etc.): `s-maxage=60, stale-while-revalidate=300` (1 min fresh, 5 min stale-while-revalidate)
- Item pages (`/item/[id]`): `s-maxage=120, stale-while-revalidate=600`
- User pages (`/user/[id]`): `s-maxage=300, stale-while-revalidate=3600`

Set these in each page's frontmatter: `Astro.response.headers.set('Cache-Control', '...')`.

## Project Structure

```
hn-astro/
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── CLAUDE.md
│
└── src/
    ├── env.d.ts
    ├── lib/
    │   ├── api.ts          # All HN API calls + comment tree BFS algorithm
    │   ├── types.ts        # TypeScript interfaces for HN data
    │   └── utils.ts        # timeAgo(), stripWWW(), decodeHtml()
    ├── components/
    │   ├── NavBar.astro
    │   ├── StoryItem.astro
    │   ├── StoryList.astro
    │   ├── Pagination.astro
    │   ├── Comment.astro
    │   ├── CommentTree.astro
    │   └── UserCard.astro
    ├── layouts/
    │   └── BaseLayout.astro
    └── pages/
        ├── index.astro           # prerender=true, redirects to /top/1
        ├── top/[page].astro
        ├── new/[page].astro
        ├── ask/[page].astro
        ├── show/[page].astro
        ├── jobs/[page].astro
        ├── item/[id].astro       # Story detail + full comment tree
        └── user/[id].astro       # User profile
```

## TypeScript Types (`src/lib/types.ts`)

```ts
export type HNItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export interface HNItem {
  id: number;
  type: HNItemType;
  by?: string;
  time?: number;           // Unix timestamp
  text?: string;           // HTML-encoded body (comments, Ask HN)
  url?: string;            // External link (absent on Ask/Show HN)
  title?: string;
  score?: number;
  descendants?: number;    // Total comment count on stories
  kids?: number[];         // Direct child IDs ordered by score
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
}

export interface HNUser {
  id: string;
  created: number;         // Unix timestamp
  karma: number;
  about?: string;          // HTML-encoded
  submitted?: number[];    // Can be thousands of IDs — do not fetch all
}

export interface ResolvedComment extends HNItem {
  children: ResolvedComment[];
}
```

## Data Fetching (`src/lib/api.ts`)

All fetching is server-side. No client-side data fetching.

### Constants
```ts
const BASE = 'https://hacker-news.firebaseio.com/v0';
export const PAGE_SIZE = 30;
const MAX_COMMENT_DEPTH = 8;
```

### Functions
```ts
fetchItem(id: number): Promise<HNItem | null>
fetchUser(id: string): Promise<HNUser | null>
fetchStoryIds(feed: FeedType): Promise<number[]>
getStoriesPage(feed: FeedType, page: number): Promise<{ stories: HNItem[]; totalPages: number }>
getCommentTree(rootItem: HNItem): Promise<ResolvedComment>
```

`FeedType = 'top' | 'new' | 'ask' | 'show' | 'job'`

Feed endpoints:
- `top` → `/topstories.json`
- `new` → `/newstories.json`
- `ask` → `/askstories.json`
- `show` → `/showstories.json`
- `job` → `/jobstories.json`

`getStoriesPage`: fetch all IDs → slice `[(page-1)*30 .. page*30]` → `Promise.all` fetch the 30 items → filter out null/deleted/dead.

### Comment Tree — BFS Algorithm

The HN API has no subtree endpoint. Each comment must be fetched individually. Naive depth-first = sequential round-trips = very slow. Solution: **parallel BFS**, fetching one full depth level per round-trip batch.

```ts
async function getCommentTree(rootItem: HNItem): Promise<ResolvedComment> {
  const itemMap = new Map<number, HNItem>();
  itemMap.set(rootItem.id, rootItem);

  let frontier: number[] = rootItem.kids ?? [];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_COMMENT_DEPTH) {
    const fetched = await Promise.all(frontier.map(id => fetchItem(id)));
    const nextFrontier: number[] = [];
    for (const item of fetched) {
      if (!item || item.deleted || item.dead) continue;
      itemMap.set(item.id, item);
      if (item.kids?.length) nextFrontier.push(...item.kids);
    }
    frontier = nextFrontier;
    depth++;
  }

  function buildNode(id: number): ResolvedComment {
    const item = itemMap.get(id)!;
    return {
      ...item,
      children: (item.kids ?? [])
        .filter(kidId => itemMap.has(kidId))
        .map(kidId => buildNode(kidId)),
    };
  }

  return buildNode(rootItem.id);
}
```

Performance: 8 levels × ~50ms per batch ≈ 400ms worst case. Acceptable for SSR with CDN caching.

## Pages

### `/top/[page].astro` (and `/new`, `/ask`, `/show`, `/jobs`)
1. Parse `Astro.params.page` as int; redirect to `/top/1` if invalid
2. Call `getStoriesPage(feed, page)`
3. Return 404 if `page > totalPages`
4. Set `Cache-Control` header
5. Render `<StoryList>` + `<Pagination>`

### `/item/[id].astro`
1. Parse `Astro.params.id` as int; 404 if invalid
2. `fetchItem(id)` — 404 if null
3. Only render story items (type `story`, `job`, `poll`); redirect comments to their parent
4. `getCommentTree(item)` for comment thread
5. Set `Cache-Control` header
6. Render story header + `<CommentTree>`

### `/user/[id].astro`
1. `fetchUser(Astro.params.id)` — 404 if null
2. Show karma, account age, `about` (sanitized HTML)
3. Show `submitted.length` count but do NOT fetch all submitted items
4. Link to `https://news.ycombinator.com/submitted?id={id}` for full history

## Components

### `StoryItem.astro`
Props: `story: HNItem`, `rank: number`

- Title links to `story.url` if present, otherwise to `/item/[story.id]`
- Domain badge: `new URL(story.url).hostname.replace(/^www\./, '')` — omit if no URL
- Subline: score · author (→ `/user/[by]`) · time · N comments (→ `/item/[id]`)

### `CommentTree.astro`
Recursive component. Use `Astro.self` for recursion:
```astro
{comments.map(c => (
  <>
    <Comment comment={c} depth={depth} />
    <Astro.self comments={c.children} depth={depth + 1} />
  </>
))}
```

### `Comment.astro`
Props: `comment: ResolvedComment`, `depth: number`

- Indent via `style={`padding-left: ${depth * 1.25}rem`}` + left border
- Body via `<Fragment set:html={sanitizedText} />` — MUST sanitize first
- Collapsible toggle: minimal inline `<script>` toggling a `data-collapsed` attribute, no framework needed

### `Pagination.astro`
Props: `currentPage: number`, `totalPages: number`, `basePath: string`

Pure `<a>` links. Show prev/next + window of ±2 page numbers around current. No JS.

## Styling

**Tailwind CSS v4** via `@astrojs/tailwind`. No web fonts (system font stack only — keeps pages fast).

Palette:
- Background: `bg-stone-50`
- Text: `text-gray-900`
- Accent (active nav, scores): `text-orange-500`
- Comment borders: `border-l-2 border-gray-200`
- Meta text: `text-gray-500 text-sm`

## HTML Sanitization

HN returns `text` (comments, Ask HN bodies, user `about`) as HTML strings. Always sanitize before `set:html`:

```ts
import sanitizeHtml from 'sanitize-html';

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'a', 'i', 'b', 'pre', 'code'],
    allowedAttributes: { a: ['href', 'rel'] },
    transformTags: {
      a: (_, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer' },
      }),
    },
  });
}
```

## Packages

| Package | Purpose |
|---|---|
| `astro` | Framework |
| `@astrojs/cloudflare` | Cloudflare Pages SSR adapter |
| `@astrojs/tailwind` | Tailwind integration |
| `tailwindcss` | Styling (v4) |
| `sanitize-html` | Sanitize HN HTML before set:html |
| `@types/sanitize-html` | Types for above |

## `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [tailwind()],
});
```

## Cloudflare-Specific Constraints

- **No Node.js built-ins**: `fs`, `path`, `os`, `crypto` (Web Crypto is available), `stream`, etc. are not available in the Workers runtime. The codebase must not import them.
- **`sanitize-html` compatibility**: `sanitize-html` depends on some Node internals. If it fails in the Workers runtime, replace with a lightweight alternative like `isomorphic-dompurify` or a manual regex-based strip (only `<script>`, `<iframe>`, on-event attributes are the real dangers in HN data).
- **No `process.env`** unless variables are declared in `wrangler.toml` or Cloudflare Pages environment variables. Don't use env vars in this project (no secrets needed).
- **Bundle size**: Cloudflare Workers have a 1MB compressed bundle limit (free tier). Avoid large dependencies.

## Implementation Order

1. Scaffold: `npm create astro@latest` → choose "Empty" template, TypeScript strict
2. Install packages: `@astrojs/cloudflare tailwindcss @astrojs/tailwind sanitize-html @types/sanitize-html`
3. `astro.config.mjs` — set output + adapter
4. `src/lib/types.ts` → `src/lib/utils.ts` → `src/lib/api.ts` (story fetching first, no comment tree yet)
5. `BaseLayout.astro` + `NavBar.astro`
6. `top/[page].astro` + `StoryItem` + `StoryList` + `Pagination` → **working story list**
7. Remaining feed pages (`/new`, `/ask`, `/show`, `/jobs`) — copy top page, change feed name
8. `index.astro` redirect
9. `getCommentTree` BFS + `Comment` + `CommentTree` + `item/[id].astro` → **working threads**
10. `user/[id].astro` + `UserCard`
11. Sanitization pass: all `set:html` usages go through `sanitize()`
12. Cache-Control headers on all SSR pages
13. CSS polish, mobile layout, error/empty states
14. `npm run build` locally and verify no Node.js import errors before deploying

## Known Edge Cases

- **Deleted comments**: appear in `kids` arrays as `{ id: N, deleted: true }` with no other fields. Render a subtle `[deleted]` placeholder rather than nothing (preserves thread context).
- **Dead items**: `dead: true` items are shadowbanned by HN mods. Skip silently.
- **Ask/Show HN**: no `url` field. Title must link to `/item/[id]`, not an external URL. Omit domain badge.
- **Poll items**: rare. `type: 'poll'` has `parts` (array of `pollopt` IDs). For MVP, render as a plain story without vote breakdown.
- **Large `submitted` arrays**: can have thousands of IDs. Never fetch them all. Show count only.
- **Page param validation**: `Astro.params.page` is always a string. Parse with `parseInt`, validate range before any API call.
