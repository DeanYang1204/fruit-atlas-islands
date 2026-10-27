import * as THREE from 'three';

/** 低面數風格海面：頂點以正弦疊加做波浪，flatShading 省去每幀重算法線 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.PlaneGeometry;
  private readonly base: Float32Array;
  private readonly mat: THREE.MeshStandardMaterial;

  constructor(size = 520, segments = 96) {
    this.geo = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geo.rotateX(-Math.PI / 2);
    const attr = this.geo.getAttribute('position') as THREE.BufferAttribute;
    this.base = Float32Array.from(attr.array as Float32Array);

    this.mat = new THREE.MeshStandardMaterial({
      color: 0x3f9fb8,
      roughness: 0.24,
      metalness: 0.18,
      transparent: true,
      opacity: 0.93,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.name = 'ocean';
    this.mesh.renderOrder = -1;
  }

  update(t: number): void {
    const attr = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.base[i];
      const z = this.base[i + 2];
      arr[i + 1] =
        Math.sin(x * 0.075 + t * 0.85) * 0.3 +
        Math.cos(z * 0.105 - t * 0.62) * 0.22 +
        Math.sin((x + z) * 0.045 + t * 1.25) * 0.14;
    }
    attr.needsUpdate = true;
  }

  setColor(c: THREE.Color): void {
    this.mat.color.copy(c);
  }
}
