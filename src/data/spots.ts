import { FRUITS } from './fruits';
import type { Fruit, Spot, SpotKind } from './types';

const MONTH_LABEL = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const SPOT_META: Record<SpotKind, { label: string; mark: string; color: string }> = {
  basics: { label: '基本檔案', mark: '本', color: '#6B4E2E' },
  season: { label: '產季月曆', mark: '季', color: '#E8871A' },
  origin: { label: '產地巡禮', mark: '地', color: '#4C8C4A' },
  variety: { label: '品種圖譜', mark: '種', color: '#B4472E' },
  pick: { label: '挑選保存', mark: '選', color: '#C98F2B' },
  nutrition: { label: '營養密碼', mark: '養', color: '#3E8E8A' },
  trivia: { label: '冷知識', mark: '趣', color: '#8A5CA8' },
  market: { label: '北農檔案', mark: '市', color: '#2F6690' },
  org: { label: '組織分工', mark: '織', color: '#3D5A80' },
  rule: { label: '拍賣制度', mark: '拍', color: '#B4472E' },
};

/** 由水果資料自動生成知識點，避免重複維護 */
function buildSpots(fruit: Fruit): Spot[] {
  const base = {
    fruitId: fruit.id,
    keywords: [fruit.name, fruit.en, fruit.alias, fruit.family, ...fruit.regions.map((r) => r.name)],
  };

  const spots: Spot[] = [
    {
      ...base,
      id: `${fruit.id}:basics`,
      kind: 'basics',
      title: `認識${fruit.name}`,
      lead: fruit.tagline,
      points: [
        `別名｜${fruit.alias}`,
        `英文名｜${fruit.en}`,
        `學名｜${fruit.sci}`,
        `科別｜${fruit.family}`,
        `產季｜${fruit.harvestNote}`,
      ],
      mark: SPOT_META.basics.mark,
    },
    {
      ...base,
      id: `${fruit.id}:season`,
      kind: 'season',
      title: `${fruit.name}的產季月曆`,
      lead: fruit.harvestNote,
      points: [
        `盛產月份｜${fruit.peak.map((m) => MONTH_LABEL[m - 1]).join('、')}`,
        '亮格代表當令盛產，風味與價格通常最理想。',
      ],
      months: fruit.peak,
      mark: SPOT_META.season.mark,
    },
    {
      ...base,
      id: `${fruit.id}:origin`,
      kind: 'origin',
      title: `${fruit.name}的產地巡禮`,
      lead: `${fruit.name}主要栽培於以下產區：`,
      points: fruit.regions.map((r) => `${r.name}｜${r.note}`),
      mark: SPOT_META.origin.mark,
    },
    {
      ...base,
      id: `${fruit.id}:variety`,
      kind: 'variety',
      title: `${fruit.name}品種圖譜`,
      lead: `台灣常見的${fruit.name}品種有 ${fruit.varieties.length} 個：`,
      points: fruit.varieties.map((v) => `${v.name}｜${v.note}`),
      keywords: [...base.keywords, ...fruit.varieties.map((v) => v.name)],
      mark: SPOT_META.variety.mark,
    },
    {
      ...base,
      id: `${fruit.id}:pick`,
      kind: 'pick',
      title: `如何挑${fruit.name}、怎麼保存`,
      lead: '挑選與保存重點：',
      points: fruit.pick,
      mark: SPOT_META.pick.mark,
    },
    {
      ...base,
      id: `${fruit.id}:nutrition`,
      kind: 'nutrition',
      title: `${fruit.name}的營養密碼`,
      lead: '營養重點：',
      points: fruit.nutrition,
      mark: SPOT_META.nutrition.mark,
    },
    {
      ...base,
      id: `${fruit.id}:trivia`,
      kind: 'trivia',
      title: `關於${fruit.name}的冷知識`,
      lead: '你可能不知道：',
      points: fruit.trivia,
      mark: SPOT_META.trivia.mark,
    },
  ];

  if (fruit.market && fruit.market.length > 0) {
    spots.push({
      ...base,
      id: `${fruit.id}:market`,
      kind: 'market',
      title: `${fruit.name}的北農檔案`,
      lead: '台北農產運銷公司拍賣資料中的代號與分類：',
      points: fruit.market.map((m) => `${m.code}｜${m.note}`),
      keywords: [...base.keywords, ...fruit.market.map((m) => m.code), '北農', '拍賣'],
      mark: SPOT_META.market.mark,
    });
  }

  return spots;
}

export interface Island {
  fruit: Fruit;
  spots: Spot[];
}

export const ISLANDS: Island[] = FRUITS.map((fruit) => ({
  fruit,
  spots: buildSpots(fruit),
}));

export const SPOTS: Spot[] = ISLANDS.flatMap((i) => i.spots);

export const SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(
  SPOTS.map((s) => [s.id, s]),
);

export const ISLAND_BY_FRUIT: Record<string, Island> = Object.fromEntries(
  ISLANDS.map((i) => [i.fruit.id, i]),
);

export const TOTAL_ISLANDS = ISLANDS.length;
export const TOTAL_SPOTS = SPOTS.length;

export function monthLabel(m: number): string {
  return MONTH_LABEL[m - 1] ?? `${m}月`;
}

export const MONTHS = MONTH_LABEL;
