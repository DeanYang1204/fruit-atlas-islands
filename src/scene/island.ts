import * as THREE from 'three';
import type { Island } from '../data/spots';
import { RESIDENTS_BY_ISLAND } from '../data/residents';
import { createTree, spiralPosition } from './tree';
import { islandLabel, type Label } from './labels';
import { createNpc, updateNpc, setNpcLabelVisible, type NpcView } from './npc';
import type { TreeView } from './tree';

export const HEX_R = 6.0;
/** 布局半徑比島嶼本體大，中間自然形成水道 */
export const LAYOUT_R = HEX_R + 1.35;
export const BODY_H = 2.8;
/** 島頂（草地）高度 */
export const TOP_Y = BODY_H / 2;

const SOIL = 0x8a6240;
const SOIL_DARK = 0x6f4c30;
const SAND = 0xe6d3a4;
const ROCK = 0x9a9a94;

const BODY_GEO = new THREE.CylinderGeometry(HEX_R, HEX_R * 1.04, BODY_H, 6);
const GRASS_GEO = new THREE.CylinderGeometry(HEX_R * 0.9, HEX_R * 0.9, 0.14, 6);
const SAND_GEO = new THREE.CylinderGeometry(HEX_R * 1.2, HEX_R * 1.1, 0.75, 6);
const ROCK_GEO = new THREE.IcosahedronGeometry(0.22, 0);
const POST_GEO = new THREE.CylinderGeometry(0.07, 0.07, 1.25, 6);
const BOARD_GEO = new THREE.BoxGeometry(1.5, 0.78, 0.07);

/** axial 六角座標 → 世界座標（pointy-top） */
export function hexToWorld(q: number, r: number): THREE.Vector2 {
  const x = Math.sqrt(3) * LAYOUT_R * (q + r / 2);
  const z = -1.5 * LAYOUT_R * r;
  return new THREE.Vector2(x, z);
}

export interface IslandView {
  fruitId: string;
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

export function createIsland(island: Island): IslandView {
  const { fruit, spots } = island;
  const group = new THREE.Group();
  const pos = hexToWorld(fruit.hex[0], fruit.hex[1]);
  group.position.set(pos.x, 0, pos.y);

  const bodyMat = new THREE.MeshStandardMaterial({ color: SOIL, roughness: 0.95, flatShading: true });
  const body = new THREE.Mesh(BODY_GEO, bodyMat);
  body.receiveShadow = true;
  body.castShadow = true;

  const sandMat = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.95, flatShading: true });
  const sand = new THREE.Mesh(SAND_GEO, sandMat);
  sand.position.y = -0.34;
  sand.receiveShadow = true;

  const grassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fruit.accent),
    roughness: 0.88,
    flatShading: true,
    emissive: new THREE.Color(fruit.color),
    emissiveIntensity: 0.05,
  });
  const grass = new THREE.Mesh(GRASS_GEO, grassMat);
  grass.position.y = TOP_Y + 0.06;
  grass.receiveShadow = true;

  // 島中央的圖鑑立牌
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

  group.add(body, sand, grass, sign);

  // 岸邊礁石（依 id 產生穩定的偽隨機位置）
  const rockMat = new THREE.MeshStandardMaterial({ color: ROCK, roughness: 0.85, flatShading: true });
  let seed = 0;
  for (let i = 0; i < fruit.id.length; i++) seed += fruit.id.charCodeAt(i);
  const rocks = 3 + (seed % 3);
  for (let i = 0; i < rocks; i++) {
    const a = (seed * 37 + i * 113) % 360;
    const rad = HEX_R * (1.02 + ((seed + i * 7) % 9) / 100);
    const rock = new THREE.Mesh(ROCK_GEO, rockMat);
    rock.position.set(
      Math.cos((a * Math.PI) / 180) * rad,
      -0.1 + ((seed + i) % 5) / 40,
      Math.sin((a * Math.PI) / 180) * rad,
    );
    rock.scale.setScalar(0.6 + ((seed + i * 3) % 7) / 10);
    rock.castShadow = true;
    group.add(rock);
  }

  // 知識點果樹（把內圈留給果樹，外環留給居民步道）
  const trees = new Map<string, TreeView>();
  const layoutRadius = HEX_R * 0.58;
  spots.forEach((spot, idx) => {
    const p = spiralPosition(idx, spots.length, layoutRadius);
    // 避開中央立牌
    const len = Math.hypot(p.x, p.y);
    const scale = len < 1.75 ? 1.75 / Math.max(len, 0.001) : 1;
    const tree = createTree(spot, fruit.color);
    tree.group.position.set(p.x * scale, TOP_Y + 0.1, p.y * scale);
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
    npcRoot.add(npc.root);
    npcs.set(resident.id, npc);
  });
  group.add(npcRoot);

  const label = islandLabel(fruit.name, spots.length, npcs.size);
  label.obj.position.set(0, TOP_Y + 2.9, 0);
  group.add(label.obj);

  const view: IslandView = {
    fruitId: fruit.id,
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
