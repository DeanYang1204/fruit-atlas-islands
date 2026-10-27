export type TimeKey = 'dawn' | 'day' | 'dusk' | 'night';

export type ToggleKey = 'names' | 'fruits' | 'flows' | 'freeze' | 'bird' | 'log';

export interface Region {
  /** 產地（縣市／鄉鎮） */
  name: string;
  /** 產地特色一句話 */
  note: string;
}

export interface Variety {
  /** 品種／品系名稱 */
  name: string;
  /** 品種特色 */
  note: string;
}

export interface MarketCode {
  /** 北農拍賣代號 */
  code: string;
  /** 代號說明 */
  note: string;
}

export interface Fruit {
  id: string;
  /** 中文名 */
  name: string;
  /** 別名（含台語） */
  alias: string;
  /** 英文名 */
  en: string;
  /** 學名 */
  sci: string;
  /** 科別 */
  family: string;
  /** 主色（島嶼／果實） */
  color: string;
  /** 輔色（樹冠） */
  accent: string;
  /** 盛產月份 1-12 */
  peak: number[];
  /** 產季補充說明 */
  harvestNote: string;
  regions: Region[];
  varieties: Variety[];
  /** 挑選與保存 */
  pick: string[];
  /** 營養重點 */
  nutrition: string[];
  /** 冷知識 */
  trivia: string[];
  /** 一句話定位 */
  tagline: string;
  /** 北農代號（有資料才填） */
  market?: MarketCode[];
  /** 六邊形座標（axial q, r） */
  hex: [number, number];
}

export type SpotKind =
  | 'basics'
  | 'season'
  | 'origin'
  | 'variety'
  | 'pick'
  | 'nutrition'
  | 'trivia'
  | 'market';

export interface Spot {
  /** 全域唯一 id：${fruitId}:${kind} */
  id: string;
  fruitId: string;
  kind: SpotKind;
  title: string;
  /** 引言 */
  lead: string;
  /** 條列重點 */
  points: string[];
  /** 搜尋關鍵字 */
  keywords: string[];
  /** 產季知識點專用：盛產月份 */
  months?: number[];
  /** 樹上顯示的記號（單字） */
  mark?: string;
}
