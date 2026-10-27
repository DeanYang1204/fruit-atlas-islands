import * as THREE from 'three';
import { TOP_Y, type IslandView } from './island';

/**
 * 居民在群島裡自由穿梭的巡走系統。
 *
 * 動物之森的人物是「住在島上、但會到處走」：這裡讓每一位居民沿著環島步道散步，
 * 每隔一陣子挑一座相鄰的島走過去，跨島時會真的走上木棧橋（含拱橋的高低差）。
 * 吳總（BOSS）的 wanderlust 開到最大，所以他是一直在各島之間巡視。
 */

/** 橋頭：居民走到這個半徑就踏上橋面（略大於橋頭，橋頭落在岸上） */
export const BRIDGE_ENTRY_R = 5.15;
/** 橋面拱起的高度（與 bridges.ts 的 ARCH 一致） */
const DECK_ARCH = 0.34;
/** 散步基準速度（每秒世界單位） */
const WALK_SPEED = 1.55;
/** 上橋時放慢一點，像在小心走橋 */
const BRIDGE_SPEED = 1.32;
/** 腳踩在草地上的高度 */
const FEET_Y = TOP_Y + 0.11;

export interface BridgeLink {
  /** 目標島 */
  to: IslandView;
  /** 出發島中心 → 目標島中心 的方向（XZ 平面） */
  angle: number;
  /** 出發側橋頭（XZ） */
  from: THREE.Vector2;
  /** 抵達側橋頭（XZ） */
  to2: THREE.Vector2;
  /** 橋長（世界單位） */
  length: number;
}

export interface RoamNetwork {
  /** islandId → 可走的橋 */
  links: Map<string, BridgeLink[]>;
}

/** 六角格距離（axial） */
function hexDistance(aq: number, ar: number, bq: number, br: number): number {
  const dq = aq - bq;
  const dr = ar - br;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

/** 由島嶼清單建立「誰跟誰走得通」的圖 */
export function buildRoamNetwork(islands: IslandView[]): RoamNetwork {
  const links = new Map<string, BridgeLink[]>();
  for (const isl of islands) links.set(isl.fruitId, []);

  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i];
      const b = islands[j];
      if (hexDistance(a.hex[0], a.hex[1], b.hex[0], b.hex[1]) !== 1) continue;

      // a → b
      const ab = new THREE.Vector2(b.center.x - a.center.x, b.center.z - a.center.z);
      links.get(a.fruitId)?.push({
        to: b,
        angle: Math.atan2(ab.y, ab.x),
        from: new THREE.Vector2(a.center.x, a.center.z).add(
          ab.clone().normalize().multiplyScalar(BRIDGE_ENTRY_R),
        ),
        to2: new THREE.Vector2(b.center.x, b.center.z).sub(
          ab.clone().normalize().multiplyScalar(BRIDGE_ENTRY_R),
        ),
        length: ab.length() - BRIDGE_ENTRY_R * 2,
      });

      // b → a
      const ba = ab.clone().negate();
      links.get(b.fruitId)?.push({
        to: a,
        angle: Math.atan2(ba.y, ba.x),
        from: new THREE.Vector2(b.center.x, b.center.z).add(
          ba.clone().normalize().multiplyScalar(BRIDGE_ENTRY_R),
        ),
        to2: new THREE.Vector2(a.center.x, a.center.z).sub(
          ba.clone().normalize().multiplyScalar(BRIDGE_ENTRY_R),
        ),
        length: ab.length() - BRIDGE_ENTRY_R * 2,
      });
    }
  }
  return { links };
}

export type RoamPhase = 'ring' | 'align' | 'outward' | 'bridge' | 'inward';

export interface Roam {
  /** 目前所在的島 */
  island: IslandView;
  /** 環島步道上的角度 */
  theta: number;
  /** 繞行方向 */
  spin: 1 | -1;
  /** 目前半徑 */
  radius: number;
  /** 這位居民習慣走的環道半徑（每人一條 lane） */
  lane: number;
  phase: RoamPhase;
  /** 停留／散布用的計時器 */
  timer: number;
  link: BridgeLink | null;
  progress: number;
  /** 上一座島，避免立刻回頭 */
  lastId: string | null;
  /** 跨島的意願：0～1，BOSS 接近 1 */
  wanderlust: number;
  /** 這一趟巡視去過的島 */
  visited: Set<string>;
  /** 出發／抵達的橋頭座標 */
  from: THREE.Vector2;
  to: THREE.Vector2;
  /** 走路快慢的微調 */
  pace: number;
  seed: number;
}

/** 簡易可重現亂數 */
function makeRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createRoam(
  home: IslandView,
  index: number,
  wanderlust: number,
  seed: number,
): Roam {
  const rand = makeRandom(seed + index * 131);
  const lane = 3.62 + rand() * 0.95;
  return {
    island: home,
    theta: rand() * Math.PI * 2,
    spin: rand() > 0.5 ? 1 : -1,
    radius: lane,
    lane,
    phase: 'ring',
    timer: 2 + rand() * 6,
    link: null,
    progress: 0,
    lastId: null,
    wanderlust,
    visited: new Set([home.fruitId]),
    from: new THREE.Vector2(),
    to: new THREE.Vector2(),
    pace: 0.82 + rand() * 0.42,
    seed,
  };
}

/** 橋上的拱形高度 */
function deckY(u: number): number {
  return Math.sin(Math.PI * u) * DECK_ARCH;
}

/** 兩個角度之間的最短方向 */
function shortestTurn(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 推進一幀巡走。會直接把結果寫進 root.position（世界座標）與 root.rotation.y。
 * 回傳 true 表示剛踏上／離開橋等狀態有變化（目前單純給外部判斷是否要在地面）
 */
export function updateRoam(root: THREE.Object3D, roam: Roam, dt: number, net: RoamNetwork): void {
  const links = net.links.get(roam.island.fruitId) ?? [];

  switch (roam.phase) {
    case 'ring': {
      roam.theta += roam.spin * ((WALK_SPEED * roam.pace) / Math.max(roam.radius, 0.001)) * dt;
      roam.timer -= dt;
      if (roam.timer <= 0) {
        const rnd = Math.random();
        // 有橋、也想出門就出發；不然就繼續在自己的島上繞（偶爾換方向）
        if (links.length > 0 && rnd < roam.wanderlust) {
          roam.link = pickLink(roam, links);
          roam.phase = 'align';
        } else {
          roam.timer = 3 + Math.random() * 7;
          if (Math.random() < 0.18) roam.spin = roam.spin === 1 ? -1 : 1;
        }
      }
      break;
    }
    case 'align': {
      const link = roam.link;
      if (!link) {
        roam.phase = 'ring';
        break;
      }
      const turn = shortestTurn(roam.theta, link.angle);
      const step = ((WALK_SPEED * roam.pace) / Math.max(roam.radius, 0.001)) * dt;
      if (Math.abs(turn) <= step) {
        roam.theta = link.angle;
        roam.phase = 'outward';
      } else {
        roam.theta += Math.sign(turn) * step;
      }
      break;
    }
    case 'outward': {
      const link = roam.link;
      if (!link) {
        roam.phase = 'ring';
        break;
      }
      roam.radius += WALK_SPEED * roam.pace * 0.75 * dt;
      if (roam.radius >= BRIDGE_ENTRY_R) {
        roam.radius = BRIDGE_ENTRY_R;
        roam.from.set(link.from.x, link.from.y);
        roam.to.set(link.to2.x, link.to2.y);
        roam.progress = 0;
        roam.phase = 'bridge';
      }
      break;
    }
    case 'bridge': {
      const span = Math.max(0.001, roam.to.distanceTo(roam.from));
      roam.progress += (BRIDGE_SPEED * roam.pace * dt) / span;
      if (roam.progress >= 1) {
        const link = roam.link;
        if (link) {
          roam.lastId = roam.island.fruitId;
          roam.island = link.to;
          roam.visited.add(link.to.fruitId);
          const dx = roam.to.x - link.to.center.x;
          const dz = roam.to.y - link.to.center.z;
          roam.theta = Math.atan2(dz, dx);
          roam.radius = BRIDGE_ENTRY_R;
        }
        roam.progress = 1;
        roam.link = null;
        roam.phase = 'inward';
      }
      break;
    }
    case 'inward': {
      roam.radius -= WALK_SPEED * roam.pace * 0.75 * dt;
      if (roam.radius <= roam.lane) {
        roam.radius = roam.lane;
        roam.timer = 2.5 + Math.random() * 5;
        if (Math.random() < 0.3) roam.spin = roam.spin === 1 ? -1 : 1;
        roam.phase = 'ring';
      }
      break;
    }
  }

  // 把巡走狀態換算成世界座標：模型正面是 local +Z
  if (roam.phase === 'bridge') {
    const u = THREE.MathUtils.clamp(roam.progress, 0, 1);
    root.position.x = THREE.MathUtils.lerp(roam.from.x, roam.to.x, u);
    root.position.z = THREE.MathUtils.lerp(roam.from.y, roam.to.y, u);
    root.position.y = FEET_Y + deckY(u);
    root.rotation.y = Math.atan2(roam.to.x - roam.from.x, roam.to.y - roam.from.y);
    return;
  }

  const c = roam.island.center;
  const cos = Math.cos(roam.theta);
  const sin = Math.sin(roam.theta);
  root.position.set(c.x + cos * roam.radius, FEET_Y, c.z + sin * roam.radius);

  if (roam.phase === 'ring' || roam.phase === 'align') {
    const link = roam.link;
    const turn =
      roam.phase === 'align' && link ? shortestTurn(roam.theta, link.angle) : roam.spin;
    root.rotation.y = Math.atan2(-sin * Math.sign(turn), cos * Math.sign(turn));
  } else {
    // outward 往外走、inward 往內走
    const sign = roam.phase === 'outward' ? 1 : -1;
    root.rotation.y = Math.atan2(cos * sign, sin * sign);
  }
}

/** 挑下一條橋：BOSS 會優先選沒巡過的島，其他人偏好不走回頭路 */
function pickLink(roam: Roam, links: BridgeLink[]): BridgeLink {
  const fresh = links.filter((l) => !roam.visited.has(l.to.fruitId));
  const notBack = links.filter((l) => l.to.fruitId !== roam.lastId);
  if (roam.wanderlust >= 0.9) {
    // 吳總：整趟巡視以「走遍」為目標，全部走過就重新開一輪
    if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)];
    roam.visited.clear();
    roam.visited.add(roam.island.fruitId);
  }
  if (notBack.length > 0) return notBack[Math.floor(Math.random() * notBack.length)];
  return links[Math.floor(Math.random() * links.length)];
}
