import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface Part {
  geo: THREE.BufferGeometry;
  color: string;
}

/** 取一份共用的幾何體來變形，避免動到快取裡的原始幾何 */
export function part(
  source: THREE.BufferGeometry,
  color: string,
  transform: (g: THREE.BufferGeometry) => void,
): Part {
  const geo = source.clone();
  transform(geo);
  return { geo, color };
}

/**
 * 把一堆零件合併成單一幾何體（頂點色），一次 draw call 畫完。
 * 花草、柵欄、橋這種「很多小東西」的裝飾都用它。
 */
export function bake(parts: Part[]): THREE.BufferGeometry {
  const prepared = parts.map(({ geo, color }) => {
    const g = geo.toNonIndexed();
    geo.dispose();
    const c = new THREE.Color(color);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(prepared, false) ?? new THREE.BufferGeometry();
  prepared.forEach((g) => g.dispose());
  return merged;
}
