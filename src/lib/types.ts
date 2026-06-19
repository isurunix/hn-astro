export type HNItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export type FeedType = 'top' | 'new' | 'ask' | 'show' | 'job';

export interface HNItem {
  id: number;
  type: HNItemType;
  by?: string;
  time?: number;
  text?: string;
  url?: string;
  title?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
  poll?: number;
  parts?: number[];
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export interface ResolvedComment extends HNItem {
  children: ResolvedComment[];
}
