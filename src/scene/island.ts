import * as THREE from 'three';
import { isMarket } from '../data/markets';
import type { Island } from '../data/spots';
import { RESIDENTS_BY_ISLAND } from '../data/residents';
import { createTree, spiralPosition } from './tree';
import { islandLabel, type Label } from './labels';
import { bake, part } from './bake';
import { TOY } from './palette';
import { islandSkin } from './ground';
import { createProps, type PropKit } from './props';
import type { TreeView } from './tree';

export const HEX_R = 5.6;
/** 布局半徑比島嶼本體大，中間留出水道給橋跨越 */
export const LAYOUT_R = HEX_R + 2.6;
export const BODY_H = 2.6;
/** 島頂（地面）高度 */
export const TOP_Y = BODY_H / 2;
/** 地面半徑 */
export const GRASS_R = HEX_R * 0.9;
/** 居民步道環帶（橋頭與步道都落在這一圈） */
export const PATH_IN = 3.45;
export const PATH_OUT = 4.95;
/** 道具街區：攤車與木箱排成的那一圈（位在步道內側） */
const PROP_R = 3.32;
/** 知識點（果樹／建築）分布的半徑 */
const TREE_R = HEX_R * 0.42;

const ROCK = 0xb0a89c;

const ROCK_GEO = new THREE.IcosahedronGeometry(0.22, 0);
const POST_GEO = new THREE.CylinderGeometry(0.07, 0.07, 1.25, 6);
const BOARD_GEO = new THREE.BoxGeometry(1.5, 0.78, 0.07);
const FLOWER_STEM = new THREE.CylinderGeometry(0.014, 0.02, 0.2, 4);
const FLOWER_HEAD = new THREE.SphereGeometry(0.075, 6, 5);
const FLOWER_LEAF = new THREE.SphereGeometry(0.07, 5, 4);
const TUFT = new THREE.ConeGeometry(0.13, 0.26, 5);
const FENCE_POST = new THREE.BoxGeometry(0.1, 0.42, 0.1);
const FENCE_RAIL = new THREE.BoxGeometry(0.06, 0.06, 0.62);

const FLOWER_COLORS = ['#F2A0B6', '#F6D365', '#EF7C8E', '#FFF1A8', '#F4978E', '#E8A0D0'];

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

/**
 * 帶圓角與四層土色色階的六角柱。
 * 色階是玩具模型最容易辨識的特徵之一：遠看就知道這是一座島，不是一塊板子。
 */
const strataCache = new Map<string, THREE.BufferGeometry>();

function hexSolid(r: number, depth: number, bevel: number): THREE.BufferGeometry {
  const key = `${r}:${depth}:${bevel}`;
  const hit = strataCache.get(key);
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
  geo.translate(0, -depth / 2, 0);
  geo.computeVertexNormals();
  strataCache.set(key, geo);
  return geo;
}

/** 把四層土色依高度寫進頂點色（每座島一份，不共用） */
function hexStrata(r: number, depth: number, bevel: number, tones: THREE.Color[]): THREE.BufferGeometry {
  const geo = hexSolid(r, depth, bevel).clone();
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const top = depth / 2 + bevel;
  const bottom = -top;
  // 由上而下的四段：表土 → 陶土 → 土壤 → 水下濕土
  const edges = [top, top * 0.42, top * -0.06, top * -0.54, bottom];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let idx = 3;
    for (let b = 0; b < 4; b++) {
      if (y >= edges[b + 1]) {
        idx = b;
        break;
      }
    }
    const c = tones[Math.min(idx, tones.length - 1)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const ringCache = new Map<string, THREE.BufferGeometry>();

/** 環狀平面（大六邊形挖小六邊形），UV 用世界座標讓貼圖連續 */
function hexRing(rOuter: number, rInner: number, uvScale: number): THREE.BufferGeometry {
  const key = `ring:${rOuter}:${rInner}:${uvScale}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const shape = hexShape(rOuter);
  shape.holes.push(new THREE.Path(hexShape(rInner).getPoints()));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  const p = geo.attributes.position;
  for (let n = 0; n < p.count; n++) {
    uv.setXY(n, p.getX(n) / uvScale, p.getZ(n) / uvScale);
  }
  ringCache.set(key, geo);
  return geo;
}

/** 六角形平面（尖端朝 ±Z） */
function hexPlane(r: number, uvScale: number): THREE.BufferGeometry {
  const key = `plane:${r}:${uvScale}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const geo = new THREE.CircleGeometry(r, 6);
  geo.rotateZ(Math.PI / 6);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  const p = geo.attributes.position;
  for (let n = 0; n < p.count; n++) {
    uv.setXY(n, p.getX(n) / uvScale, p.getZ(n) / uvScale);
  }
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
  /** 玩具道具（攤車、木箱、路燈……） */
  props: PropKit;
  label: Label;
  /** 是否為主島（第一／第二果菜市場） */
  main: boolean;
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

  // 小花：開在果樹與攤車之間的空隙
  const flowers = 8 + Math.floor(rand() * 5);
  for (let i = 0; i < flowers; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.3 + rand() * 1.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
    parts.push(part(FLOWER_STEM, '#7FA96A', (g) => g.translate(x, 0.1, z)));
    parts.push(part(FLOWER_HEAD, color, (g) => g.translate(x, 0.24, z)));
    parts.push(
      part(FLOWER_LEAF, '#93B77A', (g) => {
        g.scale(1, 0.4, 0.6);
        g.translate(x + 0.07, 0.06, z + 0.03);
      }),
    );
  }

  // 草叢：貼著步道內緣長
  const tufts = 10 + Math.floor(rand() * 5);
  for (let i = 0; i < tufts; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2.95 + rand() * 0.35;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const tint = new THREE.Color(grassColor).lerp(new THREE.Color('#7FA96A'), 0.25 + rand() * 0.35);
    parts.push(
      part(TUFT, `#${tint.getHexString()}`, (g) => {
        g.scale(0.7 + rand() * 0.5, 0.7 + rand() * 0.6, 0.7 + rand() * 0.5);
        g.translate(x, 0.12, z);
      }),
    );
  }

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(bake(parts), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 岸邊的白柵欄：玩具小鎮一定要有的那一圈 */
function createFence(): THREE.Mesh {
  const parts = [];
  const count = 18;
  const r = GRASS_R * 0.99;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    parts.push(
      part(FENCE_POST, TOY.cream, (g) => {
        g.scale(0.9, 1 + (i % 2) * 0.1, 0.9);
        g.rotateY(-a);
        g.translate(x, 0.21, z);
      }),
    );

    const next = ((i + 1) / count) * Math.PI * 2;
    const mx = (x + Math.cos(next) * r) / 2;
    const mz = (z + Math.sin(next) * r) / 2;
    // 橫桿沿著切線方向擺，六邊形的每一邊才會連成一圈
    const tangent = Math.atan2(mz, mx);
    parts.push(
      part(FENCE_RAIL, TOY.creamDeep, (g) => {
        g.rotateY(-tangent);
        g.translate(mx, 0.3, mz);
      }),
    );
  }
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
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

  const skin = islandSkin(fruit.id, fruit.color);
  const bevel = 0.45;

  // ── 島體：四層土色色階的六角柱，圓角邊緣是黏土感的來源
  const cliffMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    flatShading: true,
  });
  const body = new THREE.Mesh(hexStrata(HEX_R, BODY_H, bevel, skin.cliff), cliffMat);
  body.position.y = TOP_Y - (BODY_H / 2 + bevel);
  body.receiveShadow = true;
  body.castShadow = true;

  // ── 環帶：島緣收邊的那一圈木條
  const bandMat = new THREE.MeshStandardMaterial({
    map: skin.band,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(HEX_R + 0.03, HEX_R - 0.01, 0.2, 6, 1, true),
    bandMat,
  );
  band.position.y = TOP_Y - 0.06;
  band.receiveShadow = true;

  // ── 地面：程序化貼圖（果園田壟／草地／市場磁磚…）
  const grassTone = new THREE.Color(TOY.matcha).lerp(new THREE.Color(fruit.color), 0.14);
  const grassMat = new THREE.MeshStandardMaterial({
    map: skin.ground,
    roughness: 0.93,
    emissive: new THREE.Color(fruit.color),
    emissiveIntensity: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  const grass = new THREE.Mesh(hexPlane(HEX_R * 0.995, 8), grassMat);
  grass.position.y = TOP_Y + 0.05;
  grass.receiveShadow = true;

  // ── 環島步道：居民散步的那一圈奶油色小磚
  const pathMat = new THREE.MeshStandardMaterial({
    map: skin.ring,
    color: skin.ringTint,
    roughness: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const path = new THREE.Mesh(hexRing(PATH_OUT, PATH_IN, 3.2), pathMat);
  path.position.y = TOP_Y + 0.07;
  path.receiveShadow = true;

  // ── 島緣石：步道外側再壓一圈，把島包起來
  const curbMat = new THREE.MeshStandardMaterial({
    color: skin.curbColor,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -6,
  });
  const curb = new THREE.Mesh(hexRing(HEX_R * 0.995, HEX_R * 0.9, 5), curbMat);
  curb.position.y = TOP_Y + 0.085;
  curb.receiveShadow = true;

  // ── 淺灘：每座島岸邊的水色都不一樣
  const shallow = new THREE.Mesh(
    hexRing(HEX_R + 0.85, HEX_R - 0.02, 6),
    new THREE.MeshBasicMaterial({
      color: skin.shallow,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  shallow.position.y = 0.22;

  // ── 浪花：岸邊那一圈白
  const foam = new THREE.Mesh(
    hexRing(HEX_R + 0.14, HEX_R - 0.02, 6),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(TOY.cream),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  foam.position.y = 0.26;

  // ── 島中央的圖鑑立牌（木牌 + 水果色板）
  const sign = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: TOY.woodDeep, roughness: 0.9, flatShading: true });
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

  group.add(body, band, grass, path, curb, shallow, foam, sign);

  // 岸邊礁石
  const rand = makeRandom(fruit.id);
  const rockMat = new THREE.MeshStandardMaterial({ color: ROCK, roughness: 0.88, flatShading: true });
  const rocks = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < rocks; i++) {
    const a = rand() * Math.PI * 2;
    const rad = HEX_R * (1.04 + rand() * 0.1);
    const rock = new THREE.Mesh(ROCK_GEO, rockMat);
    rock.position.set(Math.cos(a) * rad, 0.18 + rand() * 0.1, Math.sin(a) * rad);
    rock.scale.setScalar(0.6 + rand() * 0.7);
    rock.rotation.set(rand(), rand(), rand());
    rock.castShadow = true;
    group.add(rock);
  }

  // 草地裝飾與白柵欄
  group.add(createGroundDecor(fruit.id, `#${grassTone.getHexString()}`));
  group.add(createFence());

  // ── 玩具道具：把島變成街區
  const props = createProps(fruit.id, fruit.color, PROP_R);
  props.mesh.position.y = TOP_Y + 0.06;
  props.glow.position.y = TOP_Y + 0.06;
  group.add(props.mesh, props.glow);

  // 知識點植物（內圈留給果樹，外環留給居民步道）
  const trees = new Map<string, TreeView>();
  spots.forEach((spot, idx) => {
    const p = spiralPosition(idx, spots.length, TREE_R);
    // 避開中央立牌
    const len = Math.hypot(p.x, p.y);
    const scale = len < 1.7 ? 1.7 / Math.max(len, 0.001) : 1;
    const tree = createTree(spot, fruit.color);
    tree.group.position.set(p.x * scale, TOP_Y + 0.06, p.y * scale);
    tree.group.rotation.y = (idx * 1.7) % (Math.PI * 2);
    group.add(tree.group);
    trees.set(spot.id, tree);
  });

  const peopleCount = (RESIDENTS_BY_ISLAND[fruit.id] ?? []).length;
  const label = islandLabel(fruit.name, spots.length, peopleCount);
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
    props,
    label,
    main: isMarket(fruit.id),
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
}
