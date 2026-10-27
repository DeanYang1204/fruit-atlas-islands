import * as THREE from 'three';
import { RESIDENTS } from '../data/residents';
import type { IslandView } from './island';
import { createNpc, setNpcLabelVisible, updateNpc, type NpcView } from './npc';
import { buildRoamNetwork, createRoam, updateRoam, type Roam, type RoamNetwork } from './roam';

/**
 * 群島上的所有人。
 *
 * 以前居民被釘在自己所屬的島上繞圈，這裡改成「全島共用的一群人」：
 * 每個人都是世界座標上的一個角色，可以在島之間走來走去。
 * 距離鏡頭太遠的角色不會活動也不顯示，省效能。
 */

/** 角色離鏡頭多遠就停止活動 */
const ACTIVE_DISTANCE = 58;

export interface Crowd {
  group: THREE.Group;
  views: NpcView[];
  byId: Map<string, NpcView>;
  roam: Map<string, Roam>;
  net: RoamNetwork;
  boss: NpcView | null;
}

/** 一般居民的跨島意願（有橋就偶爾串門子） */
const NORMAL_WANDERLUST = 0.55;
/** 吳總：幾乎一直在巡島 */
const BOSS_WANDERLUST = 0.96;

export function createCrowd(islands: IslandView[]): Crowd {
  const net = buildRoamNetwork(islands);
  const home = new Map<string, IslandView>();
  for (const isl of islands) home.set(isl.fruitId, isl);

  const group = new THREE.Group();
  group.name = 'crowd';
  const views: NpcView[] = [];
  const byId = new Map<string, NpcView>();
  const roamMap = new Map<string, Roam>();
  let boss: NpcView | null = null;

  RESIDENTS.forEach((resident, index) => {
    const start = home.get(resident.islandId);
    if (!start) return;
    const view = createNpc(resident, index);
    const roam = createRoam(start, index, resident.boss ? BOSS_WANDERLUST : NORMAL_WANDERLUST, index + 7);
    // 先擺到起始位置上，避免第一幀從原點飄出來
    updateRoam(view.root, roam, 0, net);
    group.add(view.root);
    views.push(view);
    byId.set(resident.id, view);
    roamMap.set(resident.id, roam);
    if (resident.boss) boss = view;
  });

  return { group, views, byId, roam: roamMap, net, boss };
}

export function updateCrowd(
  crowd: Crowd,
  camera: THREE.Camera,
  t: number,
  dt: number,
  visible: boolean,
): void {
  crowd.group.visible = visible;
  if (!visible) return;
  for (const view of crowd.views) {
    const roam = crowd.roam.get(view.data.residentId);
    if (roam) updateRoam(view.root, roam, dt, crowd.net);
    const dist = camera.position.distanceTo(view.root.position);
    updateNpc(view, t, dt, visible && dist < ACTIVE_DISTANCE);
  }
}

/** 只展開指定島上現在的角色名牌，避免整片畫面被文字淹沒 */
export function setCrowdLabels(crowd: Crowd, islandId: string | null, show: boolean): void {
  for (const view of crowd.views) {
    const roam = crowd.roam.get(view.data.residentId);
    const onIsland = !!roam && roam.island.fruitId === islandId;
    setNpcLabelVisible(view, show && onIsland);
  }
}

export function npcWorldPosition(view: NpcView, out: THREE.Vector3): THREE.Vector3 {
  view.root.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(view.root.matrixWorld);
}

/** 這位角色現在在哪座島上（給 UI 顯示「吳總正在巡視：芒果島」用） */
export function npcIslandId(crowd: Crowd, residentId: string): string | null {
  return crowd.roam.get(residentId)?.island.fruitId ?? null;
}
