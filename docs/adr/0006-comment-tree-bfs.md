# ADR-0006: Parallel BFS for comment tree fetching

**Status:** Accepted  
**Date:** 2026-06-21

## Context

The HN API exposes no endpoint that returns a full comment subtree. Each comment item must be fetched individually via `/item/{id}.json`. A story can have hundreds of comments across many nesting levels.

Two naive approaches fail:
- **Sequential depth-first**: fetch a comment → read its `kids` → fetch each kid → recurse. Each level adds a serial round-trip. A 8-level thread = 8 serial round-trips × fan-out = very slow.
- **Fully parallel**: fetch every comment ID known at the start. But we only know the root's direct kids; deeper IDs are only discovered after fetching their parent.

## Decision

Use **parallel breadth-first search (BFS)** with a depth cap of 8 levels. Each BFS level fetches all items at that depth in parallel, then uses the results to discover the next level's IDs.

```
Level 0 (root kids):  Promise.all([id1, id2, id3, ...])   → 1 batch
Level 1 (their kids): Promise.all([id4, id5, id6, ...])   → 1 batch
...up to MAX_COMMENT_DEPTH = 8
```

Implementation is in `src/lib/api.ts` → `getCommentTree()`.

## Rationale

- Maximally parallelises fetches within each depth level
- Only 8 serial round-trips regardless of total comment count (threads taper off at depth)
- Worst case: 8 levels × ~50ms per batch ≈ 400ms — acceptable with CDN caching (see ADR-0002)

## Consequences

- Comments beyond depth 8 are silently omitted (rare in practice; most threads don't go that deep)
- Deleted items (`deleted: true`) are fetched but skipped when building the tree; their position in `kids` arrays is preserved as a `[deleted]` placeholder to maintain thread context
- Dead items (`dead: true`) are skipped silently
- Memory: all fetched items are held in a `Map<number, HNItem>` for the duration of the request; this is bounded by the depth cap and is not a concern at Workers memory limits
