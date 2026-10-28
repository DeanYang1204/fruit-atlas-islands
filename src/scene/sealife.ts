import * as THREE from 'three';

/**
 * 海洋生態：讓海「活起來」的小系統。
 * - 魚群：在島群外圍的淺海繞圈游（海面半透明，看得到魚在水面下）
 * - 海豚：週期性躍出水面，拋物線跳躍＋入水／出水的水花環
 * - 鯨魚：偶爾浮上水面換氣，噴出一柱水花再沉下去
 * 全部低面數 flatShading，維持玩具模型的質感。
 */

export interface SeaLife {
  group: THREE.Group;
  /** t = 世界時間（暫停時不走），dt = 幀間秒數 */
  update(t: number, dt: number): void;
}

interface School {
  fish: THREE.Group[];
  tails: THREE.Mesh[];
  center: THREE.Vector3;
  radius: number;
  speed: number;
  yBase: number;
  phase: number[];
}

interface Dolphin {
  group: THREE.Group;
  /** 環繞群島的泳道 */
  angle: number;
  radius: number;
  angular: number;
  period: number;
  offset: number;
  leapHeight: number;
  leapDist: number;
  splashes: { mesh: THREE.Mesh; age: number }[];
  /** 上一幀的躍水進度，用來偵測出入水時機 */
  lastQ: number;
}

interface Whale {
  group: THREE.Group;
  spout: THREE.Mesh[];
  spoutOrigin: THREE.Vector3;
  period: number;
  offset: number;
  angle: number;
  radius: number;
  angular: number;
}

const mkMat = (color: string, rough = 0.7): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0.02, flatShading: true });

/** 魚：小紡錘身體＋會擺動的三角尾 */
function makeFish(color: string): { group: THREE.Group; tail: THREE.Mesh } {
  const group = new THREE.Group();
  const mat = mkMat(color, 0.55);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), mat);
  body.scale.set(1.5, 0.75, 0.5);
  group.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), mat);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.42;
  tail.scale.set(1, 1, 0.45);
  group.add(tail);

  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), mat);
  fin.position.set(0, 0.17, 0);
  group.add(fin);
  return { group, tail };
}

/** 海豚：紡錘身＋背鰭＋胸鰭＋尾鰭，淺藍灰玩具色 */
function makeDolphin(): THREE.Group {
  const group = new THREE.Group();
  const skin = mkMat('#8FB0C4', 0.6);
  const dark = mkMat('#5F8299', 0.65);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), skin);
  body.scale.set(2.1, 0.85, 0.8);
  group.add(body);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), skin);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(1.2, -0.05, 0);
  group.add(snout);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), dark);
  dorsal.position.set(0.05, 0.44, 0);
  dorsal.scale.set(1.2, 1, 0.4);
  group.add(dorsal);

  for (const side of [-1, 1]) {
    const flipper = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 4), dark);
    flipper.position.set(0.45, -0.22, side * 0.3);
    flipper.rotation.x = side * 1.1;
    flipper.rotation.z = 0.7;
    group.add(flipper);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), dark);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-1.15, 0.05, 0);
  tail.scale.set(1, 1.5, 0.35);
  group.add(tail);
  return group;
}

/** 鯨魚：圓滾滾的大傢伙，頭頂有噴氣孔 */
function makeWhale(): { group: THREE.Group; spoutOrigin: THREE.Vector3 } {
  const group = new THREE.Group();
  const skin = mkMat('#5E7A96', 0.7);
  const belly = mkMat('#C9D8E2', 0.75);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), skin);
  body.scale.set(2.6, 1.0, 1.05);
  group.add(body);

  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 9, 7), belly);
  bellyMesh.scale.set(2.2, 0.75, 0.9);
  bellyMesh.position.y = -0.3;
  group.add(bellyMesh);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 5), skin);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-3.1, 0.15, 0);
  tail.scale.set(1, 1.6, 0.3);
  group.add(tail);

  const finL = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 4), skin);
  finL.position.set(1.2, -0.5, 0.85);
  finL.rotation.x = 1.2;
  group.add(finL);
  const finR = finL.clone();
  finR.position.z = -0.85;
  finR.rotation.x = -1.2;
  group.add(finR);

  return { group, spoutOrigin: new THREE.Vector3(1.6, 1.15, 0) };
}

/** 水花環：入水／出水時在水面擴散的白圈 */
function makeSplash(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.09, 5, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      transparent: true,
      opacity: 0,
      flatShading: true,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

export function createSeaLife(): SeaLife {
  const group = new THREE.Group();
  group.name = 'sea-life';

  // ── 魚群：三群，各自繞自己的圈子 ──
  const schools: School[] = [];
  const fishColors = ['#E8A24B', '#9FB6C6', '#E86A5B'];
  for (let s = 0; s < 3; s++) {
    const count = 7 + s * 2;
    const center = new THREE.Vector3(
      Math.cos((s / 3) * Math.PI * 2 + 0.7) * (34 + s * 14),
      0,
      Math.sin((s / 3) * Math.PI * 2 + 0.7) * (34 + s * 14),
    );
    const school: School = {
      fish: [],
      tails: [],
      center,
      radius: 3 + s * 1.2,
      speed: 0.55 + s * 0.16,
      yBase: -0.75 - s * 0.28,
      phase: [],
    };
    for (let i = 0; i < count; i++) {
      const { group: fish, tail } = makeFish(fishColors[(s + i) % fishColors.length]);
      school.fish.push(fish);
      school.tails.push(tail);
      school.phase.push((i / count) * Math.PI * 2);
      group.add(fish);
    }
    schools.push(school);
  }

  // ── 海豚：兩隻，錯開週期 ──
  const dolphins: Dolphin[] = [];
  for (let i = 0; i < 2; i++) {
    const d: Dolphin = {
      group: makeDolphin(),
      angle: i * Math.PI * 0.9 + 1.2,
      radius: 40 + i * 22,
      angular: 0.05 + i * 0.02,
      period: 11 + i * 5,
      offset: i * 5.5 + 2,
      leapHeight: 2.4 + i * 0.5,
      leapDist: 9 + i * 2,
      splashes: [],
      lastQ: 0,
    };
    for (let k = 0; k < 2; k++) {
      const sp = makeSplash();
      d.splashes.push({ mesh: sp, age: -1 });
      group.add(sp);
    }
    d.group.visible = false;
    group.add(d.group);
    dolphins.push(d);
  }

  // ── 鯨魚：一隻，繞外圈慢遊 ──
  const whaleParts = makeWhale();
  const whale: Whale = {
    group: whaleParts.group,
    spout: [],
    spoutOrigin: whaleParts.spoutOrigin,
    period: 34,
    offset: 9,
    angle: 2.4,
    radius: 58,
    angular: 0.012,
  };
  const spoutMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  });
  for (let i = 0; i < 12; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.13 + (i % 3) * 0.05, 6, 5), spoutMat.clone());
    drop.visible = false;
    whale.spout.push(drop);
    group.add(drop);
  }
  group.add(whale.group);

  const tmp = new THREE.Vector3();

  const update = (t: number, dt: number): void => {
    // 魚群：繞圈＋上下輕擺＋尾巴擺動
    for (const school of schools) {
      for (let i = 0; i < school.fish.length; i++) {
        const a = school.phase[i] + t * school.speed;
        const fish = school.fish[i];
        fish.position.set(
          school.center.x + Math.cos(a) * school.radius,
          school.yBase + Math.sin(t * 1.8 + school.phase[i] * 2.3) * 0.18,
          school.center.z + Math.sin(a) * school.radius,
        );
        // 面向切線方向
        fish.rotation.y = -a - Math.PI / 2;
        fish.rotation.z = Math.sin(t * 2 + school.phase[i]) * 0.08;
        school.tails[i].rotation.y = Math.sin(t * 9 + school.phase[i] * 3) * 0.5;
      }
    }

    // 海豚：大部分時間潛在水下，週期到了就跳一道拋物線
    for (const d of dolphins) {
      const cycle = (t + d.offset) % d.period;
      const diveEnd = d.period * 0.62;
      if (cycle >= diveEnd) {
        const q = (cycle - diveEnd) / (d.period - diveEnd); // 0→1 躍水進度
        d.group.visible = true;
        const ang = d.angle + t * d.angular;
        const cx = Math.cos(ang) * d.radius;
        const cz = Math.sin(ang) * d.radius;
        // 跳躍方向：沿泳道切線
        const tx = -Math.sin(ang);
        const tz = Math.cos(ang);
        const start = -d.leapDist / 2;
        const px = cx + tx * (start + q * d.leapDist);
        const pz = cz + tz * (start + q * d.leapDist);
        const py = d.leapHeight * 4 * q * (1 - q);
        d.group.position.set(px, py - 0.15, pz);
        d.group.rotation.y = Math.atan2(tx, tz) + Math.PI / 2;
        // 俯仰角跟著拋物線斜率
        const slope = d.leapHeight * 4 * (1 - 2 * q);
        d.group.rotation.z = Math.atan2(slope, d.leapDist / (d.period - diveEnd) / 2);

        // 出水（q 越過 0.02）與入水（q 越過 0.97）時噴水花
        if (d.lastQ < 0.02 && q >= 0.02) spawnSplash(d, px, pz);
        if (d.lastQ < 0.97 && q >= 0.97) spawnSplash(d, px, pz);
        d.lastQ = q;
      } else {
        d.group.visible = false;
        d.lastQ = 0;
      }
      for (const sp of d.splashes) {
        if (sp.age < 0) continue;
        sp.age += dt;
        const p = sp.age / 0.9;
        if (p >= 1) {
          sp.age = -1;
          sp.mesh.visible = false;
          continue;
        }
        sp.mesh.visible = true;
        const s = 0.6 + p * 2.6;
        sp.mesh.scale.set(s, s, s);
        (sp.mesh.material as THREE.MeshStandardMaterial).opacity = 0.85 * (1 - p);
      }
    }

    // 鯨魚：繞外圈慢遊，週期性的浮上換氣＋噴水柱
    const wc = (t + whale.offset) % whale.period;
    const riseStart = whale.period * 0.5;
    const spoutStart = whale.period * 0.6;
    const spoutEnd = whale.period * 0.82;
    const sinkStart = whale.period * 0.9;
    let wy = -3.2;
    let spouting = false;
    if (wc >= riseStart && wc < sinkStart) {
      // 浮升／懸浮／下潛的平滑曲線
      const rp = (wc - riseStart) / (sinkStart - riseStart);
      wy = -3.2 + 3.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, rp)));
      spouting = wc >= spoutStart && wc < spoutEnd;
    }
    whale.angle += whale.angular * dt * (wc >= riseStart && wc < sinkStart ? 1 : 0.4);
    const wx = Math.cos(whale.angle) * whale.radius;
    const wz = Math.sin(whale.angle) * whale.radius;
    whale.group.position.set(wx, wy, wz);
    whale.group.rotation.y = -whale.angle - Math.PI / 2;
    whale.group.rotation.z = Math.sin(t * 0.7) * 0.03;

    // 噴水柱：水珠從氣孔往上噴再散開
    if (spouting) {
      tmp.copy(whale.spoutOrigin);
      whale.group.localToWorld(tmp);
      for (let i = 0; i < whale.spout.length; i++) {
        const drop = whale.spout[i];
        drop.visible = true;
        const life = ((t * 1.6 + i * 0.11) % 1);
        const rise = life * 2.6;
        const spread = life * 0.7;
        const a = i * 2.4;
        drop.position.set(
          tmp.x + Math.cos(a) * spread,
          tmp.y + rise,
          tmp.z + Math.sin(a) * spread,
        );
        const sc = 1.15 - life * 0.75;
        drop.scale.set(sc, sc, sc);
        (drop.material as THREE.MeshStandardMaterial).opacity = 0.85 * (1 - life);
      }
    } else {
      for (const drop of whale.spout) drop.visible = false;
    }
  };

  function spawnSplash(d: Dolphin, x: number, z: number): void {
    const slot = d.splashes.find((s) => s.age < 0) ?? d.splashes[0];
    slot.age = 0;
    slot.mesh.position.set(x, 0.12, z);
  }


  return { group, update };
}
