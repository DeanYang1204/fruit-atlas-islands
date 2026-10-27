import * as THREE from 'three';
import type { Island } from '../data/spots';
import { RESIDENTS_BY_ISLAND } from '../data/residents';
import { createTree, spiralPosition } from './tree';
import { islandLabel, type Label } from './labels';
import { createNpc, updateNpc, setNpcLabelVisible, type NpcView } from './npc';
import { bake, part } from './bake';
import type { TreeView } from './tree';

export const HEX_R = 5.6;
/** 布局半徑比島嶼本體大，中間留出水道給橋跨越 */
export const LAYOUT_R = HEX_R + 2.6;
export const BODY_H = 2.6;
/** 島頂（草地）高度 */
export const TOP_Y = BODY_H / 2;
/** 草地半徑 */
export const GRASS_R = HEX_R * 0.9;
/** 居民步道環帶（橋頭與步道都落在這一圈） */
export const PATH_IN = 3.45;
export const PATH_OUT = 4.95;

const SOIL = 0x8a6240;
const SOIL_DARK = 0x6f4c30;
const SAND = 0xe8d6a8;
const ROCK = 0x9a9a94;

const ROCK_GEO = new THREE.IcosahedronGeometry(0.22, 0);
const POST_GEO = new THREE.CylinderGeometry(0.07, 0.07, 1.25, 6);
const BOARD_GEO = new THREE.BoxGeometry(1.5, 0.78, 0.07);
const FLOWER_STEM = new THREE.CylinderGeometry(0.014, 0.02, 0.2, 4);
const FLOWER_HEAD = new THREE.SphereGeometry(0.075, 6, 5);
const FLOWER_LEAF = new THREE.SphereGeometry(0.07, 5, 4);
const TUFT = new THREE.ConeGeometry(0.13, 0.26, 5);
const FENCE_POST = new THREE.BoxGeometry(0.1, 0.42, 0.1);
const FENCE_RAIL = new THREE.BoxGeometry(0.06, 0.06, 0.62);

const FLOWER_COLORS = ['#F2A0B6', '#F6D365', '#EF7C8E', '#B39DDB', '#FFF1A8', '#F4978E'];

/** 六邊形輪廓（尖端朝 ±Z，與六角格布局對齊） */
function hexShape(r: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

const solidCache = new Map<string, THREE.BufferGeometry>();

/** 帶圓角的六邊形柱體 —— 邊緣柔化後才有動物之森那種「黏土」感 */
function hexSolid(r: number, depth: number, bevel: number): THREE.BufferGeometry {
  const key = `${r}:${depth}:${bevel}`;
  const hit = solidCache.get(key);
  if (hit) return hit;
  const geo = new THREE.ExtrudeGeometry(hexShape(r), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  // 讓柱體的中心落在 y=0，方便直接用 position.y 對齊島頂
  geo.translate(0, -depth / 2, 0);
  geo.computeVertexNormals();
  solidCache.set(key, geo);
  return geo;
}

const ringCache = new Map<string, THREE.BufferGeometry>();

/** 環狀步道（大六邊形挖小六邊形） */
function hexRing(rOuter: number, rInner: number): THREE.BufferGeometry {
  const key = `ring:${rOuter}:${rInner}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const shape = hexShape(rOuter);
  shape.holes.push(new THREE.Path(hexShape(rInner).getPoints()));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  ringCache.set(key, geo);
  return geo;
}

/** axial 六角座標 → 世界座標（pointy-top） */
export function hexToWorld(q: number, r: number): THREE.Vector2 {
  const x = Math.sqrt(3) * LAYOUT_R * (q + r / 2);
  const z = -1.5 * LAYOUT_R * r;
  return new THREE.Vector2(x, z);
}

/** 依島嶼 id 產生穩定的偽隨機數，讓每次重整畫面都長一樣 */
function makeRandom(seedText: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) % 2147483647;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    return seed / 2147483647;
  };
}

export interface IslandView {
  fruitId: string;
  /** 六角格座標（橋用它判斷誰跟誰相鄰） */
  hex: [number, number];
  group: THREE.Group;
  center: THREE.Vector3;
  grass: THREE.Mesh;
  grassMat: THREE.MeshStandardMaterial;
  trees: Map<string, TreeView>;
  label: Label;
  /** 散步的居民（水果人／北農員工） */
  npcs: Map<string, NpcView>;
  npcRoot: THREE.Group;
  /** 是否為政策島（沒有水果居民，只有北農員工） */
  policy: boolean;
  /** 距離鏡頭夠近時才讓居民活動 */
  npcActive: boolean;
  /** 目前是否當令（依月份篩選） */
  inSeason: boolean;
  /** 目標亮度倍率 */
  glow: number;
  currentGlow: number;
}

/** 草地上的小花、草叢、石頭 —— 合併成一個 mesh */
function createGroundDecor(fruitId: string, grassColor: string): THREE.Mesh {
  const rand = makeRandom(fruitId);
  const parts = [];

  // 小花：主要開在果樹之間的空隙
  const flowers = 10 + Math.floor(rand() * 6);
  for (let i = 0; i < flowers; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.5 + rand() * 1.75;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
    parts.push(part(FLOWER_STEM, '#6E9B4C', (g) => g.translate(x, 0.1, z)));
    parts.push(part(FLOWER_HEAD, color, (g) => g.translate(x, 0.24, z)));
    parts.push(
      part(FLOWER_LEAF, '#7FB35A', (g) => {
        g.scale(1, 0.4, 0.6);
        g.translate(x + 0.07, 0.06, z + 0.03);
      }),
    );
  }

  // 草叢：沿著步道內外兩側
  const tufts = 12 + Math.floor(rand() * 6);
  for (let i = 0; i < tufts; i++) {
    const a = rand() * Math.PI * 2;
    const inner = rand() > 0.45;
    const r = inner ? 2.9 + rand() * 0.4 : 4.4 + rand() * 0.45;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const tint = new THREE.Color(grassColor).lerp(new THREE.Color('#4E8C3E'), 0.25 + rand() * 0.35);
    parts.push(
      part(TUFT, `#${tint.getHexString()}`, (g) => {
        g.scale(0.7 + rand() * 0.5, 0.7 + rand() * 0.6, 0.7 + rand() * 0.5);
        g.translate(x, 0.12, z);
      }),
    );
  }

  // 草地上散落的石頭
  const stones = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < stones; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2.4 + rand() * 2.1;
    parts.push(
      part(ROCK_GEO, `#${new THREE.Color(ROCK).getHexString()}`, (g) => {
        g.scale(0.5 + rand() * 0.4, 0.4 + rand() * 0.3, 0.5 + rand() * 0.4);
        g.translate(Math.cos(a) * r, 0.06, Math.sin(a) * r);
      }),
    );
  }

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(bake(parts), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 懸崖邊的小木柵欄 */
function createFence(): THREE.Mesh {
  const parts = [];
  const count = 18;
  const r = GRASS_R * 0.985;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    parts.push(part(FENCE_POST, '#B08A5C', (g) => g.translate(x, 0.21, z)));

    const next = ((i + 1) / count) * Math.PI * 2;
    const mx = (x + Math.cos(next) * r) / 2;
    const mz = (z + Math.sin(next) * r) / 2;
    const rail = part(FENCE_RAIL, '#C69B6D', (g) => {
      g.rotateY(-a);
      g.translate(mx, 0.3, mz);
    });
    parts.push(rail);
  }
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(bake(parts), mat);
  mesh.castShadow = true;
  return mesh;
}

export function createIsland(island: Island): IslandView {
  const { fruit, spots } = island;
  const group = new THREE.Group();
  const pos = hexToWorld(fruit.hex[0], fruit.hex[1]);
  group.position.set(pos.x, 0, pos.y);

  // 島體：帶圓角的六邊形土台，頂面剛好落在 TOP_Y
  const bodyBevel = 0.45;
  const bodyMat = new THREE.MeshStandardMaterial({ color: SOIL, roughness: 0.95, flatShading: true });
  const body = new THREE.Mesh(hexSolid(HEX_R, BODY_H, bodyBevel), bodyMat);
  body.position.y = TOP_Y - (BODY_H / 2 + bodyBevel);
  body.receiveShadow = true;
  body.castShadow = true;

  // 沙灘：比島體再外擴一圈，頂部露出水面一點點
  const sandBevel = 0.3;
  const sandMat = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.95, flatShading: true });
  const sand = new THREE.Mesh(hexSolid(HEX_R * 1.17, 0.78, sandBevel), sandMat);
  sand.position.y = 0.14 - (0.78 / 2 + sandBevel);
  sand.receiveShadow = true;

  // 草地：動森感的柔和草綠，只保留一點水果主色的傾向；當令發光才透出水果色
  const grassTone = new THREE.Color('#86BC62').lerp(new THREE.Color(fruit.accent), 0.16);
  const grassMat = new THREE.MeshStandardMaterial({
    color: grassTone,
    roughness: 0.88,
    flatShading: true,
    emissive: new THREE.Color(fruit.color),
    emissiveIntensity: 0.05,
  });
  const grass = new THREE.Mesh(hexSolid(GRASS_R, 0.1, 0.04), grassMat);
  grass.position.y = TOP_Y + 0.02;
  grass.receiveShadow = true;

  // 環島步道：居民散步的那一圈
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xd8c094,
    roughness: 0.95,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  });
  const path = new THREE.Mesh(hexRing(PATH_OUT, PATH_IN), pathMat);
  path.position.y = TOP_Y + 0.115;
  path.receiveShadow = true;

  // 島中央的圖鑑立牌（木牌 + 水果色板）
  const sign = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: SOIL_DARK, roughness: 0.9, flatShading: true });
  const post = new THREE.Mesh(POST_GEO, postMat);
  post.position.y = 0.62;
  post.castShadow = true;
  const boardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fruit.color),
    roughness: 0.6,
    flatShading: true,
  });
  const board = new THREE.Mesh(BOARD_GEO, boardMat);
  board.position.set(0, 1.42, 0);
  board.rotation.x = -0.12;
  board.castShadow = true;
  sign.add(post, board);

  group.add(body, sand, grass, path, sign);

  // 岸邊礁石
  const rand = makeRandom(fruit.id);
  const rockMat = new THREE.MeshStandardMaterial({ color: ROCK, roughness: 0.85, flatShading: true });
  const rocks = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < rocks; i++) {
    const a = rand() * Math.PI * 2;
    const rad = HEX_R * (1.02 + rand() * 0.1);
    const rock = new THREE.Mesh(ROCK_GEO, rockMat);
    rock.position.set(Math.cos(a) * rad, -0.15 + rand() * 0.12, Math.sin(a) * rad);
    rock.scale.setScalar(0.6 + rand() * 0.7);
    rock.rotation.set(rand(), rand(), rand());
    rock.castShadow = true;
    group.add(rock);
  }

  // 草地裝飾與柵欄
  group.add(createGroundDecor(fruit.id, `#${grassTone.getHexString()}`));
  group.add(createFence());

  // 知識點植物（內圈留給果樹，外環留給居民步道）
  const trees = new Map<string, TreeView>();
  const layoutRadius = HEX_R * 0.55;
  spots.forEach((spot, idx) => {
    const p = spiralPosition(idx, spots.length, layoutRadius);
    // 避開中央立牌
    const len = Math.hypot(p.x, p.y);
    const scale = len < 1.7 ? 1.7 / Math.max(len, 0.001) : 1;
    const tree = createTree(spot, fruit.color);
    tree.group.position.set(p.x * scale, TOP_Y + 0.08, p.y * scale);
    tree.group.rotation.y = (idx * 1.7) % (Math.PI * 2);
    group.add(tree.group);
    trees.set(spot.id, tree);
  });

  // 居民：水果島是品種化身，政策島是北農員工
  const npcRoot = new THREE.Group();
  const npcs = new Map<string, NpcView>();
  const people = RESIDENTS_BY_ISLAND[fruit.id] ?? [];
  people.forEach((resident, i) => {
    const npc = createNpc(resident, i, people.length);
    // 腳要踩在草地上（草地頂面比島頂高 0.11）
    npc.root.position.y = TOP_Y + 0.11;
    npcRoot.add(npc.root);
    npcs.set(resident.id, npc);
  });
  group.add(npcRoot);

  const label = islandLabel(fruit.name, spots.length, npcs.size);
  label.obj.position.set(0, TOP_Y + 2.9, 0);
  group.add(label.obj);

  const view: IslandView = {
    fruitId: fruit.id,
    hex: [fruit.hex[0], fruit.hex[1]],
    group,
    center: new THREE.Vector3(pos.x, TOP_Y, pos.y),
    grass,
    grassMat,
    trees,
    label,
    npcs,
    npcRoot,
    policy: fruit.id === 'policy',
    npcActive: false,
    inSeason: true,
    glow: 0.05,
    currentGlow: 0.05,
  };

  grass.userData.island = view;
  body.userData.island = view;
  return view;
}

export function updateIsland(view: IslandView, t: number, dt: number): void {
  view.glow = view.inSeason ? 0.16 + Math.sin(t * 1.2) * 0.05 : 0.015;
  view.currentGlow += (view.glow - view.currentGlow) * Math.min(1, dt * 4);
  view.grassMat.emissiveIntensity = view.currentGlow;

  if (!view.npcRoot.visible && view.npcs.size === 0) return;
  for (const npc of view.npcs.values()) updateNpc(npc, t, dt, view.npcActive);
}

/** 選島時才展開居民名牌，避免整片畫面被文字淹沒 */
export function updateIslandNpcLabels(view: IslandView, show: boolean): void {
  for (const npc of view.npcs.values()) setNpcLabelVisible(npc, show);
}
