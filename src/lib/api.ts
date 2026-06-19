import type { FeedType, HNItem, HNUser, ResolvedComment } from './types';

const BASE = 'https://hacker-news.firebaseio.com/v0';
export const PAGE_SIZE = 30;
const MAX_COMMENT_DEPTH = 8;

const FEED_PATHS: Record<FeedType, string> = {
  top: 'topstories',
  new: 'newstories',
  ask: 'askstories',
  show: 'showstories',
  job: 'jobstories',
};

export async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${BASE}/item/${id}.json`);
    if (!res.ok) return null;
    return res.json() as Promise<HNItem | null>;
  } catch {
    return null;
  }
}

export async function fetchUser(id: string): Promise<HNUser | null> {
  try {
    const res = await fetch(`${BASE}/user/${id}.json`);
    if (!res.ok) return null;
    return res.json() as Promise<HNUser | null>;
  } catch {
    return null;
  }
}

export async function fetchStoryIds(feed: FeedType): Promise<number[]> {
  const res = await fetch(`${BASE}/${FEED_PATHS[feed]}.json`);
  if (!res.ok) return [];
  return res.json() as Promise<number[]>;
}

export async function getStoriesPage(
  feed: FeedType,
  page: number
): Promise<{ stories: HNItem[]; totalPages: number }> {
  const ids = await fetchStoryIds(feed);
  const totalPages = Math.ceil(ids.length / PAGE_SIZE);
  const slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const items = await Promise.all(slice.map(fetchItem));
  const stories = items.filter(
    (item): item is HNItem => item !== null && !item.deleted && !item.dead
  );
  return { stories, totalPages };
}

export async function getCommentTree(rootItem: HNItem): Promise<ResolvedComment> {
  const itemMap = new Map<number, HNItem>();
  itemMap.set(rootItem.id, rootItem);

  let frontier: number[] = rootItem.kids ?? [];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_COMMENT_DEPTH) {
    const fetched = await Promise.all(frontier.map(fetchItem));
    const nextFrontier: number[] = [];
    for (const item of fetched) {
      if (!item) continue;
      itemMap.set(item.id, item);
      if (!item.deleted && !item.dead && item.kids?.length) {
        nextFrontier.push(...item.kids);
      }
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
