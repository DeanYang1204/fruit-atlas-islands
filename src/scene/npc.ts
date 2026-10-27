import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Resident } from '../data/types';
import { residentLabel, type Label } from './labels';

export interface NpcLoop {
  radius: number;
  angle: number;
  speed: number;
}

export interface NpcView {
  /** 位置 + 朝向 */
  root: THREE.Group;
  /** 走路擺動的內層 */
  anim: THREE.Group;
  body: THREE.Mesh;
  shadow: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  label: Label;
  data: { islandId: string; residentId: string };
  loop: NpcLoop;
  phase: number;
  baseScale: number;
  /** 0→1 出現動畫 */
  appear: number;
  hovered: boolean;
  selected: boolean;
}

const HEAD_GEO = new THREE.SphereGeometry(0.235, 10, 8);
const STEM_GEO = new THREE.CylinderGeometry(0.028, 0.036, 0.13, 5);
const LEAF_GEO = new THREE.SphereGeometry(0.085, 6, 4);
const TORSO_GEO = new THREE.CylinderGeometry(0.155, 0.2, 0.38, 8);
const BAND_GEO = new THREE.CylinderGeometry(0.215, 0.215, 0.055, 8);
const ARM_GEO = new THREE.CylinderGeometry(0.045, 0.04, 0.28, 6);
const LEG_GEO = new THREE.CylinderGeometry(0.058, 0.05, 0.26, 6);
const EYE_GEO = new THREE.SphereGeometry(0.032, 6, 5);
const SHADOW_GEO = new THREE.CircleGeometry(0.3, 14);

const SHADOW_MAT = new THREE.MeshBasicMaterial({
  color: 0x241505,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});

interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.Color;
}

/** 把身體各部位合併成單一幾何體，一次 draw call 畫完一個居民 */
function bake(parts: Part[]): THREE.BufferGeometry {
  const prepared = parts.map(({ geo, color }) => {
    const g = geo.toNonIndexed();
    geo.dispose();
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(prepared, false) ?? new THREE.BufferGeometry();
  prepared.forEach((g) => g.dispose());
  return merged;
}

function part(source: THREE.BufferGeometry, color: string, transform: (g: THREE.BufferGeometry) => void): Part {
  const geo = source.clone();
  transform(geo);
  return { geo, color: new THREE.Color(color) };
}

function darken(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#2A1A0C'), amount);
  return `#${c.getHexString()}`.toUpperCase();
}

export function createNpc(resident: Resident, index: number, total: number): NpcView {
  const head = new THREE.Color(resident.color);
  const uniform = new THREE.Color(resident.uniform);
  const torsoColor = `#${uniform.getHexString()}`;
  const trousers = darken(resident.uniform, 0.42);

  const parts: Part[] = [
    part(TORSO_GEO, torsoColor, (g) => g.translate(0, 0.42, 0)),
    part(HEAD_GEO, resident.color, (g) => g.translate(0, 0.79, 0)),
    part(STEM_GEO, '#5C7A3A', (g) => g.translate(0, 1.0, 0)),
    part(LEAF_GEO, '#6FA349', (g) => {
      g.scale(1, 0.42, 1.5);
      g.translate(0.1, 1.04, 0.03);
    }),
    part(ARM_GEO, torsoColor, (g) => {
      g.rotateZ(0.62);
      g.translate(-0.2, 0.46, 0);
    }),
    part(ARM_GEO, torsoColor, (g) => {
      g.rotateZ(-0.62);
      g.translate(0.2, 0.46, 0);
    }),
    part(LEG_GEO, trousers, (g) => g.translate(-0.08, 0.13, 0)),
    part(LEG_GEO, trousers, (g) => g.translate(0.08, 0.13, 0)),
    part(EYE_GEO, '#2C2118', (g) => g.translate(-0.078, 0.81, 0.205)),
    part(EYE_GEO, '#2C2118', (g) => g.translate(0.078, 0.81, 0.205)),
  ];

  if (resident.boss) {
    // BOSS 專屬：金色職務帶
    parts.push(part(BAND_GEO, '#D8A93A', (g) => g.translate(0, 0.6, 0)));
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

  // 環島散步：每人一條自己的圓形步道
  const lane = total > 1 ? index / (total - 1) : 0.5;
  const radius = 4.02 + lane * 1.16;
  const loop: NpcLoop = {
    radius,
    angle: (index * 2.399963) % (Math.PI * 2),
    speed: 0.26 + ((index % 5) * 0.035),
  };
  root.position.set(Math.cos(loop.angle) * radius, 1.5, Math.sin(loop.angle) * radius);
  root.rotation.y = -loop.angle;

  const view: NpcView = {
    root,
    anim,
    body,
    shadow,
    material,
    label,
    data: { islandId: resident.islandId, residentId: resident.id },
    loop,
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

  view.loop.angle += view.loop.speed * dt;
  const { radius, angle } = view.loop;
  view.root.position.x = Math.cos(angle) * radius;
  view.root.position.z = Math.sin(angle) * radius;
  view.root.rotation.y = -angle;

  const stride = t * 6.4 + view.phase;
  view.anim.position.y = Math.abs(Math.sin(stride)) * 0.055;
  view.anim.rotation.z = Math.sin(stride) * 0.05;

  const pop = view.appear * view.appear * (3 - 2 * view.appear);
  view.root.scale.setScalar(view.baseScale * pop);

  const wantGlow = view.selected ? 0.62 : view.hovered ? 0.4 : 0.05;
  view.material.emissiveIntensity += (wantGlow - view.material.emissiveIntensity) * Math.min(1, dt * 10);
  view.root.scale.multiplyScalar(1 + (view.hovered || view.selected ? 0.14 : 0));
}

export function setNpcLabelVisible(view: NpcView, visible: boolean): void {
  setHidden(view.label, !visible);
}

function setHidden(label: Label, hidden: boolean): void {
  label.el.classList.toggle('is-hidden', hidden);
}
