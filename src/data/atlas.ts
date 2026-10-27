import { POLICY_ID, POLICY_ISLAND } from './policy';
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
 * 世界的島嶼清單＝政策島（行政中樞）＋ 12 座水果島。
 * 水果島相關的篩選（產季、科別）只作用在水果島上，政策島另行處理。
 */
export const ALL_ISLANDS: Island[] = [POLICY_ISLAND, ...ISLANDS];

export const ALL_ISLAND_BY_ID: Record<string, Island> = {
  ...ISLAND_BY_FRUIT,
  [POLICY_ID]: POLICY_ISLAND,
};

export const ALL_SPOTS: Spot[] = ALL_ISLANDS.flatMap((i) => i.spots);

export const ALL_SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(
  ALL_SPOTS.map((s) => [s.id, s]),
);

/** 含政策島的水果索引，供顯示名稱用 */
export const ISLAND_FRUIT_BY_ID: Record<string, Fruit> = Object.fromEntries(
  ALL_ISLANDS.map((i) => [i.fruit.id, i.fruit]),
);

export function islandName(id: string | null): string {
  if (!id) return '';
  return ISLAND_FRUIT_BY_ID[id]?.name ?? id;
}

export const TOTAL_ALL_ISLANDS = ALL_ISLANDS.length;
export const TOTAL_ALL_SPOTS = ALL_SPOTS.length;

export { ISLANDS, MONTHS, POLICY_ISLAND, POLICY_ID, TOTAL_ISLANDS, TOTAL_SPOTS, SPOT_BY_ID };
