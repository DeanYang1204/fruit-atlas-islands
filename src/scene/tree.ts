import * as THREE from 'three';
import type { Spot } from '../data/types';
import { SPOT_META } from '../data/spots';
import { createPlant } from './flora';
import { spotLabel, type Label } from './labels';

export interface TreeView {
  group: THREE.Group;
  pick: THREE.Mesh;
  /** 整株植物／整棟建築（隨風搖擺） */
  body: THREE.Group;
  fruits: THREE.Mesh[];
  /** hover / 選取時一起發亮的材質 */
  glowMats: THREE.MeshStandardMaterial[];
  ring: THREE.Mesh;
  label: Label;
  data: { islandId: string; spotId: string };
  phase: number;
  sway: number;
  hovered: boolean;
  selected: boolean;
  /** 目前縮放（會向 target 緩動） */
  current: number;
  target: number;
}

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

  // 依水果種類長出相對應的植物（火龍果是仙人掌，香蕉是草本……）
  const kit = createPlant(spot.fruitId, spot.kind, color);
  group.add(kit.body);

  // 選取指示環：貼著植物根部
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(meta.color),
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(RING_GEO, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;

  // 隱形點擊球：依植物高度調整半徑，避免誤觸旁邊的知識點
  const pickR = 0.56 + kit.pickY * 0.3;
  const pick = new THREE.Mesh(new THREE.SphereGeometry(pickR, 8, 6), PICK_MAT);
  pick.position.y = kit.pickY;

  const label = spotLabel(spot.mark ?? meta.mark, spot.title, meta.color);
  label.obj.position.set(0, kit.labelY, 0);

  group.add(ring, pick, label.obj);
  group.userData.kind = 'tree';

  const view: TreeView = {
    group,
    pick,
    body: kit.body,
    fruits: kit.fruits,
    glowMats: kit.glow,
    ring,
    label,
    data: { islandId: spot.fruitId, spotId: spot.id },
    phase: Math.random() * Math.PI * 2,
    sway: kit.sway ?? 0.05,
    hovered: false,
    selected: false,
    current: 1,
    target: 1,
  };

  pick.userData.tree = view;
  return view;
}

export function updateTree(view: TreeView, t: number, dt: number): void {
  view.target = view.selected ? 1.14 : view.hovered ? 1.08 : 1;
  view.current += (view.target - view.current) * Math.min(1, dt * 9);
  view.group.scale.setScalar(view.current);

  const wantEmissive = view.selected ? 0.46 : view.hovered ? 0.3 : 0.04;
  const k = Math.min(1, dt * 9);
  for (const mat of view.glowMats) {
    mat.emissiveIntensity += (wantEmissive - mat.emissiveIntensity) * k;
  }

  // 隨風搖擺：整株植物繞著根部微微晃，建築不會動
  const sway = Math.sin(t * 0.9 + view.phase) * view.sway;
  view.body.rotation.z = sway;

  view.ring.visible = view.selected;
  if (view.selected) {
    view.ring.rotation.z = t * 0.7;
    const rmat = view.ring.material as THREE.MeshBasicMaterial;
    rmat.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  }
}
