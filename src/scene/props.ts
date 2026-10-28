import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TOY } from './palette';
import { bake, part } from './bake';

/**
 * 玩具城市道具
 *
 * 這座群島不是只有樹 —— 每一座水果島都是一個小小的產地聚落：
 * 有賣自己水果的攤車、堆在路邊的木箱、推著貨的手推車、
 * 三角旗、路燈，還有一座寫著島名的招牌。
 * 全部合併成單一 mesh，14 座島加起來也不會拖慢畫面。
 */

// ---------- 共用幾何體 ----------

const G = {
  rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.13),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  cone4: new THREE.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2),
  sph: new THREE.SphereGeometry(0.5, 10, 8),
  sphLo: new THREE.SphereGeometry(0.5, 7, 5),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.06, 5, 14),
};

type P = ReturnType<typeof part>;

/** 圓角盒：玩具積木的基本形狀 */
function rbox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  ry = 0,
): P {
  return part(G.rbox, color, (g) => {
    g.scale(w, h, d);
    g.rotateY(ry);
    g.translate(x, y, z);
  });
}

/** 薄板：招牌、桌板、棚頂 */
function slab(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  ry = 0,
  rx = 0,
): P {
  return part(G.box, color, (g) => {
    g.scale(w, h, d);
    g.rotateY(ry);
    g.rotateX(rx);
    g.translate(x, y, z);
  });
}

function cyl(r: number, h: number, x: number, y: number, z: number, color: string): P {
  return part(G.cyl, color, (g) => {
    g.scale(r * 2, h, r * 2);
    g.translate(x, y, z);
  });
}

function cyl6(r: number, h: number, x: number, y: number, z: number, color: string): P {
  return part(G.cyl6, color, (g) => {
    g.scale(r * 2, h, r * 2);
    g.translate(x, y, z);
  });
}

function cone(r: number, h: number, x: number, y: number, z: number, color: string): P {
  return part(G.cone, color, (g) => {
    g.scale(r * 2, h, r * 2);
    g.translate(x, y, z);
  });
}

function ball(r: number, x: number, y: number, z: number, color: string, low = false): P {
  return part(low ? G.sphLo : G.sph, color, (g) => {
    g.scale(r * 2, r * 2, r * 2);
    g.translate(x, y, z);
  });
}

function blob(
  r: number,
  x: number,
  y: number,
  z: number,
  color: string,
  sy = 1,
): P {
  return part(G.ico, color, (g) => {
    g.scale(r * 2, r * 2 * sy, r * 2);
    g.translate(x, y, z);
  });
}

// ---------- 個別道具 ----------

/** 水果攤車：木頭推車 + 條紋遮陽棚 + 桌上堆滿這座島的水果 */
function fruitStall(
  out: P[],
  fruit: string,
  x: number,
  z: number,
  ry: number,
  rnd: () => number,
): { lamp: [number, number, number] | null } {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  /** 攤車局部座標 → 島嶼座標 */
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];

  // 桌面
  out.push(slab(1.24, 0.1, 0.72, ...L(0, 0.66, 0), TOY.wood, ry));
  // 桌裙（前擋板）
  out.push(slab(1.18, 0.3, 0.05, ...L(0, 0.48, 0.35), TOY.cream, ry));
  // 四隻腳
  for (const [lx, lz] of [
    [-0.55, -0.3],
    [0.55, -0.3],
    [-0.55, 0.3],
    [0.55, 0.3],
  ] as const) {
    out.push(slab(0.09, 0.62, 0.09, ...L(lx, 0.31, lz), TOY.woodDeep, ry));
  }

  // 遮陽棚：四根柱子 + 帆布
  for (const [lx, lz] of [
    [-0.58, -0.34],
    [0.58, -0.34],
    [-0.58, 0.34],
    [0.58, 0.34],
  ] as const) {
    out.push(cyl(0.032, 1.0, ...L(lx, 1.16, lz), TOY.woodDeep));
  }
  // 帆布：奶油與水果色交錯的條紋
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    const lz = -0.44 + (i + 0.5) * (0.88 / stripes);
    const color = i % 2 === 0 ? TOY.cream : fruit;
    out.push(
      slab(1.46, 0.045, 0.88 / stripes - 0.02, ...L(0, 1.66, lz), color, ry, -0.16),
    );
  }
  // 棚頂的兩根橫桿
  out.push(slab(1.5, 0.05, 0.05, ...L(0, 1.7, -0.46), TOY.woodDeep, ry, -0.16));
  out.push(slab(1.5, 0.05, 0.05, ...L(0, 1.7, 0.46), TOY.woodDeep, ry, -0.16));

  // 桌上堆的水果（三小堆）
  for (let s = 0; s < 3; s++) {
    const lx = -0.38 + s * 0.38;
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + s;
      const rr = 0.1 * (i % 2);
      out.push(
        ball(
          0.088 + rnd() * 0.02,
          ...L(lx + Math.cos(a) * rr, 0.79 + (i > 2 ? 0.14 : 0), Math.sin(a) * rr),
          fruit,
          true,
        ),
      );
    }
  }
  // 一支小招牌
  out.push(slab(0.52, 0.16, 0.04, ...L(0, 0.94, 0.38), TOY.cream, ry, -0.2));

  return { lamp: null };
}

/** 木箱堆：市場裡永遠堆不夠的那種 */
function crateStack(out: P[], x: number, z: number, ry: number, rnd: () => number): void {
  const n = 2 + Math.floor(rnd() * 2);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const s = 0.42 - i * 0.04;
    const jx = (rnd() - 0.5) * 0.07;
    const jz = (rnd() - 0.5) * 0.07;
    out.push(
      rbox(s, s * 0.78, s, x + jx, y + s * 0.39, z + jz, i % 2 ? TOY.wood : TOY.sand, ry + (rnd() - 0.5) * 0.4),
    );
    // 箱面上的交叉木條
    out.push(slab(s * 1.01, 0.03, 0.03, x + jx, y + s * 0.39, z + jz + s * 0.5, TOY.woodDeep, ry));
    y += s * 0.78;
  }
}

/** 手推車：拖工在場裡推的那種 */
function handCart(out: P[], x: number, z: number, ry: number, fruit: string): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];
  out.push(slab(0.86, 0.08, 0.56, ...L(0, 0.3, 0), TOY.wood, ry));
  out.push(slab(0.86, 0.26, 0.05, ...L(0, 0.44, -0.28), TOY.woodDeep, ry));
  // 兩個輪子（輪軸沿著車身左右方向，輪子是立起來的）
  for (const lx of [-0.3, 0.3]) {
    out.push(
      part(G.torus, TOY.ink, (g) => {
        g.scale(0.3, 0.3, 0.3);
        g.rotateY(Math.PI / 2);
        g.rotateY(ry);
        g.translate(...L(lx, 0.16, 0.18));
      }),
    );
  }
  // 推車上的紙箱與水果
  out.push(rbox(0.4, 0.3, 0.36, ...L(-0.1, 0.49, 0), TOY.creamDeep, ry));
  out.push(rbox(0.34, 0.26, 0.32, ...L(0.24, 0.47, 0.06), TOY.clay, ry + 0.3));
  for (let i = 0; i < 3; i++) {
    out.push(ball(0.075, ...L(0.34, 0.63, -0.14 + i * 0.14), fruit, true));
  }
  // 把手
  out.push(slab(0.05, 0.05, 0.6, ...L(0, 0.42, -0.36), TOY.woodDeep, ry, -0.7));
}

/** 島名招牌：立在步道邊的木牌 */
function nameSign(out: P[], x: number, z: number, ry: number, fruit: string): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];
  for (const lx of [-0.34, 0.34]) {
    out.push(cyl6(0.045, 1.0, ...L(lx, 0.5, 0), TOY.woodDeep));
  }
  // 牌面（水果色）+ 奶油色邊框
  out.push(slab(0.96, 0.44, 0.06, ...L(0, 1.16, 0), fruit, ry));
  out.push(slab(1.04, 0.1, 0.05, ...L(0, 1.4, 0), TOY.cream, ry));
  out.push(slab(1.04, 0.1, 0.05, ...L(0, 0.92, 0), TOY.cream, ry));
  // 牌面上的文字橫條
  for (let i = 0; i < 2; i++) {
    out.push(slab(0.5 - i * 0.16, 0.06, 0.02, ...L(-0.02, 1.24 - i * 0.16, 0.04), TOY.cream, ry));
  }
}

/** 路燈：晚上會亮 */
function lampPost(out: P[], lamps: P[], x: number, z: number): void {
  out.push(cyl6(0.055, 1.5, x, 0.75, z, TOY.slateDeep));
  out.push(cyl6(0.1, 0.08, x, 0.04, z, TOY.stoneDeep));
  out.push(cone(0.2, 0.26, x, 1.62, z, TOY.slateDeep));
  out.push(ball(0.075, x, 1.44, z, TOY.honey, true));
  lamps.push(ball(0.13, x, 1.44, z, TOY.honey, true));
}

/** 長椅 */
function bench(out: P[], x: number, z: number, ry: number): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];
  out.push(slab(0.92, 0.08, 0.34, ...L(0, 0.44, 0), TOY.wood, ry));
  out.push(slab(0.92, 0.36, 0.07, ...L(0, 0.66, -0.14), TOY.wood, ry, 0.12));
  for (const lx of [-0.36, 0.36]) {
    out.push(slab(0.08, 0.44, 0.28, ...L(lx, 0.22, 0), TOY.slateDeep, ry));
  }
}

/** 花盆：種著一小叢綠 */
function planter(out: P[], x: number, z: number, rnd: () => number): void {
  out.push(
    part(G.cyl6, TOY.clay, (g) => {
      g.scale(0.44, 0.34, 0.44);
      g.translate(x, 0.17, z);
    }),
  );
  out.push(blob(0.22, x, 0.44, z, TOY.leafDeep, 0.8));
  if (rnd() > 0.5) out.push(ball(0.07, x, 0.6, z, '#F2A0B6', true));
}

/** 木桶：裝著剛採下來的果實 */
function barrel(out: P[], x: number, z: number, fruit: string): void {
  out.push(
    part(G.cyl, TOY.wood, (g) => {
      g.scale(0.46, 0.56, 0.46);
      g.translate(x, 0.28, z);
    }),
  );
  for (const y of [0.12, 0.44]) {
    out.push(
      part(G.torus, TOY.woodDark, (g) => {
        g.scale(0.48, 0.48, 0.48);
        g.rotateX(Math.PI / 2);
        g.translate(x, y, z);
      }),
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    out.push(ball(0.07, x + Math.cos(a) * 0.12, 0.58, z + Math.sin(a) * 0.12, fruit, true));
  }
}

/** 三角旗串：節慶感的那一條 */
function bunting(out: P[], x: number, z: number, ry: number, fruit: string): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];
  for (const lx of [-1.1, 1.1]) {
    out.push(cyl6(0.04, 1.5, ...L(lx, 0.75, 0), TOY.woodDeep));
  }
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const lx = -1.1 + t * 2.2;
    const sag = Math.sin(t * Math.PI) * 0.16;
    const colors = [TOY.cream, fruit, TOY.honey, TOY.leaf];
    out.push(
      part(G.cone4, colors[i % colors.length], (g) => {
        g.scale(0.17, 0.26, 0.02);
        g.rotateX(Math.PI);
        g.rotateY(ry);
        g.translate(...L(lx, 1.42 - sag, 0));
      }),
    );
  }
}

/** 棧板 + 塑膠籃：市場的標準配備 */
function palletBasket(out: P[], x: number, z: number, ry: number, fruit: string): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const L = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    ly,
    z - lx * s + lz * c,
  ];
  for (let i = 0; i < 5; i++) {
    out.push(slab(0.78, 0.05, 0.1, ...L(0, 0.03, -0.32 + i * 0.16), TOY.sand, ry));
  }
  for (const lx of [-0.34, 0.34]) {
    out.push(slab(0.08, 0.06, 0.72, ...L(lx, 0.08, 0), TOY.sand, ry));
  }
  // 籃子
  out.push(
    part(G.rbox, TOY.cream, (g) => {
      g.scale(0.5, 0.3, 0.38);
      g.rotateY(ry);
      g.translate(...L(0, 0.26, 0));
    }),
  );
  for (let i = 0; i < 5; i++) {
    const a = i * 2.1;
    out.push(
      ball(0.085, ...L(Math.cos(a) * 0.13, 0.44, Math.sin(a) * 0.1), fruit, true),
    );
  }
}

// ---------- 燈泡材質（夜間發光，全部島嶼共用一份） ----------

export const LAMP_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color(TOY.honey),
  roughness: 0.35,
  emissive: new THREE.Color('#FFCE7A'),
  emissiveIntensity: 0,
  transparent: true,
  opacity: 0.55,
  flatShading: true,
});

export interface PropKit {
  /** 所有實體道具合併成的單一 mesh */
  mesh: THREE.Mesh;
  /** 夜間亮起的燈暈 */
  glow: THREE.Mesh;
}

function makeRandom(seedText: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) % 2147483647;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    return seed / 2147483647;
  };
}

/**
 * 生成一整座島的道具。
 *
 * 攤車與木箱沿著環島步道外側排開，朝向島的中心；
 * 中央留給果樹與圖鑑立牌，走道留給居民。
 */
export function createProps(
  islandId: string,
  fruitColor: string,
  ringRadius: number,
): PropKit {
  const rnd = makeRandom(`props:${islandId}`);
  const solid: P[] = [];
  const lamps: P[] = [];

  const fruit = fruitColor;
  // 攤車、招牌、路燈沿環狀步道外側等距排開
  const slots = 6;
  const start = rnd() * Math.PI * 2;

  for (let i = 0; i < slots; i++) {
    const a = start + (i / slots) * Math.PI * 2;
    const r = ringRadius + (rnd() - 0.5) * 0.25;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // 道具朝向島的中心
    const ry = -a + Math.PI / 2;
    const roll = rnd();

    if (i === 0) {
      fruitStall(solid, fruit, x, z, ry, rnd);
    } else if (i === 2) {
      // 第二座攤車（換個角度，街景才不呆板）
      fruitStall(solid, fruit, x, z, ry, rnd);
    } else if (roll < 0.34) {
      crateStack(solid, x, z, ry, rnd);
    } else if (roll < 0.58) {
      palletBasket(solid, x, z, ry, fruit);
    } else if (roll < 0.74) {
      barrel(solid, x, z, fruit);
    } else if (roll < 0.88) {
      handCart(solid, x, z, ry + 1.57, fruit);
    } else {
      bench(solid, x, z, ry);
    }
  }

  // 路燈：兩座，對角放
  for (let i = 0; i < 2; i++) {
    const a = start + Math.PI * (0.35 + i * 0.8);
    const r = ringRadius - 0.35;
    lampPost(solid, lamps, Math.cos(a) * r, Math.sin(a) * r);
  }

  // 島名招牌：放在步道內側、面向島外
  {
    const a = start + Math.PI * 0.15;
    const r = ringRadius + 0.55;
    nameSign(solid, Math.cos(a) * r, Math.sin(a) * r, -a - Math.PI / 2, fruit);
  }

  // 三角旗串：跨過步道
  {
    const a = start + Math.PI * 1.15;
    const r = ringRadius;
    bunting(solid, Math.cos(a) * r, Math.sin(a) * r, -a + Math.PI / 2, fruit);
  }

  // 花盆：零散擺在步道邊
  for (let i = 0; i < 3; i++) {
    const a = start + (i / 3) * Math.PI * 2 + 0.7;
    const r = ringRadius - 0.9 + (rnd() - 0.5) * 0.3;
    planter(solid, Math.cos(a) * r, Math.sin(a) * r, rnd);
  }

  const solidMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(bake(solid), solidMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // 全部島嶼共用同一份燈泡材質，夜間一次點亮
  const glow = new THREE.Mesh(bake(lamps), LAMP_MATERIAL);
  glow.renderOrder = 5;

  return { mesh, glow };
}

/** 夜間程度 0–1：越暗路燈越亮 */
export function setPropNight(night: number): void {
  LAMP_MATERIAL.emissiveIntensity = night * 1.5;
  LAMP_MATERIAL.opacity = 0.12 + night * 0.6;
}
