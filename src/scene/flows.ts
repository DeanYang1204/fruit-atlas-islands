import * as THREE from 'three';
import { FRUIT_BY_ID } from '../data/fruits';
import type { IslandView } from './island';
import { TOP_Y } from './island';

export interface FlowView {
  group: THREE.Group;
  curve: THREE.QuadraticBezierCurve3;
  mesh: THREE.Mesh;
  dot: THREE.Mesh;
  a: string;
  b: string;
  weight: number;
}

interface Pair {
  i: number;
  j: number;
  overlap: number;
  dist: number;
}

const MAX_FLOWS = 18;
const MIN_OVERLAP = 3;

function getPeak(fruitId: string): number[] {
  return FRUIT_BY_ID[fruitId]?.peak ?? [];
}

/** 找出盛產月份重疊較多的島嶼配對，畫出產季連線 */
export function buildFlows(islands: IslandView[]): { group: THREE.Group; flows: FlowView[] } {
  const group = new THREE.Group();
  group.name = 'flows';

  const pairs: Pair[] = [];
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const peakA = getPeak(islands[i].fruitId);
      const peakB = getPeak(islands[j].fruitId);
      if (peakA.length === 0 || peakB.length === 0) continue;
      const overlap = peakA.filter((m) => peakB.includes(m)).length;
      if (overlap < MIN_OVERLAP) continue;
      pairs.push({ i, j, overlap, dist: islands[i].center.distanceTo(islands[j].center) });
    }
  }

  pairs.sort((p, q) => q.overlap - p.overlap || p.dist - q.dist);
  const flows: FlowView[] = pairs.slice(0, MAX_FLOWS).map(({ i, j, overlap }) => {
    const A = islands[i];
    const B = islands[j];
    const start = new THREE.Vector3(A.center.x, TOP_Y + 0.9, A.center.z);
    const end = new THREE.Vector3(B.center.x, TOP_Y + 0.9, B.center.z);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += start.distanceTo(end) * 0.24 + 3.2;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 36, 0.06, 5, false),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FFD9A0'),
        transparent: true,
        opacity: 0.1 + Math.min(overlap, 8) * 0.028,
        depthWrite: false,
      }),
    );

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF3D6'), transparent: true, opacity: 0.85 }),
    );

    const g = new THREE.Group();
    g.add(mesh, dot);
    group.add(g);

    return { group: g, curve, mesh, dot, a: A.fruitId, b: B.fruitId, weight: overlap };
  });

  return { group, flows };
}

export function updateFlows(flows: FlowView[], t: number, islands: Map<string, IslandView>): void {
  for (let k = 0; k < flows.length; k++) {
    const f = flows[k];
    const A = islands.get(f.a);
    const B = islands.get(f.b);
    const both = !!A?.inSeason && !!B?.inSeason;

    const mat = f.mesh.material as THREE.MeshBasicMaterial;
    const want = both ? 0.16 + Math.min(f.weight, 8) * 0.03 : 0.035;
    mat.opacity += (want - mat.opacity) * 0.06;

    const p = (((t * 0.055 + k * 0.137) % 1) + 1) % 1;
    f.curve.getPoint(p, f.dot.position);

    const dmat = f.dot.material as THREE.MeshBasicMaterial;
    dmat.opacity = both ? 0.85 : 0.12;
  }
}
