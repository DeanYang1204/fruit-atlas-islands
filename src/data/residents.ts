import { FRUITS } from './fruits';
import { POLICY_FRUIT, POLICY_ID } from './policy';
import { monthLabel } from './spots';
import type { Resident } from './types';

/** 北農員工制服色（深藍襯衫，見實際制服照） */
const UNIFORM_STAFF = '#1E3A6B';
/** 吳總：灰色西裝外套 */
const UNIFORM_BOSS = '#8E9299';

/** 與其他水果島同名的短稱要避開（例：釋迦鳳梨的「釋迦」、芒果鳳梨的「芒果」） */
const FRUIT_NAMES = new Set(FRUITS.map((f) => f.name));

/** 把「愛文（Irwin）」「玉文 6 號」「金鑽鳳梨（台農 17 號）」整理成好讀的短稱 */
function shortOf(varietyName: string, fruitName: string, taken: Set<string>): string {
  // 1. 移除括號內容
  const noParen = varietyName.replace(/[（(][^）)]*[）)]/g, '').trim();
  // 2. 保留品系號碼的寫法（重複時備用，例：台農 5 號）
  const withCode = noParen.replace(/\s+/g, ' ').trim();
  // 3. 去掉品系號碼
  const noCode = withCode.replace(/\s*\d+\s*號\s*/g, '').trim();
  // 4. 去掉尾綴的水果名（金鑽鳳梨 → 金鑽）
  const stripped =
    noCode.length > fruitName.length && noCode.endsWith(fruitName)
      ? noCode.slice(0, noCode.length - fruitName.length).trim()
      : noCode;

  for (const candidate of [stripped, noCode, withCode]) {
    if (candidate.length < 2) continue;
    if (candidate !== fruitName && FRUIT_NAMES.has(candidate)) continue;
    if (taken.has(candidate)) continue;
    return candidate;
  }
  return withCode;
}

/** 由 index 在 HSL 上做小幅位移，讓同一島上的居民出現色差 */
function tint(hex: string, index: number, total: number): string {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const step = total > 1 ? (index / (total - 1) - 0.5) : 0;
  const h2 = (h + step * 26 + 360) % 360;
  const s2 = clamp(s + step * 0.1, 0.18, 1);
  const l2 = clamp(l - step * 0.14, 0.24, 0.78);
  return rgbToHex(hslToRgb(h2, s2, l2));
}

function buildVarietyResidents(): Resident[] {
  const list: Resident[] = [];

  for (const fruit of FRUITS) {
    const taken = new Set<string>();
    fruit.varieties.forEach((v, i) => {
      const short = shortOf(v.name, fruit.name, taken);
      taken.add(short);
      const id = `${fruit.id}:r${i}`;
      const headColor = tint(fruit.color, i, fruit.varieties.length);
      list.push({
        id,
        islandId: fruit.id,
        kind: 'variety',
        name: `${short}人`,
        short,
        role: `${fruit.name}品種`,
        boss: false,
        lead: `我是${fruit.name}島的居民。${v.note}`,
        points: [
          `所屬品種｜${v.name}`,
          `家鄉｜${fruit.name}（${fruit.en}）`,
          `盛產期｜${fruit.peak.map((m) => monthLabel(m)).join('、')}`,
          `主要產地｜${fruit.regions.map((r) => r.name).join('、')}`,
          `一句話特色｜${v.note}`,
        ],
        keywords: [fruit.name, fruit.en, short, v.name, ...fruit.regions.map((r) => r.name)],
        color: headColor,
        uniform: '#F6EAD6',
      });
    });
  }
  return list;
}

interface StaffSeed {
  key: string;
  short: string;
  role: string;
  boss?: boolean;
  lead: string;
  points: string[];
  uniform: string;
  color: string;
}

const STAFF_SEEDS: StaffSeed[] = [
  {
    key: 'gm',
    short: '吳總',
    role: '北農總經理（全島唯一的 BOSS）',
    boss: true,
    lead: '大家叫我吳總。這座島我說了算——市場怎麼運轉、人怎麼調度，最後都到我桌上。',
    points: [
      '身分｜台北農產運銷公司總經理，公司最高行政負責人，同仁都稱他「吳總」。',
      '職掌｜督導第一、第二果菜批發市場的拍賣、分貨、結算與人事。',
      '定位｜不是水果，是讓水果賣得出去的那個人。',
      '※ 本島唯一的 BOSS，其他全部是一般員工。',
      '※ 詳細職掌與幕僚分工後續持續完善。',
    ],
    uniform: UNIFORM_BOSS,
    color: '#F0C37A',
  },
  {
    key: 'auction',
    short: '拍賣員',
    role: '北農員工｜拍賣',
    lead: '每天凌晨兩點我就進場了。全場的進貨量、天氣、節慶，都要先在我腦裡排好。',
    points: [
      '工作時間｜約 02:00 進場，03:20 起主持拍賣。',
      '核心任務｜把供應人委託的蔬果在最短時間內賣出去。',
      '定價依據｜參考到貨量、品質、前日行情與節慶假日，擬定裁價與拍賣腹案。',
      '資料欄位｜拍賣資料中的 P 欄就是拍賣員編號。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#E9D5B0',
  },
  {
    key: 'sorter',
    short: '理貨員',
    role: '北農員工｜理貨',
    lead: '貨一進場就是我的事：分類、評級、標號、陳列，讓承銷人一眼看懂。',
    points: [
      '工作內容｜依品項、等級、件數排列貨件，完成分類與標號。',
      '為什麼重要｜陳列清楚，承銷人才能快速看貨、出價。',
      '時間帶｜前一日下午開始到貨後持續作業到夜間。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#DFC8A6',
  },
  {
    key: 'inspector',
    short: '檢查員',
    role: '北農員工｜農藥殘留檢驗',
    lead: '我負責把關。抽樣篩檢沒過的貨，拒絕交易並扣留銷毀。',
    points: [
      '工作內容｜市場內設農藥殘留檢驗室，抽樣篩檢進場果菜。',
      '處置｜不合標準者拒絕交易並扣留銷毀，另採樣送衛生主管機關複驗。',
      '角色｜替消費端的食用安全把關。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#CFE3D8',
  },
  {
    key: 'mover',
    short: '拖工',
    role: '北農員工｜搬運配送',
    lead: '成交後的貨我來拖。約 05:00 到 06:30，憑交易傳票送到零批攤位或採購車。',
    points: [
      '工作內容｜將交易完成的貨件拖離拍賣現場。',
      '工具｜場內以電動拖車為主要運輸工具。',
      '時間帶｜約 05:00–06:30，承銷人依交易傳票領貨後進行。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#E2CBB0',
  },
  {
    key: 'resident-officer',
    short: '駐在員',
    role: '共同運銷團體派駐',
    lead: '我代表產地站在這裡。農會、國聯社、農聯社、青果社都有派人駐市場。',
    points: [
      '來源｜四大共同運銷團體派駐於批發市場的人員。',
      '工作內容｜協助所轄農友掌握第一手市場狀況、處理第一線問題。',
      '回報｜拍賣結束後（約 07:00 起）彙集市況回報，提供農民供貨參考。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#C9D9C0',
  },
  {
    key: 'analyst',
    short: '統計員',
    role: '北農員工｜行情與統計',
    lead: '拍完才是我的開始。當日行情、交易明細、運銷月報年報，都從我手上出去。',
    points: [
      '工作內容｜彙整交易行情、拍賣明細、貨款資料並對外發布。',
      '產出｜每日行情與市況分析、每月／每年運銷統計報表。',
      '服務｜提供產地供應單位當日貨款清單，增加農友供貨信心。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#D6CFE8',
  },
  {
    key: 'cleaner',
    short: '清潔員',
    role: '北農員工｜場區維護',
    lead: '交易結束換我上場。約 06:30 進場清潔，並定期全面消毒。',
    points: [
      '工作內容｜交易完成後的現場清潔與維護。',
      '定期作業｜除日常清潔外，定期施作全面性消毒與維護工作。',
    ],
    uniform: UNIFORM_STAFF,
    color: '#D8D3CB',
  },
];

function buildStaffResidents(): Resident[] {
  return STAFF_SEEDS.map((seed) => ({
    id: `${POLICY_ID}:${seed.key}`,
    islandId: POLICY_ID,
    kind: 'staff' as const,
    name: seed.boss ? seed.short : `${seed.short}人`,
    short: seed.short,
    role: seed.role,
    boss: seed.boss === true,
    lead: seed.lead,
    points: seed.points,
    keywords: ['北農', POLICY_FRUIT.name, seed.short, seed.role],
    color: seed.color,
    uniform: seed.uniform,
  }));
}

export const RESIDENTS: Resident[] = [...buildStaffResidents(), ...buildVarietyResidents()];

export const RESIDENT_BY_ID: Record<string, Resident> = Object.fromEntries(
  RESIDENTS.map((r) => [r.id, r]),
);

export const RESIDENTS_BY_ISLAND: Record<string, Resident[]> = RESIDENTS.reduce<
  Record<string, Resident[]>
>((acc, r) => {
  (acc[r.islandId] ??= []).push(r);
  return acc;
}, {});

export const TOTAL_RESIDENTS = RESIDENTS.length;

export const BOSS_RESIDENT_ID = `${POLICY_ID}:gm`;

// ---------- 顏色小工具 ----------

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  ];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function rgbToHsl([r, g, b]: [number, number, number]): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number): string =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}
