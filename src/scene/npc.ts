import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Resident } from '../data/types';
import { bake, part, type Part } from './bake';
import { residentLabel, type Label } from './labels';

export interface NpcView {
  /** 位置 + 朝向（世界座標，由 roam 系統驅動） */
  root: THREE.Group;
  /** 走路擺動的內層 */
  anim: THREE.Group;
  body: THREE.Mesh;
  shadow: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  label: Label;
  data: { islandId: string; residentId: string };
  phase: number;
  baseScale: number;
  /** 0→1 出現動畫 */
  appear: number;
  hovered: boolean;
  selected: boolean;
}

// 人物是「木頭小人」的比例：頭大、身體是一塊圓角的木塊
const HEAD_GEO = new THREE.SphereGeometry(0.255, 12, 9);
const STEM_GEO = new THREE.CylinderGeometry(0.028, 0.036, 0.13, 5);
const LEAF_GEO = new THREE.SphereGeometry(0.085, 6, 4);
const TORSO_GEO = new RoundedBoxGeometry(0.44, 0.44, 0.36, 2, 0.09);
const ARM_GEO = new THREE.CylinderGeometry(0.05, 0.045, 0.28, 6);
const LEG_GEO = new THREE.CylinderGeometry(0.062, 0.054, 0.24, 6);
const FOOT_GEO = new RoundedBoxGeometry(0.14, 0.08, 0.2, 1, 0.035);
const EYE_GEO = new THREE.SphereGeometry(0.034, 6, 5);
const SHADOW_GEO = new THREE.CircleGeometry(0.32, 14);
/** 員工黑頭帶 */
const HEADBAND_GEO = new THREE.CylinderGeometry(0.242, 0.246, 0.075, 10);
/** 制服胸前的紅色滾邊條 */
const STRIPE_GEO = new THREE.BoxGeometry(0.032, 0.3, 0.022);
/** 眼鏡：兩個鏡框 + 鼻橋 */
const LENS_GEO = new THREE.TorusGeometry(0.055, 0.012, 6, 14);
const BRIDGE_GEO = new THREE.BoxGeometry(0.07, 0.014, 0.014);

const SHADOW_MAT = new THREE.MeshBasicMaterial({
  color: 0x241505,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});

function darken(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#2A1A0C'), amount);
  return `#${c.getHexString()}`.toUpperCase();
}

export function createNpc(resident: Resident, index: number): NpcView {
  const head = new THREE.Color(resident.color);
  const uniform = new THREE.Color(resident.uniform);
  const torsoColor = `#${uniform.getHexString()}`;
  const isStaff = resident.kind === 'staff';
  // 員工黑長褲；吳總灰格紋褲（低面數簡化成淺灰）；水果居民沿制服色調深
  const trousers = resident.boss
    ? '#A9ACB3'
    : isStaff
      ? '#23262E'
      : darken(resident.uniform, 0.42);

  const parts: Part[] = [
    part(TORSO_GEO, torsoColor, (g) => g.translate(0, 0.5, 0)),
    part(HEAD_GEO, resident.color, (g) => g.translate(0, 0.94, 0)),
    part(ARM_GEO, torsoColor, (g) => {
      g.rotateZ(0.58);
      g.translate(-0.235, 0.52, 0);
    }),
    part(ARM_GEO, torsoColor, (g) => {
      g.rotateZ(-0.58);
      g.translate(0.235, 0.52, 0);
    }),
    part(LEG_GEO, trousers, (g) => g.translate(-0.085, 0.14, 0)),
    part(LEG_GEO, trousers, (g) => g.translate(0.085, 0.14, 0)),
    part(FOOT_GEO, '#3A3129', (g) => g.translate(-0.085, 0.04, 0.03)),
    part(FOOT_GEO, '#3A3129', (g) => g.translate(0.085, 0.04, 0.03)),
    part(EYE_GEO, '#2C2118', (g) => g.translate(-0.085, 0.96, 0.225)),
    part(EYE_GEO, '#2C2118', (g) => g.translate(0.085, 0.96, 0.225)),
  ];

  if (isStaff) {
    // 北農員工：黑頭帶
    parts.push(part(HEADBAND_GEO, '#23272E', (g) => g.translate(0, 1.06, 0)));
    if (resident.boss) {
      // 吳總：眼鏡（灰西裝已在制服色呈現）
      parts.push(
        part(LENS_GEO, '#2C2118', (g) => g.translate(-0.085, 0.96, 0.23)),
        part(LENS_GEO, '#2C2118', (g) => g.translate(0.085, 0.96, 0.23)),
        part(BRIDGE_GEO, '#2C2118', (g) => g.translate(0, 0.965, 0.232)),
      );
    } else {
      // 一般員工：深藍襯衫上的紅色滾邊
      parts.push(
        part(STRIPE_GEO, '#C8375A', (g) => {
          g.rotateY(0.16);
          g.translate(-0.052, 0.5, 0.185);
        }),
        part(STRIPE_GEO, '#C8375A', (g) => {
          g.rotateY(-0.16);
          g.translate(0.052, 0.5, 0.185);
        }),
      );
    }
  } else {
    // 水果居民：頭上的果梗與葉子
    parts.push(
      part(STEM_GEO, '#5C7A3A', (g) => g.translate(0, 1.18, 0)),
      part(LEAF_GEO, '#6FA349', (g) => {
        g.scale(1, 0.42, 1.5);
        g.translate(0.1, 1.22, 0.03);
      }),
    );
  }

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.66,
    metalness: 0.04,
    flatShading: true,
    emissive: head.clone(),
    emissiveIntensity: 0,
  });

  const body = new THREE.Mesh(bake(parts), material);
  body.castShadow = true;
  body.scale.setScalar(0.86);

  const shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.045;

  const anim = new THREE.Group();
  anim.add(body);

  const root = new THREE.Group();
  root.add(anim, shadow);

  const label = residentLabel(resident.name, resident.role, resident.color, resident.boss);
  label.obj.position.set(0, 1.32, 0);
  setHidden(label, true);
  root.add(label.obj);

  const view: NpcView = {
    root,
    anim,
    body,
    shadow,
    material,
    label,
    data: { islandId: resident.islandId, residentId: resident.id },
    phase: index * 1.31,
    baseScale: resident.boss ? 1.16 : 1,
    appear: 0,
    hovered: false,
    selected: false,
  };

  body.userData.npc = view;
  shadow.userData.npc = view;
  return view;
}

export function updateNpc(view: NpcView, t: number, dt: number, visible: boolean): void {
  const want = visible ? 1 : 0;
  view.appear += (want - view.appear) * Math.min(1, dt * 6);
  const show = view.appear > 0.03;
  view.root.visible = show;
  if (!show) return;

  const stride = t * 6.4 + view.phase;
  view.anim.position.y = Math.abs(Math.sin(stride)) * 0.055;
  view.anim.rotation.z = Math.sin(stride) * 0.05;

  const pop = view.appear * view.appear * (3 - 2 * view.appear);
  view.root.scale.setScalar(view.baseScale * pop);

  const wantGlow = view.selected ? 0.3 : view.hovered ? 0.18 : 0.04;
  view.material.emissiveIntensity += (wantGlow - view.material.emissiveIntensity) * Math.min(1, dt * 10);
  view.root.scale.multiplyScalar(1 + (view.hovered || view.selected ? 0.14 : 0));
}

export function setNpcLabelVisible(view: NpcView, visible: boolean): void {
  setHidden(view.label, !visible);
}

function setHidden(label: Label, hidden: boolean): void {
  label.el.classList.toggle('is-hidden', hidden);
}
