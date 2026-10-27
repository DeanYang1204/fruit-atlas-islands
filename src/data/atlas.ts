import {
  MARKET1_ID,
  MARKET2_ID,
  MARKET_FRUIT_BY_ID,
  MARKET_ISLANDS,
  MARKET_ISLAND_BY_ID,
  isMarket,
} from './markets';
import {
  ISLANDS,
  ISLAND_BY_FRUIT,
  MONTHS,
  SPOT_BY_ID,
  TOTAL_ISLANDS,
  TOTAL_SPOTS,
} from './spots';
import type { Fruit, Spot } from './types';
import type { Island } from './spots';

/**
 * 世界的島嶼清單＝兩座主島（第一／第二果菜市場）＋ 12 座水果島。
 * 水果島相關的篩選（產季、科別）只作用在水果島上，主島另行處理。
 */
export const ALL_ISLANDS: Island[] = [...MARKET_ISLANDS, ...ISLANDS];

export const ALL_ISLAND_BY_ID: Record<string, Island> = {
  ...ISLAND_BY_FRUIT,
  ...MARKET_ISLAND_BY_ID,
};

export const ALL_SPOTS: Spot[] = ALL_ISLANDS.flatMap((i) => i.spots);

export const ALL_SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(
  ALL_SPOTS.map((s) => [s.id, s]),
);

/** 兩座主島的順序，UI 要讓它們排在最前面 */
export const MAIN_ISLAND_IDS: string[] = [MARKET1_ID, MARKET2_ID];

/** 含主島的水果索引，供顯示名稱用 */
export const ISLAND_FRUIT_BY_ID: Record<string, Fruit> = Object.fromEntries(
  ALL_ISLANDS.map((i) => [i.fruit.id, i.fruit]),
);

export function islandName(id: string | null): string {
  if (!id) return '';
  return ISLAND_FRUIT_BY_ID[id]?.name ?? id;
}

export function isMainIsland(id: string | null): boolean {
  return !!id && isMarket(id);
}

/** 主島／水果島在名牌上的稱呼：主島不加「島」字 */
export function islandLabelName(id: string): string {
  const name = ISLAND_FRUIT_BY_ID[id]?.name ?? id;
  return MARKET_FRUIT_BY_ID[id] ? name : `${name}島`;
}

export const TOTAL_ALL_ISLANDS = ALL_ISLANDS.length;
export const TOTAL_ALL_SPOTS = ALL_SPOTS.length;

export {
  ISLANDS,
  MONTHS,
  MARKET1_ID,
  MARKET2_ID,
  MARKET_ISLANDS,
  MARKET_FRUIT_BY_ID,
  isMarket,
  TOTAL_ISLANDS,
  TOTAL_SPOTS,
  SPOT_BY_ID,
};
