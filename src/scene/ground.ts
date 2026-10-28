import * as THREE from 'three';
import { TOY } from './palette';

/**
 * 程序化地面貼圖
 *
 * 每一座島有自己的地面材質與配色，遠看就能分辨這是芒果島還是火龍果島。
 * 全部用 canvas 畫出來（不載外部圖檔），第一次畫完就快取起來。
 */

export type GroundKind = 'orchard' | 'lawn' | 'gravel' | 'plaza' | 'boardwalk';

/** 各島的地面材質 */
export const GROUND_KIND: Record<string, GroundKind> = {
  banana: 'orchard',
  pineapple: 'orchard',
  papaya: 'orchard',
  pitaya: 'gravel',
  mango: 'lawn',
  lychee: 'lawn',
  longan: 'lawn',
  pear: 'lawn',
  sugarapple: 'lawn',
  guava: 'lawn',
  citrus: 'lawn',
  waxapple: 'lawn',
  market1: 'plaza',
  market2: 'plaza',
};

function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const hit = textureCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

function speck(
  g: CanvasRenderingContext2D,
  rnd: () => number,
  n: number,
  cols: string[],
  rmin: number,
  rmax: number,
  alpha = 1,
): void {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    g.beginPath();
    g.arc(rnd() * 256, rnd() * 256, rmin + rnd() * (rmax - rmin), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function tiles(
  g: CanvasRenderingContext2D,
  rnd: () => number,
  size: number,
  grout: string,
  cols: string[],
): void {
  for (let y = 0; y < 256; y += size) {
    for (let x = 0; x < 256; x += size) {
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }
  g.strokeStyle = grout;
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += size) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
}

const GROUND_BASE: Record<GroundKind, string> = {
  orchard: '#B98354',
  lawn: '#82AE66',
  gravel: '#CFC0A8',
  plaza: '#E0CDAE',
  boardwalk: '#BE9266',
};

/** 依島嶼 id 產生穩定的亂數種子 */
function seedOf(id: string): number {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 2147483647;
  return s;
}

/**
 * 島嶼地面貼圖：底色由水果主色微微染色，再疊上該材質的紋路
 */
export function groundTexture(id: string, kind: GroundKind, tint: string): THREE.CanvasTexture {
  const key = `g:${kind}:${tint}`;
  return canvasTexture(key, (g) => {
    const rnd = mulberry(seedOf(id + kind));
    const base = new THREE.Color(GROUND_BASE[kind]).lerp(new THREE.Color(tint), 0.16);
    g.fillStyle = `#${base.getHexString()}`;
    g.fillRect(0, 0, 256, 256);

    switch (kind) {
      case 'orchard': {
        // 田壟：一條一條的耕作痕，是果園最好認的紋路
        for (let y = 0; y < 256; y += 32) {
          g.fillStyle = (y / 32) % 2 ? '#8E6236' : '#B07B48';
          g.globalAlpha = 0.55;
          g.fillRect(0, y + 6, 256, 20);
          g.globalAlpha = 1;
        }
        speck(g, rnd, 500, ['#7A5530', '#A97B48'], 0.6, 1.8, 0.5);
        speck(g, rnd, 260, ['#6E9660', '#86B06E'], 0.4, 1.1, 0.45);
        break;
      }
      case 'lawn': {
        // 草地：由深淺兩色的小草叢點綴
        speck(g, rnd, 900, ['#6E9660', '#86B06E', '#7FA96A'], 0.5, 1.6, 0.6);
        speck(g, rnd, 160, ['#F7C873', '#FFF6E9'], 0.5, 1.2, 0.35);
        break;
      }
      case 'gravel': {
        // 礫石地：火龍果田的水泥柱基座就是這種地面
        speck(g, rnd, 700, ['#C4B49C', '#B0A088', '#D4C6B0'], 1.2, 3.2, 0.8);
        speck(g, rnd, 300, ['#8A7A66'], 0.6, 1.4, 0.5);
        break;
      }
      case 'plaza': {
        // 市場廣場：奶油色磁磚 + 分隔線
        tiles(g, rnd, 32, '#CBB79A', ['#F0DFC4', '#E9D5B4', '#F5E8D2', '#E2CDB0']);
        speck(g, rnd, 200, ['#B8A891', '#FFF6E9'], 0.4, 1.0, 0.4);
        break;
      }
      case 'boardwalk': {
        for (let y = 0; y < 256; y += 16) {
          g.fillStyle = ['#C79C6E', '#BC9062', '#CBA878'][Math.floor(rnd() * 3)];
          g.fillRect(0, y + 1, 256, 14);
          g.fillStyle = '#8E6B44';
          for (let x = (y * 7) % 64; x < 256; x += 64) g.fillRect(x, y + 1, 2, 14);
        }
        break;
      }
    }
  });
}

/** 環島步道：奶油色小方磚 */
export function ringTexture(): THREE.CanvasTexture {
  return canvasTexture('ring', (g) => {
    const rnd = mulberry(4242);
    tiles(g, rnd, 32, '#D6C6AC', ['#FFF6E9', '#F8EDDD', '#FDF6EC', '#F2E5CE']);
    speck(g, rnd, 140, ['#D8CBB8'], 0.3, 0.8, 0.3);
  });
}

/** 島緣環帶：一圈細木條收邊 */
export function bandTexture(id: string): THREE.CanvasTexture {
  const key = `band:${id}`;
  return canvasTexture(key, (g) => {
    const rnd = mulberry(seedOf('band' + id));
    g.fillStyle = '#C79C6E';
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      const v = ['#BE9160', '#CB9E6C', '#B78A58', '#D0A575'][Math.floor(rnd() * 4)];
      g.fillStyle = v;
      g.fillRect(x, 0, 30, 256);
    }
    g.fillStyle = 'rgba(90,62,36,0.5)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x + 30, 0, 2, 256);
  });
}

// ---------- 每座島的專屬配色 ----------

export interface IslandSkin {
  /** 地面貼圖 */
  ground: THREE.CanvasTexture;
  /** 步道貼圖（已染上島嶼色） */
  ring: THREE.CanvasTexture;
  /** 島緣木條貼圖 */
  band: THREE.CanvasTexture;
  /** 步道色調 */
  ringTint: THREE.Color;
  /** 島緣色 */
  curbColor: THREE.Color;
  /** 懸崖四層色階（由上而下） */
  cliff: THREE.Color[];
  /** 淺灘水色 */
  shallow: THREE.Color;
}

const skinCache = new Map<string, IslandSkin>();

export function islandSkin(id: string, fruitColor: string): IslandSkin {
  const hit = skinCache.get(id);
  if (hit) return hit;

  const kind = GROUND_KIND[id] ?? 'lawn';
  const fruit = new THREE.Color(fruitColor);

  // 步道：奶油白摻一點水果色，讓每座島的步道各自不同
  const ringTint = new THREE.Color(TOY.cream).lerp(fruit, 0.22);
  const curbColor = new THREE.Color(TOY.cream).lerp(fruit, 0.12);

  // 懸崖四層：由水果色 → 陶土 → 土壤 → 濕土，越往下越深
  const c0 = new THREE.Color(TOY.clayDeep).lerp(fruit, 0.28);
  const c1 = new THREE.Color(TOY.clay).lerp(fruit, 0.14).lerp(new THREE.Color(TOY.soilDeep), 0.32);
  const c2 = new THREE.Color(TOY.soilDeep).lerp(fruit, 0.06);
  const c3 = new THREE.Color('#6E4B30').lerp(fruit, 0.04);

  // 淺灘：水果色與水色的混合，每座島岸邊的水色都不同
  const shallow = new THREE.Color(TOY.teal).lerp(fruit, 0.32);

  const skin: IslandSkin = {
    ground: groundTexture(id, kind, fruitColor),
    ring: ringTexture(),
    band: bandTexture(id),
    ringTint,
    curbColor,
    cliff: [c0, c1, c2, c3],
    shallow,
  };
  skinCache.set(id, skin);
  return skin;
}
