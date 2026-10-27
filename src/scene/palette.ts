import * as THREE from 'three';
import type { TimeKey } from '../data/types';

interface RawSky {
  skyTop: string;
  skyBottom: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  waterColor: string;
  note: string;
}

export interface SkyState {
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  fog: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  waterColor: THREE.Color;
  note: string;
}

const RAW: Record<TimeKey, RawSky> = {
  dawn: {
    skyTop: '#F6B98A',
    skyBottom: '#FFE6C7',
    fog: '#FBDCC0',
    sunColor: '#FFB87E',
    sunIntensity: 1.9,
    hemiSky: '#FFD9A8',
    hemiGround: '#6E8F5A',
    hemiIntensity: 0.8,
    ambientColor: '#FFD9C0',
    ambientIntensity: 0.38,
    waterColor: '#7FB7C4',
    note: '清晨｜霧氣未散，果農開始巡園、採收帶露水的果實。',
  },
  day: {
    skyTop: '#7FC6E8',
    skyBottom: '#E1F4FC',
    fog: '#DFF2FB',
    sunColor: '#FFF7E4',
    sunIntensity: 2.2,
    hemiSky: '#BEE6F5',
    hemiGround: '#6E8F5A',
    hemiIntensity: 0.95,
    ambientColor: '#FFFFFF',
    ambientIntensity: 0.4,
    waterColor: '#3F9FB8',
    note: '白天｜果園日照充足，是判斷果色與成熟度最好的時間。',
  },
  dusk: {
    skyTop: '#EE8256',
    skyBottom: '#F9D3A8',
    fog: '#F4C79C',
    sunColor: '#FF9C5B',
    sunIntensity: 1.8,
    hemiSky: '#FFC193',
    hemiGround: '#6E7F5A',
    hemiIntensity: 0.75,
    ambientColor: '#C09AA8',
    ambientIntensity: 0.4,
    waterColor: '#5E8FA8',
    note: '黃昏｜採收的果實開始集中分級、包裝，準備隔日上市。',
  },
  night: {
    skyTop: '#14203A',
    skyBottom: '#2C3E5C',
    fog: '#1F2C44',
    sunColor: '#A9C2EE',
    sunIntensity: 0.45,
    hemiSky: '#3A5378',
    hemiGround: '#22331F',
    hemiIntensity: 0.5,
    ambientColor: '#5C7CA8',
    ambientIntensity: 0.45,
    waterColor: '#1E3A57',
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
    sunColor: new THREE.Color(raw.sunColor),
    sunIntensity: raw.sunIntensity,
    hemiSky: new THREE.Color(raw.hemiSky),
    hemiGround: new THREE.Color(raw.hemiGround),
    hemiIntensity: raw.hemiIntensity,
    ambientColor: new THREE.Color(raw.ambientColor),
    ambientIntensity: raw.ambientIntensity,
    waterColor: new THREE.Color(raw.waterColor),
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
  out.waterColor.copy(_a.copy(a.waterColor).lerp(_b.copy(b.waterColor), t));
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
  out.ambientIntensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, t);
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

export function getBlankState(): SkyState {
  return {
    skyTop: new THREE.Color(),
    skyBottom: new THREE.Color(),
    fog: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunIntensity: 1,
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 1,
    ambientColor: new THREE.Color(),
    ambientIntensity: 1,
    waterColor: new THREE.Color(),
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
