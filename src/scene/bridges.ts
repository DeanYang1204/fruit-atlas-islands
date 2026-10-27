import * as THREE from 'three';
import { bake, part } from './bake';
import { TOP_Y, type IslandView } from './island';

/**
 * 島與島之間的木棧橋。
 *
 * 動物之森的島是「一整塊連起來的地」：有河、有橋、有步道。
 * 這裡把六角格上相鄰的兩座島用拱橋接起來，讓整片群島走得到彼此。
 */

/** 橋從離島心多遠的地方開始（略小於島嶼本體半徑，橋頭才會落在岸上） */
const EDGE_START = 5.05;
/** 橋面拱起的高度 */
const ARCH = 0.34;
const DECK_W = 1.72;
const DECK_COLOR = '#C89B63';
const RAIL_COLOR = '#A87C4A';
const PIER_COLOR = '#A9A096';

const PLANK = new THREE.BoxGeometry(DECK_W, 0.13, 0.3);
const RAIL_POST = new THREE.BoxGeometry(0.13, 0.46, 0.13);
const RAIL_BAR = new THREE.BoxGeometry(0.11, 0.1, 0.32);
const PIER = new THREE.CylinderGeometry(0.17, 0.22, 2.6, 6);

/** 拱形高度 */
function archY(u: number): number {
  return Math.sin(Math.PI * u) * ARCH;
}

interface HexPair {
  a: IslandView;
  b: IslandView;
}

/** 六角格距離（axial） */
function hexDistance(aq: number, ar: number, bq: number, br: number): number {
  const dq = aq - bq;
  const dr = ar - br;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

function findNeighbours(islands: IslandView[]): HexPair[] {
  const pairs: HexPair[] = [];
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i];
      const b = islands[j];
      if (hexDistance(a.hex[0], a.hex[1], b.hex[0], b.hex[1]) === 1) pairs.push({ a, b });
    }
  }
  return pairs;
}

function buildBridge(a: IslandView, b: IslandView): THREE.Group {
  const group = new THREE.Group();

  const from = new THREE.Vector2(a.center.x, a.center.z);
  const to = new THREE.Vector2(b.center.x, b.center.z);
  const span = from.distanceTo(to);
  const dir = to.clone().sub(from).normalize();
  const length = span - EDGE_START * 2;
  if (length <= 0.4) return group;

  const mid = from.clone().add(to).multiplyScalar(0.5);
  group.position.set(mid.x, TOP_Y, mid.y);
  // 橋沿著 local +Z 軸舖設，再轉到兩島連線的方向
  group.rotation.y = Math.atan2(dir.x, dir.y);

  const planks = Math.max(3, Math.round(length / 0.34));
  const step = length / planks;
  const parts = [];

  for (let i = 0; i < planks; i++) {
    const z = -length / 2 + (i + 0.5) * step;
    const u = (i + 0.5) / planks;
    const y = archY(u) + 0.02;
    parts.push(part(PLANK, DECK_COLOR, (g) => g.translate(0, y, z)));
  }

  // 欄杆：柱子 + 跟著拱形的短扶手
  const railX = DECK_W / 2 - 0.08;
  const posts = Math.max(2, Math.round(length / 1.1));
  for (let i = 0; i <= posts; i++) {
    const u = i / posts;
    const z = -length / 2 + u * length;
    const y = archY(u);
    for (const x of [-railX, railX]) {
      parts.push(part(RAIL_POST, RAIL_COLOR, (g) => g.translate(x, y + 0.28, z)));
    }
  }
  for (let i = 0; i < planks; i++) {
    const z = -length / 2 + (i + 0.5) * step;
    const u = (i + 0.5) / planks;
    const y = archY(u) + 0.5;
    for (const x of [-railX, railX]) {
      parts.push(part(RAIL_BAR, RAIL_COLOR, (g) => g.translate(x, y, z)));
    }
  }

  // 橋墩：從橋面伸到水裡
  for (const f of [0.28, 0.72]) {
    const z = -length / 2 + f * length;
    parts.push(part(PIER, PIER_COLOR, (g) => g.translate(0, archY(f) - 1.3, z)));
  }

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    flatShading: true,
  });
  // 橋頭的駁坎：兩端各墊一塊石頭，橋才像「接上岸」
  for (const z of [-length / 2 - 0.28, length / 2 + 0.28]) {
    parts.push(part(PIER, PIER_COLOR, (g) => {
      g.scale(1.5, 0.42, 1.5);
      g.translate(0, -0.42, z);
    }));
  }

  const mesh = new THREE.Mesh(bake(parts), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** 回傳所有相鄰島嶼之間的橋（整組，可直接加進場景） */
export function buildBridges(islands: IslandView[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'bridges';
  for (const { a, b } of findNeighbours(islands)) {
    group.add(buildBridge(a, b));
  }
  return group;
}

/** 相鄰島嶼對的數量（給 UI 顯示用） */
export function countBridges(islands: IslandView[]): number {
  return findNeighbours(islands).length;
}
