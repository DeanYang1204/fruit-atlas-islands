import * as THREE from 'three';
import type { Spot } from '../data/types';
import { SPOT_META } from '../data/spots';
import { spotLabel, type Label } from './labels';

export interface TreeView {
  group: THREE.Group;
  pick: THREE.Mesh;
  canopy: THREE.Mesh;
  fruits: THREE.Mesh[];
  ring: THREE.Mesh;
  label: Label;
  data: { islandId: string; spotId: string };
  phase: number;
  hovered: boolean;
  selected: boolean;
  /** 目前縮放（會向 target 緩動） */
  current: number;
  target: number;
}

// 共用幾何體，避免 84 棵樹各建一份
const TRUNK_GEO = new THREE.CylinderGeometry(0.085, 0.135, 0.8, 6);
const CANOPY_GEO = new THREE.IcosahedronGeometry(0.5, 0);
const CANOPY2_GEO = new THREE.IcosahedronGeometry(0.32, 0);
const FRUIT_GEO = new THREE.SphereGeometry(0.11, 8, 6);
const PICK_GEO = new THREE.SphereGeometry(0.82, 8, 6);
const RING_GEO = new THREE.TorusGeometry(0.62, 0.045, 4, 18);

const PICK_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
});

/** 依黃金角螺旋在六邊形內均勻分布知識點座標 */
export function spiralPosition(index: number, total: number, radius: number): THREE.Vector2 {
  const t = (index + 0.62) / Math.max(total, 1);
  const r = Math.sqrt(t) * radius;
  const a = index * 2.399963;
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

export function createTree(spot: Spot, color: string): TreeView {
  const group = new THREE.Group();
  const meta = SPOT_META[spot.kind];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9, flatShading: true });
  const trunk = new THREE.Mesh(TRUNK_GEO, trunkMat);
  trunk.position.y = 0.4;
  trunk.castShadow = true;

  // 樹冠：兩顆多面體堆疊，顏色來自水果主色，帶一點隨機高度差
  const canopyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).lerp(new THREE.Color(0x6fae4e), 0.42),
    roughness: 0.82,
    flatShading: true,
    emissive: new THREE.Color(meta.color),
    emissiveIntensity: 0,
  });
  const canopy = new THREE.Mesh(CANOPY_GEO, canopyMat);
  canopy.position.y = 1.0;
  canopy.scale.set(1, 0.88, 1);
  canopy.castShadow = true;

  const canopy2 = new THREE.Mesh(CANOPY2_GEO, canopyMat);
  canopy2.position.set(0.2, 1.34, -0.12);
  canopy2.castShadow = true;

  // 果實：掛在樹冠外緣的小球
  const fruitMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.32,
    metalness: 0.06,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.18,
    flatShading: true,
  });
  const fruits: THREE.Mesh[] = [];
  const fruitCount = 3;
  for (let i = 0; i < fruitCount; i++) {
    const a = i * 2.15 + 0.5;
    const m = new THREE.Mesh(FRUIT_GEO, fruitMat);
    m.position.set(Math.cos(a) * 0.4, 1.02 + Math.sin(i * 1.7) * 0.18, Math.sin(a) * 0.4);
    m.castShadow = false;
    fruits.push(m);
  }

  // 選取指示環
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(meta.color), transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(RING_GEO, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;

  const pick = new THREE.Mesh(PICK_GEO, PICK_MAT);
  pick.position.y = 0.72;

  const label = spotLabel(spot.mark ?? meta.mark, spot.title, meta.color);
  label.obj.position.set(0, 1.95, 0);

  group.add(trunk, canopy, canopy2, ...fruits, ring, pick, label.obj);
  group.userData.kind = 'tree';

  const view: TreeView = {
    group,
    pick,
    canopy,
    fruits,
    ring,
    label,
    data: { islandId: spot.fruitId, spotId: spot.id },
    phase: Math.random() * Math.PI * 2,
    hovered: false,
    selected: false,
    current: 1,
    target: 1,
  };

  pick.userData.tree = view;
  return view;
}

export function updateTree(view: TreeView, t: number, dt: number): void {
  view.target = view.selected ? 1.16 : view.hovered ? 1.1 : 1;
  view.current += (view.target - view.current) * Math.min(1, dt * 9);
  view.group.scale.setScalar(view.current);

  const mat = view.canopy.material as THREE.MeshStandardMaterial;
  const wantEmissive = view.selected ? 0.5 : view.hovered ? 0.32 : 0.04;
  mat.emissiveIntensity += (wantEmissive - mat.emissiveIntensity) * Math.min(1, dt * 9);

  const sway = Math.sin(t * 0.9 + view.phase) * 0.045;
  view.canopy.rotation.z = sway;
  view.canopy.position.x = sway * 0.35;

  view.ring.visible = view.selected;
  if (view.selected) {
    view.ring.rotation.z = t * 0.7;
    const rmat = view.ring.material as THREE.MeshBasicMaterial;
    rmat.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  }
}
