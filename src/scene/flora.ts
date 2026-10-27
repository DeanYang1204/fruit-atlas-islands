import * as THREE from 'three';
import { isMarket } from '../data/markets';

/**
 * 植物／建築造型工廠。
 *
 * 每一種水果依照它真實的生長型態建模，而不是全部套同一棵樹：
 *   火龍果 → 三角柱仙人掌（攀在水泥柱上再垂下來，不是樹）
 *   香蕉   → 假莖 + 大葉 + 香蕉串（草本，不是木本）
 *   鳳梨   → 貼地蓮座劍葉 + 頂生果實（完全沒有莖）
 *   木瓜   → 單一假莖 + 頂生掌狀葉，果實貼著莖長
 *   其餘   → 各自的喬木（樹型、樹冠、果實形狀都不同）
 *   主島   → 北農的建築與設施（一市／二市各有自己的配置）
 */

export interface PlantKit {
  /** 整株植物／整棟建築（會隨風搖擺） */
  body: THREE.Group;
  /** 「果實」圖層開關控制的網格 */
  fruits: THREE.Mesh[];
  /** hover / 選取時一起發光的材質 */
  glow: THREE.MeshStandardMaterial[];
  /** 名牌高度 */
  labelY: number;
  /** 點擊球中心高度 */
  pickY: number;
  /** 隨風搖擺幅度（建築填 0） */
  sway?: number;
}

// ---------- 幾何體快取（91 個知識點共用同一批幾何體） ----------

const geoCache = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  const hit = geoCache.get(key);
  if (hit) return hit as T;
  const g = make();
  geoCache.set(key, g);
  return g;
}

const cyl = (rt: number, rb: number, h: number, seg = 6): THREE.CylinderGeometry =>
  cached(`c:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const sph = (r: number, w = 8, h = 6): THREE.SphereGeometry =>
  cached(`s:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
const cone = (r: number, h: number, seg = 6): THREE.ConeGeometry =>
  cached(`k:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const blob = (r: number, d = 0): THREE.IcosahedronGeometry =>
  cached(`b:${r}:${d}`, () => new THREE.IcosahedronGeometry(r, d));
const box = (w: number, h: number, d: number): THREE.BoxGeometry =>
  cached(`x:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const torus = (r: number, t: number, arc: number): THREE.TorusGeometry =>
  cached(`t:${r}:${t}:${arc}`, () => new THREE.TorusGeometry(r, t, 4, 9, arc));

// ---------- 材質與網格 ----------

function mk(color: string, rough = 0.85, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: rough,
    metalness: 0.03,
    flatShading: true,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
  });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  return o;
}

// ---------- 喬木模板：芒果／荔枝／龍眼／梨／釋迦／番石榴／柑橘／蓮霧 ----------

interface OrchardSpec {
  /** [底半徑, 頂半徑, 高度, 顏色] */
  trunk: [number, number, number, string];
  /** 樹冠球體 */
  crown: { r: number; x?: number; y: number; z?: number; sy?: number; color: string }[];
  /** 額外裝飾（如梨樹的錐形頂） */
  extra?: (mats: Record<string, THREE.MeshStandardMaterial>) => THREE.Object3D[];
  fruit: {
    geo: THREE.BufferGeometry;
    color: string;
    count: number;
    /** 果實環繞半徑 */
    radius: number;
    /** 果實基準高度 */
    y: number;
    /** 高度抖動 */
    jitter?: number;
    scale?: [number, number, number];
    rough?: number;
  };
  labelY: number;
  pickY: number;
}

function orchard(spec: OrchardSpec): PlantKit {
  const glow: THREE.MeshStandardMaterial[] = [];
  const fruits: THREE.Mesh[] = [];
  const body = new THREE.Group();

  const trunkMat = mk(spec.trunk[3], 0.95);
  const trunk = mesh(cyl(spec.trunk[1], spec.trunk[0], spec.trunk[2], 7), trunkMat);
  trunk.position.y = spec.trunk[2] / 2;
  body.add(trunk);

  const crownMat = mk(spec.crown[0].color, 0.82);
  glow.push(crownMat);
  for (const part of spec.crown) {
    const b = mesh(blob(part.r, 1), crownMat);
    b.position.set(part.x ?? 0, part.y, part.z ?? 0);
    b.scale.set(1, part.sy ?? 1, 1);
    body.add(b);
  }

  const extraMats = { trunk: trunkMat, crown: crownMat };
  if (spec.extra) for (const o of spec.extra(extraMats)) body.add(o);

  const fmat = mk(spec.fruit.color, spec.fruit.rough ?? 0.34, 0.16);
  glow.push(fmat);
  const jitter = spec.fruit.jitter ?? 0.12;
  for (let i = 0; i < spec.fruit.count; i++) {
    const a = i * 2.399963 + 0.6;
    const f = mesh(spec.fruit.geo, fmat);
    const r = spec.fruit.radius * (0.82 + ((i * 7) % 5) * 0.05);
    f.position.set(
      Math.cos(a) * r,
      spec.fruit.y + Math.sin(i * 1.9) * jitter,
      Math.sin(a) * r,
    );
    if (spec.fruit.scale) f.scale.set(...spec.fruit.scale);
    body.add(f);
    fruits.push(f);
  }

  return { body, fruits, glow, labelY: spec.labelY, pickY: spec.pickY };
}

// ---------- 各水果專屬造型 ----------

/** 香蕉：草本假莖，沒有木頭，葉子巨大，果實是一整串往下垂 */
function bananaPlant(accent: string): PlantKit {
  const glow: THREE.MeshStandardMaterial[] = [];
  const fruits: THREE.Mesh[] = [];
  const body = new THREE.Group();

  const stemMat = mk('#7CB04A', 0.88);
  glow.push(stemMat);
  const stem = mesh(cyl(0.135, 0.205, 1.05, 7), stemMat);
  stem.position.y = 0.53;
  body.add(stem);

  // 假莖的環節（葉鞘痕）
  const ringMat = mk('#68993C', 0.9);
  for (let i = 0; i < 3; i++) {
    const r = mesh(cyl(0.175, 0.185, 0.055, 7), ringMat);
    r.position.y = 0.28 + i * 0.29;
    body.add(r);
  }

  // 巨大葉片
  const leafMat = mk('#5C9B3C', 0.8);
  glow.push(leafMat);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.5;
    const leaf = mesh(sph(0.52, 7, 5), leafMat);
    leaf.scale.set(1.05, 0.07, 0.31);
    leaf.position.set(Math.cos(a) * 0.4, 1.02 + (i % 2) * 0.07, Math.sin(a) * 0.4);
    leaf.rotation.set(0, -a, -0.46);
    body.add(leaf);
  }

  // 香蕉串：一排彎月往下垂
  const bunch = new THREE.Group();
  const fruitMat = mk(accent, 0.36, 0.2);
  glow.push(fruitMat);
  for (let i = 0; i < 4; i++) {
    const b = mesh(torus(0.2, 0.052, Math.PI * 0.92), fruitMat);
    b.position.set((i - 1.5) * 0.088, 0, 0);
    b.rotation.set(Math.PI / 2, 0, 0.34 + i * 0.1);
    bunch.add(b);
    fruits.push(b);
  }
  // 尾端的紫色花苞
  const budMat = mk('#8E5AA0', 0.7, 0.12);
  const bud = mesh(cone(0.09, 0.24, 6), budMat);
  bud.position.set(0.02, -0.2, 0);
  bud.rotation.x = Math.PI;
  bunch.add(bud);
  fruits.push(bud);

  bunch.position.set(0.06, 0.82, 0.2);
  bunch.rotation.z = -0.22;
  body.add(bunch);

  return { body, fruits, glow, labelY: 2.0, pickY: 0.82 };
}

/** 鳳梨：完全沒有莖，貼地蓮座劍葉，中間頂一顆果實 */
function pineapplePlant(accent: string): PlantKit {
  const glow: THREE.MeshStandardMaterial[] = [];
  const fruits: THREE.Mesh[] = [];
  const body = new THREE.Group();

  const leafMat = mk('#4F8238', 0.86);
  glow.push(leafMat);

  /** 一片向外張開的劍葉 */
  const swordLeaf = (len: number, r: number, tilt: number, out: number, y: number): THREE.Group => {
    const pivot = new THREE.Group();
    const leaf = mesh(cone(r, len, 4), leafMat);
    leaf.rotation.z = tilt;
    leaf.position.set(out, y, 0);
    pivot.add(leaf);
    return pivot;
  };

  // 外圈：較長、向外倒
  for (let i = 0; i < 9; i++) {
    const pivot = swordLeaf(0.86, 0.075, 0.46, 0.2, 0.44);
    pivot.rotation.y = (i / 9) * Math.PI * 2 + 0.2;
    body.add(pivot);
  }
  // 內圈：較短、較挺
  for (let i = 0; i < 6; i++) {
    const pivot = swordLeaf(0.52, 0.06, 0.22, 0.11, 0.34);
    pivot.rotation.y = (i / 6) * Math.PI * 2 + 0.6;
    body.add(pivot);
  }

  // 果實：橢圓形的鳳梨
  const bodyMat = mk(accent, 0.5, 0.18);
  glow.push(bodyMat);
  const core = mesh(sph(0.24, 9, 7), bodyMat);
  core.scale.set(1, 1.32, 1);
  core.position.y = 0.74;
  body.add(core);
  fruits.push(core);

  // 果皮的格紋：幾個小菱形凸起
  const skinMat = mk('#B87A1E', 0.6);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.399963;
    const y = 0.56 + (i % 5) * 0.1;
    const r = 0.235 * Math.sqrt(Math.max(0.05, 1 - ((y - 0.74) / 0.34) ** 2));
    const skin = mesh(blob(0.05, 0), skinMat);
    skin.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    body.add(skin);
  }

  // 頂冠葉
  const crownMat = mk('#5F9A41', 0.8);
  glow.push(crownMat);
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    const leaf = mesh(cone(0.05, 0.42, 4), crownMat);
    leaf.rotation.z = 0.3;
    leaf.position.set(0.09, 0.2, 0);
    pivot.add(leaf);
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    pivot.position.y = 1.02;
    body.add(pivot);
  }

  return { body, fruits, glow, labelY: 1.5, pickY: 0.5 };
}

/** 火龍果：仙人掌科的三角柱莖，攀在水泥柱上再垂下來 —— 不是樹 */
function pitayaPlant(accent: string): PlantKit {
  const glow: THREE.MeshStandardMaterial[] = [];
  const fruits: THREE.Mesh[] = [];
  const body = new THREE.Group();

  // 水泥支柱 + 頂端十字橫桿（田間實際的栽培設施）
  const postMat = mk('#B5B0A4', 0.96);
  const post = mesh(cyl(0.085, 0.115, 1.4, 6), postMat);
  post.position.y = 0.7;
  body.add(post);

  const barMat = mk('#A6A096', 0.96);
  const bar1 = mesh(box(1.05, 0.07, 0.07), barMat);
  bar1.position.y = 1.3;
  body.add(bar1);
  const bar2 = mesh(box(0.07, 0.07, 1.05), barMat);
  bar2.position.y = 1.3;
  body.add(bar2);

  // 三角柱莖：三稜柱，繞著柱子盤旋而上後垂下
  const stemMat = mk('#5E9E52', 0.78);
  glow.push(stemMat);
  const spineMat = mk('#E4D9A8', 0.7);

  interface Seg {
    len: number;
    r: number;
    pos: [number, number, number];
    rot: [number, number, number];
  }
  const segs: Seg[] = [
    { len: 0.78, r: 0.115, pos: [0.11, 0.42, 0.03], rot: [0, 0.4, -0.1] },
    { len: 0.74, r: 0.108, pos: [0.2, 1.02, 0.06], rot: [0, 0.9, -0.14] },
    { len: 0.7, r: 0.1, pos: [0.5, 1.28, 0.11], rot: [0, 1.5, -1.15] },
    { len: 0.66, r: 0.094, pos: [0.72, 0.98, 0.14], rot: [0, 1.9, -0.22] },
    { len: 0.52, r: 0.084, pos: [0.83, 0.62, 0.16], rot: [0, 2.3, 0.16] },
  ];
  for (const s of segs) {
    const stem = mesh(cyl(s.r, s.r * 1.05, s.len, 3), stemMat);
    stem.position.set(...s.pos);
    stem.rotation.set(...s.rot);
    body.add(stem);

    // 稜上的刺座
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + s.rot[1];
      const spine = mesh(cone(0.022, 0.07, 4), spineMat);
      spine.position.set(
        s.pos[0] + Math.cos(a) * s.r * 0.95,
        s.pos[1] + (i - 1) * s.len * 0.24,
        s.pos[2] + Math.sin(a) * s.r * 0.95,
      );
      spine.rotation.z = -a + Math.PI / 2;
      body.add(spine);
    }
  }

  // 火龍果果實：橢圓 + 綠色鱗片，掛在垂下的莖上
  const fruitMat = mk(accent, 0.36, 0.22);
  glow.push(fruitMat);
  const scaleMat = mk('#6FAE63', 0.7);
  const berryPos: [number, number, number][] = [
    [0.86, 0.78, 0.17],
    [0.62, 1.16, 0.12],
  ];
  for (const p of berryPos) {
    const berry = mesh(sph(0.17, 9, 7), fruitMat);
    berry.scale.set(1, 1.22, 1);
    berry.position.set(...p);
    body.add(berry);
    fruits.push(berry);

    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      const scale = mesh(blob(0.07, 0), scaleMat);
      scale.scale.set(1, 0.35, 0.7);
      scale.position.set(p[0] + Math.cos(a) * 0.13, p[1] + 0.08 + (i % 2) * 0.1, p[2] + Math.sin(a) * 0.13);
      scale.rotation.set(0, -a, 0.7);
      body.add(scale);
    }
  }

  // 地面上的氣生根
  const rootMat = mk('#7FAE63', 0.85);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.2 + 0.4;
    const root = mesh(cyl(0.02, 0.03, 0.3, 4), rootMat);
    root.position.set(Math.cos(a) * 0.26, 0.14, Math.sin(a) * 0.26);
    root.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    body.add(root);
  }

  return { body, fruits, glow, labelY: 2.15, pickY: 0.85 };
}

/** 木瓜：單一假莖，頂部掌狀裂葉，果實貼著莖一圈一圈長 */
function papayaPlant(accent: string): PlantKit {
  const glow: THREE.MeshStandardMaterial[] = [];
  const fruits: THREE.Mesh[] = [];
  const body = new THREE.Group();

  const stemMat = mk('#9AAC7C', 0.9);
  glow.push(stemMat);
  const stem = mesh(cyl(0.095, 0.155, 1.25, 7), stemMat);
  stem.position.y = 0.62;
  body.add(stem);

  // 葉鞘脫落的痕跡
  const scarMat = mk('#86996C', 0.92);
  for (let i = 0; i < 4; i++) {
    const scar = mesh(cyl(0.13 - i * 0.012, 0.14 - i * 0.012, 0.04, 7), scarMat);
    scar.position.y = 0.32 + i * 0.24;
    body.add(scar);
  }

  // 頂生掌狀葉：長葉柄 + 裂葉
  const leafMat = mk('#6E9B4C', 0.8);
  glow.push(leafMat);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.y = a;

    const stalk = mesh(cyl(0.018, 0.024, 0.44, 4), leafMat);
    stalk.position.set(0.2, 1.24, 0);
    stalk.rotation.z = -1.0;
    pivot.add(stalk);

    const leaf = mesh(sph(0.3, 7, 5), leafMat);
    leaf.scale.set(1, 0.06, 0.92);
    leaf.position.set(0.4, 1.38, 0);
    leaf.rotation.z = -0.24;
    pivot.add(leaf);

    body.add(pivot);
  }

  // 果實貼著莖
  const fruitMat = mk(accent, 0.4, 0.16);
  glow.push(fruitMat);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.7;
    const f = mesh(sph(0.125, 8, 6), fruitMat);
    f.scale.set(1, 1.42, 1);
    f.position.set(Math.cos(a) * 0.17, 0.86 - i * 0.22, Math.sin(a) * 0.17);
    body.add(f);
    fruits.push(f);
  }

  return { body, fruits, glow, labelY: 2.1, pickY: 0.8 };
}

// ---------- 主島：北農的建築與設施（動森公共設施風） ----------

const NAVY = '#2F6690';
const CREAM = '#F4EFE4';
const DECK = '#C8A97A';

/** 行政大樓 */
function cityHall(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  const baseMat = mk('#DCD6C8', 0.95);
  const base = mesh(box(1.2, 0.13, 1.05), baseMat);
  base.position.y = 0.065;
  body.add(base);

  const wallMat = mk(CREAM, 0.9);
  glow.push(wallMat);
  const wall = mesh(box(1.0, 0.86, 0.86), wallMat);
  wall.position.y = 0.56;
  body.add(wall);

  const roofMat = mk(NAVY, 0.75);
  glow.push(roofMat);
  const roof = mesh(cone(0.8, 0.5, 4), roofMat);
  roof.position.y = 1.24;
  roof.rotation.y = Math.PI / 4;
  body.add(roof);

  // 窗
  const glassMat = mk('#9FD8EE', 0.25, 0.35);
  glow.push(glassMat);
  for (let i = 0; i < 4; i++) {
    const w = mesh(box(0.17, 0.21, 0.04), glassMat);
    w.position.set(-0.3 + (i % 2) * 0.6, 0.68 - Math.floor(i / 2) * 0.34, 0.44);
    body.add(w);
  }
  // 大門
  const door = mesh(box(0.24, 0.36, 0.05), roofMat);
  door.position.set(0, 0.31, 0.44);
  body.add(door);

  // 招牌
  const sign = mesh(box(0.56, 0.15, 0.04), roofMat);
  sign.position.set(0, 1.0, 0.46);
  body.add(sign);

  // 旗竿
  const pole = mesh(cyl(0.016, 0.02, 0.95, 5), baseMat);
  pole.position.set(0.56, 0.6, -0.4);
  body.add(pole);
  const flag = mesh(box(0.3, 0.18, 0.02), roofMat);
  flag.position.set(0.71, 0.98, -0.4);
  body.add(flag);

  return { body, fruits, glow, labelY: 1.95, pickY: 0.7 };
}

/** 拍賣場：大跨度鐵皮棚 + 拍賣台 */
function auctionHall(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  const postMat = mk('#9AA3AC', 0.9);
  for (const [x, z] of [
    [-0.55, -0.42],
    [0.55, -0.42],
    [-0.55, 0.42],
    [0.55, 0.42],
  ] as const) {
    const p = mesh(cyl(0.045, 0.055, 0.8, 6), postMat);
    p.position.set(x, 0.4, z);
    body.add(p);
  }

  const roofMat = mk('#7E95A8', 0.7);
  glow.push(roofMat);
  const roof = mesh(box(1.4, 0.08, 1.05), roofMat);
  roof.position.set(0, 0.86, 0);
  roof.rotation.x = 0.07;
  body.add(roof);

  // 拍賣台
  const deckMat = mk(DECK, 0.85);
  glow.push(deckMat);
  const deck = mesh(box(0.72, 0.12, 0.3), deckMat);
  deck.position.set(0, 0.34, -0.1);
  body.add(deck);
  const legMat = mk('#8C6E4A', 0.9);
  for (const x of [-0.3, 0.3]) {
    const leg = mesh(box(0.08, 0.28, 0.22), legMat);
    leg.position.set(x, 0.14, -0.1);
    body.add(leg);
  }

  // 麥克風
  const mic = mesh(cyl(0.012, 0.016, 0.26, 4), postMat);
  mic.position.set(0.16, 0.53, -0.1);
  body.add(mic);
  const micHead = mesh(sph(0.05, 6, 5), mk('#4A4A52', 0.5));
  micHead.position.set(0.16, 0.68, -0.1);
  body.add(micHead);

  // 待拍的貨（木箱與紙箱）
  const crateMat = mk(DECK, 0.9);
  const cartonMat = mk('#D8B98C', 0.92);
  glow.push(crateMat);
  const crate = mesh(box(0.34, 0.26, 0.3), crateMat);
  crate.position.set(-0.28, 0.13, 0.2);
  body.add(crate);
  fruits.push(crate);
  const carton = mesh(box(0.3, 0.22, 0.26), cartonMat);
  carton.position.set(0.02, 0.11, 0.24);
  body.add(carton);
  fruits.push(carton);
  const carton2 = mesh(box(0.26, 0.2, 0.24), cartonMat);
  carton2.position.set(-0.26, 0.36, 0.2);
  body.add(carton2);
  fruits.push(carton2);

  return { body, fruits, glow, labelY: 1.6, pickY: 0.6 };
}

/** 電腦拍賣機 */
function auctionMachine(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  const deskMat = mk('#B08B5E', 0.85);
  glow.push(deskMat);
  const desk = mesh(box(0.8, 0.1, 0.5), deskMat);
  desk.position.y = 0.42;
  body.add(desk);
  const legMat = mk('#8A6A44', 0.9);
  for (const [x, z] of [
    [-0.34, -0.2],
    [0.34, -0.2],
    [-0.34, 0.2],
    [0.34, 0.2],
  ] as const) {
    const leg = mesh(box(0.06, 0.38, 0.06), legMat);
    leg.position.set(x, 0.19, z);
    body.add(leg);
  }

  // 螢幕
  const caseMat = mk('#4C525C', 0.6);
  const screen = mesh(box(0.44, 0.32, 0.06), caseMat);
  screen.position.set(-0.12, 0.64, -0.06);
  body.add(screen);
  const panelMat = mk('#63D2F2', 0.2, 0.9);
  glow.push(panelMat);
  const panel = mesh(box(0.37, 0.25, 0.02), panelMat);
  panel.position.set(-0.12, 0.64, -0.02);
  body.add(panel);

  // 鍵盤與讀卡機
  const kb = mesh(box(0.38, 0.03, 0.15), caseMat);
  kb.position.set(-0.12, 0.49, 0.12);
  body.add(kb);
  const reader = mesh(box(0.13, 0.06, 0.12), mk('#E8871A', 0.6, 0.3));
  reader.position.set(0.2, 0.5, 0.1);
  body.add(reader);

  // 椅子
  const chairMat = mk(NAVY, 0.8);
  glow.push(chairMat);
  const seat = mesh(box(0.26, 0.07, 0.26), chairMat);
  seat.position.set(0, 0.3, 0.42);
  body.add(seat);
  const backRest = mesh(box(0.26, 0.3, 0.06), chairMat);
  backRest.position.set(0, 0.47, 0.54);
  body.add(backRest);
  const stem = mesh(cyl(0.03, 0.03, 0.26, 5), caseMat);
  stem.position.set(0, 0.16, 0.42);
  body.add(stem);

  return { body, fruits, glow, labelY: 1.35, pickY: 0.55 };
}

/** 鐘塔：市場的一天從凌晨開始 */
function clockTower(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  const baseMat = mk('#DCD6C8', 0.95);
  const base = mesh(box(0.78, 0.14, 0.78), baseMat);
  base.position.y = 0.07;
  body.add(base);

  const wallMat = mk(CREAM, 0.9);
  glow.push(wallMat);
  const shaft = mesh(cyl(0.21, 0.29, 1.15, 6), wallMat);
  shaft.position.y = 0.72;
  body.add(shaft);

  // 鐘面
  const faceMat = mk('#FFFDF6', 0.4, 0.3);
  glow.push(faceMat);
  const face = mesh(cyl(0.27, 0.27, 0.07, 12), faceMat);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 1.28, 0.24);
  body.add(face);
  const handMat = mk('#30414C', 0.5);
  const hourHand = mesh(box(0.03, 0.15, 0.02), handMat);
  hourHand.position.set(0, 1.34, 0.29);
  body.add(hourHand);
  const minHand = mesh(box(0.025, 0.21, 0.02), handMat);
  minHand.position.set(0.07, 1.28, 0.29);
  minHand.rotation.z = 0.9;
  body.add(minHand);

  // 尖頂
  const roofMat = mk(NAVY, 0.75);
  glow.push(roofMat);
  const roof = mesh(cone(0.36, 0.55, 6), roofMat);
  roof.position.y = 1.72;
  body.add(roof);
  const finial = mesh(sph(0.06, 6, 5), mk('#E0B24E', 0.4, 0.3));
  finial.position.y = 2.02;
  body.add(finial);

  return { body, fruits, glow, labelY: 2.5, pickY: 0.85 };
}

/** 貨車與棧板：供銷鏈的起點與終點 */
function truckDock(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  // 貨車
  const cargoMat = mk(CREAM, 0.85);
  glow.push(cargoMat);
  const cargo = mesh(box(0.56, 0.4, 0.95), cargoMat);
  cargo.position.set(0.05, 0.42, -0.1);
  body.add(cargo);

  const cabMat = mk(NAVY, 0.7);
  glow.push(cabMat);
  const cab = mesh(box(0.52, 0.34, 0.36), cabMat);
  cab.position.set(0.05, 0.38, 0.52);
  body.add(cab);
  const glass = mesh(box(0.44, 0.16, 0.03), mk('#9FD8EE', 0.25, 0.3));
  glass.position.set(0.05, 0.44, 0.7);
  body.add(glass);

  const tyreMat = mk('#3A3A40', 0.85);
  for (const [x, z] of [
    [-0.26, 0.36],
    [0.3, 0.36],
    [-0.26, -0.36],
    [0.3, -0.36],
  ] as const) {
    const tyre = mesh(cyl(0.13, 0.13, 0.09, 10), tyreMat);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(x + 0.05, 0.13, z - 0.1);
    body.add(tyre);
  }

  // 棧板與貨箱
  const palletMat = mk('#B58A57', 0.92);
  const pallet = mesh(box(0.6, 0.07, 0.5), palletMat);
  pallet.position.set(-0.05, 0.035, 0.68);
  body.add(pallet);

  const cartonMat = mk('#DBBE92', 0.94);
  glow.push(cartonMat);
  const boxPositions: [number, number, number][] = [
    [-0.2, 0.21, 0.62],
    [0.1, 0.21, 0.62],
    [-0.05, 0.48, 0.66],
  ];
  for (const [x, y, z] of boxPositions) {
    const c = mesh(box(0.26, 0.28, 0.26), cartonMat);
    c.position.set(x, y, z);
    body.add(c);
    fruits.push(c);
  }

  return { body, fruits, glow, labelY: 1.35, pickY: 0.5 };
}

/** 資料看板：代號、傳票與行情 */
function dataBoard(glow: THREE.MeshStandardMaterial[]): PlantKit {
  const body = new THREE.Group();
  const fruits: THREE.Mesh[] = [];

  const postMat = mk('#9AA3AC', 0.9);
  for (const x of [-0.5, 0.5]) {
    const p = mesh(cyl(0.045, 0.05, 1.15, 6), postMat);
    p.position.set(x, 0.58, 0);
    body.add(p);
  }

  const frameMat = mk('#3C4A57', 0.7);
  glow.push(frameMat);
  const frame = mesh(box(1.2, 0.66, 0.08), frameMat);
  frame.position.y = 1.18;
  body.add(frame);

  const panelMat = mk('#7FE3F0', 0.2, 0.85);
  glow.push(panelMat);
  const panel = mesh(box(1.06, 0.52, 0.02), panelMat);
  panel.position.set(0, 1.18, 0.05);
  body.add(panel);

  // 看板上的行情報導橫條
  const barMat = mk('#E8871A', 0.5, 0.4);
  for (let i = 0; i < 4; i++) {
    const bar = mesh(box(0.5 - (i % 2) * 0.18, 0.055, 0.02), i % 2 === 0 ? barMat : panelMat);
    bar.position.set(-0.16 + (i % 2) * 0.1, 1.36 - i * 0.12, 0.07);
    body.add(bar);
  }

  // 紙箱堆（傳票與單據）
  const cartonMat = mk('#DCBE93', 0.94);
  glow.push(cartonMat);
  const c1 = mesh(box(0.32, 0.26, 0.28), cartonMat);
  c1.position.set(-0.28, 0.13, 0.22);
  body.add(c1);
  fruits.push(c1);
  const c2 = mesh(box(0.26, 0.2, 0.24), cartonMat);
  c2.position.set(0.22, 0.1, 0.2);
  body.add(c2);
  fruits.push(c2);

  return { body, fruits, glow, labelY: 1.95, pickY: 0.7 };
}

// ---------- 分派 ----------

const BUILDERS: Record<string, (accent: string) => PlantKit> = {
  banana: bananaPlant,
  pineapple: pineapplePlant,
  pitaya: pitayaPlant,
  papaya: papayaPlant,
  mango: (c) =>
    orchard({
      trunk: [0.17, 0.115, 0.95, '#7A5230'],
      crown: [
        { r: 0.52, y: 1.18, color: '#4E8C3E' },
        { r: 0.36, x: 0.24, y: 1.44, z: -0.14, color: '#5A9B47' },
        { r: 0.3, x: -0.26, y: 1.02, z: 0.16, color: '#468234' },
      ],
      fruit: { geo: sph(0.125, 8, 6), color: c, count: 4, radius: 0.44, y: 1.16, scale: [1, 1.28, 0.86] },
      labelY: 2.05,
      pickY: 0.85,
    }),
  lychee: (c) =>
    orchard({
      trunk: [0.15, 0.105, 0.78, '#6F4E33'],
      crown: [
        { r: 0.54, y: 1.05, color: '#4F8A41', sy: 0.86 },
        { r: 0.34, x: 0.28, y: 1.26, z: -0.1, color: '#5C9A4A' },
        { r: 0.3, x: -0.3, y: 0.92, z: 0.14, color: '#447A38' },
      ],
      fruit: { geo: sph(0.062, 6, 5), color: c, count: 9, radius: 0.5, y: 1.0, jitter: 0.18 },
      labelY: 1.9,
      pickY: 0.75,
    }),
  longan: (c) =>
    orchard({
      trunk: [0.16, 0.11, 0.85, '#6B5238'],
      crown: [
        { r: 0.55, y: 1.12, color: '#568C46', sy: 0.84 },
        { r: 0.32, x: -0.3, y: 1.34, z: 0.12, color: '#629B50' },
        { r: 0.33, x: 0.32, y: 0.96, z: -0.16, color: '#4A7F3C' },
      ],
      fruit: { geo: sph(0.058, 6, 5), color: c, count: 9, radius: 0.52, y: 1.06, jitter: 0.2 },
      labelY: 1.95,
      pickY: 0.78,
    }),
  pear: (c) =>
    orchard({
      trunk: [0.13, 0.095, 1.1, '#7C6039'],
      crown: [
        { r: 0.36, y: 1.28, color: '#7FA84F', sy: 1.15 },
        { r: 0.28, x: 0.16, y: 1.56, color: '#8CB55A', sy: 1.1 },
      ],
      extra: (mats) => {
        const coneTop = mesh(cone(0.42, 0.62, 7), mats.crown);
        coneTop.position.y = 1.62;
        return [coneTop];
      },
      fruit: { geo: sph(0.115, 8, 6), color: c, count: 4, radius: 0.36, y: 1.2, scale: [1, 1.22, 1] },
      labelY: 2.2,
      pickY: 0.9,
    }),
  sugarapple: (c) =>
    orchard({
      trunk: [0.14, 0.1, 0.62, '#7A5B3C'],
      crown: [
        { r: 0.46, y: 0.86, color: '#6E9B57', sy: 0.8 },
        { r: 0.33, x: 0.3, y: 0.72, z: 0.14, color: '#7FAC63', sy: 0.78 },
        { r: 0.3, x: -0.32, y: 0.78, z: -0.12, color: '#5F8C4A', sy: 0.8 },
      ],
      fruit: { geo: blob(0.13, 1), color: c, count: 4, radius: 0.42, y: 0.82, jitter: 0.14, rough: 0.6 },
      labelY: 1.65,
      pickY: 0.6,
    }),
  guava: (c) =>
    orchard({
      trunk: [0.13, 0.095, 0.72, '#8A7250'],
      crown: [
        { r: 0.46, y: 0.98, color: '#6E9450' },
        { r: 0.3, x: 0.24, y: 1.2, z: -0.12, color: '#7CA35A' },
      ],
      fruit: { geo: sph(0.11, 8, 6), color: c, count: 4, radius: 0.4, y: 0.96, jitter: 0.14, rough: 0.5 },
      labelY: 1.8,
      pickY: 0.68,
    }),
  citrus: (c) =>
    orchard({
      trunk: [0.12, 0.09, 0.68, '#7E6A46'],
      crown: [
        { r: 0.48, y: 0.96, color: '#5F9445' },
        { r: 0.34, x: -0.22, y: 1.18, z: 0.12, color: '#6FA24E' },
        { r: 0.28, x: 0.26, y: 0.84, z: -0.16, color: '#54873C' },
      ],
      fruit: { geo: sph(0.105, 8, 6), color: c, count: 5, radius: 0.44, y: 0.94, jitter: 0.15 },
      labelY: 1.8,
      pickY: 0.68,
    }),
  waxapple: (c) =>
    orchard({
      trunk: [0.15, 0.105, 0.92, '#6F5236'],
      crown: [
        { r: 0.52, y: 1.16, color: '#4E8B49', sy: 0.82 },
        { r: 0.34, x: 0.28, y: 1.34, z: 0.1, color: '#5C9B54' },
        { r: 0.32, x: -0.3, y: 1.0, z: -0.14, color: '#447B3F' },
      ],
      fruit: { geo: cone(0.1, 0.22, 8), color: c, count: 5, radius: 0.48, y: 1.08, jitter: 0.14 },
      labelY: 2.0,
      pickY: 0.82,
    }),
};

/** 主島建築：靠 (島 id, 知識點種類) 決定要蓋哪一棟 */
const MARKET_BUILDINGS: Record<string, Record<string, (glow: THREE.MeshStandardMaterial[]) => PlantKit>> = {
  market1: {
    basics: cityHall,
    org: auctionHall,
    season: clockTower,
    market: dataBoard,
  },
  market2: {
    basics: cityHall,
    org: dataBoard,
    rule: auctionMachine,
    origin: truckDock,
  },
};

export function createPlant(
  fruitId: string,
  spotKind: string,
  accent: string,
): PlantKit {
  if (isMarket(fruitId)) {
    const table = MARKET_BUILDINGS[fruitId] ?? {};
    const build = table[spotKind] ?? dataBoard;
    const glow: THREE.MeshStandardMaterial[] = [];
    return { ...build(glow), sway: 0 };
  }
  const build = BUILDERS[fruitId];
  if (build) return { ...build(accent), sway: 0.052 };
  // 未定義的水果退回通用果樹
  return {
    ...orchard({
      trunk: [0.14, 0.1, 0.85, '#7A5230'],
      crown: [
        { r: 0.5, y: 1.1, color: '#5A9245' },
        { r: 0.32, x: 0.22, y: 1.32, z: -0.12, color: '#68A050' },
      ],
      fruit: { geo: sph(0.11, 8, 6), color: accent, count: 4, radius: 0.44, y: 1.08 },
      labelY: 1.9,
      pickY: 0.78,
    }),
    sway: 0.052,
  };
}
