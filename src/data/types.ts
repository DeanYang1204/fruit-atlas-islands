export type TimeKey = 'dawn' | 'day' | 'dusk' | 'night';

export type ToggleKey =
  | 'names'
  | 'fruits'
  | 'people'
  | 'flows'
  | 'freeze'
  | 'bird'
  | 'log'
  | 'patrol';

/** 天氣模式：晴／陰天／下雨，影響光線、天空、霧氣與雨絲 */
export type WeatherKey = 'clear' | 'cloudy' | 'rain';

/** 島上居民的兩種身分：水果品種化身／北農員工 */
export type ResidentKind = 'variety' | 'staff';

export interface Resident {
  /** 全域唯一 id */
  id: string;
  /** 所屬（出生）島 id：水果 id、market1 或 market2。可以自由走到別的島 */
  islandId: string;
  kind: ResidentKind;
  /** 顯示名稱，例：愛文人 */
  name: string;
  /** 短稱，例：愛文 */
  short: string;
  /** 身分標籤，例：芒果品種 */
  role: string;
  /** 是否為 BOSS（北農總經理吳總，全群島只有一位） */
  boss: boolean;
  lead: string;
  points: string[];
  keywords: string[];
  /** 頭部配色 */
  color: string;
  /** 制服（軀幹）配色 */
  uniform: string;
}

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
  | 'market'
  | 'org'
  | 'rule';

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
