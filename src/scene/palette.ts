import * as THREE from 'three';
import type { TimeKey } from '../data/types';

/**
 * 玩具模型城市調色盤
 *
 * 整體走「溫暖的微縮模型」：奶油白、蜂蜜黃、陶土橘、木頭棕、抹茶綠。
 * 天空的關鍵在「地平線是奶油色」而不是純藍 —— 這是讓整座群島
 * 看起來像桌上模型的秘密（搭長焦鏡頭 + 暖色霧）。
 */
export const TOY = {
  /** 奶油白：牆面、看板、浪花 */
  cream: '#FFF6E9',
  /** 深奶油：陰影面、紙箱 */
  creamDeep: '#F0DFC4',
  /** 沙灘 */
  sand: '#E9D2AC',
  /** 木頭：棧板、攤車、橋面 */
  wood: '#C79C6E',
  woodDeep: '#9C7345',
  woodDark: '#7A5738',
  /** 陶土：屋瓦、花盆 */
  clay: '#D89A6C',
  clayDeep: '#B87A52',
  /** 珊瑚：招牌、旗幟、屋頂 */
  coral: '#E4704F',
  coralDeep: '#C4533C',
  /** 蜂蜜：路燈、果實反光 */
  honey: '#F7C873',
  butter: '#FFE7A8',
  /** 抹茶綠：草地、樹冠 */
  matcha: '#A9C48A',
  matchaDeep: '#86A96C',
  leaf: '#7FA96A',
  leafDeep: '#5F8A50',
  /** 土壤 */
  soil: '#C08A5E',
  soilDeep: '#9A6B44',
  /** 石材 */
  stone: '#D8CBB8',
  stoneDeep: '#B8A891',
  /** 墨色：輪胎、鐵件、文字 */
  ink: '#4A4038',
  /** 水：溫暖的青綠 */
  teal: '#A6D6D8',
  tealDeep: '#6FA9AE',
  /** 藍灰：玻璃、鐵皮 */
  slate: '#8FA8B8',
  slateDeep: '#6E8494',
} as const;

interface RawSky {
  skyTop: string;
  skyBottom: string;
  fog: string;
  /** 霧的起點／終點（比例，會再乘上世界尺度） */
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  /** 冷色補光（讓陰影不是死黑，塑膠玩具的通透感） */
  fillColor: string;
  fillIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  /** 水色 */
  waterColor: string;
  /** 夜間程度 0–1，用來點亮路燈與窗戶 */
  night: number;
  note: string;
}

export interface SkyState {
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fillColor: THREE.Color;
  fillIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  waterColor: THREE.Color;
  night: number;
  note: string;
}

const RAW: Record<TimeKey, RawSky> = {
  dawn: {
    skyTop: '#9AB2DE',
    skyBottom: '#FFD4AC',
    fog: '#F4D2B4',
    fogNear: 0.72,
    fogFar: 0.68,
    sunColor: '#FFB98C',
    sunIntensity: 1.85,
    hemiSky: '#FFD6BC',
    hemiGround: '#8F6E54',
    hemiIntensity: 1.05,
    fillColor: '#B9CCF5',
    fillIntensity: 0.28,
    ambientColor: '#FFE0C8',
    ambientIntensity: 0,
    waterColor: '#8FB8BC',
    night: 0.45,
    note: '清晨｜霧氣未散，果農開始巡園、採收帶露水的果實。',
  },
  day: {
    skyTop: '#74BEE6',
    skyBottom: '#FCE4C6',
    fog: '#F0E2C8',
    fogNear: 1.15,
    fogFar: 0.95,
    sunColor: '#FFF0D6',
    sunIntensity: 2.35,
    hemiSky: '#EAF2F4',
    hemiGround: '#8F7A62',
    hemiIntensity: 1.18,
    fillColor: '#BFD6FF',
    fillIntensity: 0.3,
    ambientColor: '#FFF6E9',
    ambientIntensity: 0,
    waterColor: '#5FB4BE',
    night: 0,
    note: '白天｜果園日照充足，是判斷果色與成熟度最好的時間。',
  },
  dusk: {
    skyTop: '#EE9E70',
    skyBottom: '#FFCE9C',
    fog: '#F6C098',
    fogNear: 0.82,
    fogFar: 0.75,
    sunColor: '#FF9A5C',
    sunIntensity: 1.95,
    hemiSky: '#FFC8A4',
    hemiGround: '#7E6652',
    hemiIntensity: 1.12,
    fillColor: '#C0B4E8',
    fillIntensity: 0.28,
    ambientColor: '#E8B79E',
    ambientIntensity: 0,
    waterColor: '#82A4B4',
    night: 0.35,
    note: '黃昏｜採收的果實開始集中分級、包裝，準備隔日上市。',
  },
  night: {
    skyTop: '#24345C',
    skyBottom: '#48567A',
    fog: '#333F5E',
    fogNear: 0.6,
    fogFar: 0.6,
    sunColor: '#B9C8F2',
    sunIntensity: 0.55,
    hemiSky: '#7C8CB8',
    hemiGround: '#453E52',
    hemiIntensity: 1.4,
    fillColor: '#9FB4E8',
    fillIntensity: 0.26,
    ambientColor: '#8FA0CC',
    ambientIntensity: 0,
    waterColor: '#46648A',
    night: 1,
    note: '夜晚｜夜間燈照調節產期的果園亮起，也是火龍果開花的時刻。',
  },
};

const KEYS: TimeKey[] = ['night', 'dawn', 'day', 'dusk', 'night'];
const KEY_MINUTES = [0, 360, 720, 1080, 1440];

function toState(raw: RawSky): SkyState {
  return {
    skyTop: new THREE.Color(raw.skyTop),
    skyBottom: new THREE.Color(raw.skyBottom),
    fog: new THREE.Color(raw.fog),
    fogNear: raw.fogNear,
    fogFar: raw.fogFar,
    sunColor: new THREE.Color(raw.sunColor),
    sunIntensity: raw.sunIntensity,
    hemiSky: new THREE.Color(raw.hemiSky),
    hemiGround: new THREE.Color(raw.hemiGround),
    hemiIntensity: raw.hemiIntensity,
    fillColor: new THREE.Color(raw.fillColor),
    fillIntensity: raw.fillIntensity,
    ambientColor: new THREE.Color(raw.ambientColor),
    ambientIntensity: raw.ambientIntensity,
    waterColor: new THREE.Color(raw.waterColor),
    night: raw.night,
    note: raw.note,
  };
}

const STATES: SkyState[] = KEYS.map((k) => toState(RAW[k]));

export const PRESET_MINUTES: Record<TimeKey, number> = {
  dawn: 360,
  day: 720,
  dusk: 1080,
  night: 1260,
};

const _a = new THREE.Color();
const _b = new THREE.Color();

function lerpState(out: SkyState, a: SkyState, b: SkyState, t: number): SkyState {
  out.skyTop.copy(_a.copy(a.skyTop).lerp(_b.copy(b.skyTop), t));
  out.skyBottom.copy(_a.copy(a.skyBottom).lerp(_b.copy(b.skyBottom), t));
  out.fog.copy(_a.copy(a.fog).lerp(_b.copy(b.fog), t));
  out.sunColor.copy(_a.copy(a.sunColor).lerp(_b.copy(b.sunColor), t));
  out.hemiSky.copy(_a.copy(a.hemiSky).lerp(_b.copy(b.hemiSky), t));
  out.hemiGround.copy(_a.copy(a.hemiGround).lerp(_b.copy(b.hemiGround), t));
  out.ambientColor.copy(_a.copy(a.ambientColor).lerp(_b.copy(b.ambientColor), t));
  out.fillColor.copy(_a.copy(a.fillColor).lerp(_b.copy(b.fillColor), t));
  out.waterColor.copy(_a.copy(a.waterColor).lerp(_b.copy(b.waterColor), t));
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
  out.ambientIntensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, t);
  out.fillIntensity = THREE.MathUtils.lerp(a.fillIntensity, b.fillIntensity, t);
  out.fogNear = THREE.MathUtils.lerp(a.fogNear, b.fogNear, t);
  out.fogFar = THREE.MathUtils.lerp(a.fogFar, b.fogFar, t);
  out.night = THREE.MathUtils.lerp(a.night, b.night, t);
  out.note = t < 0.5 ? a.note : b.note;
  return out;
}

/** 以分鐘取樣全天色溫（0–1439） */
export function sampleSky(minutes: number, out?: SkyState): SkyState {
  const m = THREE.MathUtils.clamp(minutes, 0, 1439);
  const target = out ?? getBlankState();
  let i = 0;
  while (i < KEY_MINUTES.length - 2 && m > KEY_MINUTES[i + 1]) i++;
  const a = STATES[i];
  const b = STATES[i + 1];
  const span = KEY_MINUTES[i + 1] - KEY_MINUTES[i];
  const t = span > 0 ? (m - KEY_MINUTES[i]) / span : 0;
  return lerpState(target, a, b, t);
}

/** 只取夜間程度 0–1（不配置物件，可以每幀呼叫） */
export function nightFactor(minutes: number): number {
  const m = THREE.MathUtils.clamp(minutes, 0, 1439);
  let i = 0;
  while (i < KEY_MINUTES.length - 2 && m > KEY_MINUTES[i + 1]) i++;
  const span = KEY_MINUTES[i + 1] - KEY_MINUTES[i];
  const t = span > 0 ? (m - KEY_MINUTES[i]) / span : 0;
  return THREE.MathUtils.lerp(STATES[i].night, STATES[i + 1].night, t);
}

export function getBlankState(): SkyState {
  return {
    skyTop: new THREE.Color(),
    skyBottom: new THREE.Color(),
    fog: new THREE.Color(),
    fogNear: 1,
    fogFar: 1,
    sunColor: new THREE.Color(),
    sunIntensity: 1,
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 1,
    fillColor: new THREE.Color(),
    fillIntensity: 0.3,
    ambientColor: new THREE.Color(),
    ambientIntensity: 0.2,
    waterColor: new THREE.Color(),
    night: 0,
    note: '',
  };
}

export const SUN_DISTANCE = 70;

/** 依分鐘算出太陽（或月光）方位 */
export function sunPosition(minutes: number, out: THREE.Vector3): THREE.Vector3 {
  const hour = minutes / 60;
  const angle = ((hour - 6) / 12) * Math.PI;
  const x = Math.cos(angle) * SUN_DISTANCE;
  const y = Math.sin(angle) * SUN_DISTANCE * 0.95;
  const z = Math.cos(angle) * SUN_DISTANCE * 0.3;
  return out.set(x, Math.max(y, 8), z);
}

const HOUR_NOTES: { from: number; to: number; note: string }[] = [
  { from: 0, to: 5, note: '凌晨｜果園仍在休息，夜行性動物開始活動。' },
  { from: 5, to: 8, note: '清晨｜霧氣未散，果農開始巡園、採收帶露水的果實。' },
  { from: 8, to: 11, note: '上午｜採收與田間調理同步進行，果實要盡快預冷。' },
  { from: 11, to: 14, note: '正午｜日照最強，多數果園暫停採收，避免果實田間熱過高。' },
  { from: 14, to: 17, note: '下午｜集貨場開始分級、秤重、裝箱。' },
  { from: 17, to: 20, note: '黃昏｜貨車啟程北送，隔日清晨抵達拍賣市場。' },
  { from: 20, to: 24, note: '夜晚｜夜間燈照的果園亮起；火龍果多在夜間開花。' },
];

export function hourNote(minutes: number): string {
  const h = Math.floor(minutes / 60);
  for (const n of HOUR_NOTES) {
    if (h >= n.from && h < n.to) return n.note;
  }
  return HOUR_NOTES[0].note;
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 把 hex 色混合一點陶土暖色，讓塑膠感更一致 */
export function warmify(hex: string, amount = 0.18): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(TOY.clay), amount);
  return `#${c.getHexString()}`;
}
