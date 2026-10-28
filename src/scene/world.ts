import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { ALL_ISLANDS } from '../data/atlas';
import { FRUIT_BY_ID } from '../data/fruits';
import type { ToggleKey, WeatherKey } from '../data/types';
export type { ToggleKey, WeatherKey };
import { createIsland, updateIsland, type IslandView } from './island';
import { updateTree, type TreeView } from './tree';
import type { NpcView } from './npc';
import { createCrowd, npcIslandId, npcWorldPosition, setCrowdLabels, updateCrowd, type Crowd } from './crowd';
import { buildBridges } from './bridges';
import { Ocean } from './water';
import { buildFlows, updateFlows, type FlowView } from './flows';
import { getBlankState, sampleSky, sunPosition, type SkyState } from './palette';
import { setLabelActive, setLabelVisible } from './labels';
import { setPropNight } from './props';

export interface WorldCallbacks {
  onHoverSpot(spotId: string | null): void;
  onSelectSpot(spotId: string): void;
  onSelectIsland(fruitId: string): void;
  onHoverResident(residentId: string | null): void;
  onSelectResident(residentId: string): void;
  /** 吳總巡視時抵達了哪一座島 */
  onBossIsland(fruitId: string | null): void;
  onFrame(): void;
}

interface Flight {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
}

// 長焦鏡頭（FOV 34）是微縮模型的關鍵：透視被壓扁，群島看起來像桌上的玩具城市。
// 鏡頭因此要比廣角時再退後一點，才框得住整片群島。
const HOME_POS = new THREE.Vector3(2, 84, 103);
const HOME_TARGET = new THREE.Vector3(2, 0, 4);
/** 鳥瞰全景（長焦下要更高才看得到全部） */
const BIRD_POS = new THREE.Vector3(0, 118, 0.01);

const SKY_VERT = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
  float h = normalize( vWorldPosition + vec3( 0.0, offset, 0.0 ) ).y;
  float f = pow( max( h, 0.0 ), exponent );
  gl_FragColor = vec4( mix( bottomColor, topColor, f ), 1.0 );
  #include <colorspace_fragment>
}
`;

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export class World {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly labelRenderer: CSS2DRenderer;
  readonly controls: OrbitControls;
  readonly islands: IslandView[] = [];
  readonly islandMap = new Map<string, IslandView>();
  readonly treeIndex = new Map<string, TreeView>();
  readonly npcIndex = new Map<string, NpcView>();
  /** 群島上的所有人（跨島巡走由 crowd 統一驅動） */
  private crowd: Crowd | null = null;
  private readonly rain = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xdceafb, transparent: true, opacity: 0.5 }),
  );
  private readonly bossPos = new THREE.Vector3();
  private bossIsland: string | null = null;

  private readonly ocean: Ocean;
  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly ambient: THREE.AmbientLight;
  /** 冷色補光：讓背光面不是死黑，才有塑膠玩具的通透感 */
  private readonly fill: THREE.DirectionalLight;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly clouds = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(-10, -10);
  private readonly pickables: THREE.Object3D[] = [];

  private flows: FlowView[] = [];
  private flowGroup = new THREE.Group();
  private bridges = new THREE.Group();
  private hovered: TreeView | null = null;
  private hoveredNpc: NpcView | null = null;
  private hoveredIsland: IslandView | null = null;
  private selectedTree: TreeView | null = null;
  private selectedNpc: NpcView | null = null;
  private selectedIsland: IslandView | null = null;
  private flight: Flight | null = null;
  private time = 0;
  private frozen = false;
  private birdOn = false;
  private pointerInside = false;
  private downPos = new THREE.Vector2();
  private rafId = 0;

  private readonly skyNow: SkyState = getBlankState();
  private readonly skyGoal: SkyState = getBlankState();
  private readonly sunNow = new THREE.Vector3(0, 40, 20);
  private readonly sunGoal = new THREE.Vector3(0, 40, 20);
  /** 上一次重算陰影時的太陽位置（四捨五入成格子，動夠多才重算） */
  private shadowSig = '';

  toggles: Record<ToggleKey, boolean> = {
    names: true,
    fruits: true,
    people: true,
    flows: false,
    freeze: false,
    bird: false,
    log: false,
    patrol: false,
  };

  weather: WeatherKey = 'clear';

  constructor(
    private readonly container: HTMLElement,
    private readonly cb: WorldCallbacks,
  ) {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 只有靜態幾何投影，所以陰影圖不必每幀重算：太陽動到定位點才更新一次
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    Object.assign(this.labelRenderer.domElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
    });
    container.appendChild(this.labelRenderer.domElement);

    // 長焦：壓扁透視，整座群島像一組放在桌上的模型
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.5, 640);
    this.camera.position.copy(HOME_POS);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 190;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minPolarAngle = Math.PI * 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.addEventListener('start', () => {
      this.flight = null;
    });

    this.ambient = new THREE.AmbientLight(0xffffff, 0.16);
    // 半球光：天空是淡藍、地面是陶土色，塑膠玩具的受光就是這樣來的
    this.hemi = new THREE.HemisphereLight(0xeff6fa, 0x94826b, 1.32);
    this.sun = new THREE.DirectionalLight(0xfff3de, 2.85);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 300;
    this.sun.shadow.camera.left = -62;
    this.sun.shadow.camera.right = 62;
    this.sun.shadow.camera.top = 62;
    this.sun.shadow.camera.bottom = -62;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 2.5;
    // 補光：從太陽的背面打一道冷色，陰影才不會黑成一片
    this.fill = new THREE.DirectionalLight(0xbfd6ff, 0.34);
    this.fill.position.set(24, 20, -28);
    this.scene.add(this.ambient, this.hemi, this.sun, this.sun.target, this.fill);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#9FD3EE') },
        bottomColor: { value: new THREE.Color('#F7EEE0') },
        offset: { value: 42 },
        exponent: { value: 0.66 },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), this.skyMat);
    sky.renderOrder = -1000;
    this.scene.add(sky);

    // 暖色的奶油霧：遠處的島會被霧吃掉、泛白，這正是桌上模型的空氣感
    this.scene.fog = new THREE.Fog(new THREE.Color('#F4EEE3'), 120, 460);

    this.ocean = new Ocean();
    this.scene.add(this.ocean.mesh);

    for (const island of ALL_ISLANDS) {
      const view = createIsland(island);
      this.islands.push(view);
      this.islandMap.set(view.fruitId, view);
      this.scene.add(view.group);
      // 島嶼本體可點選（本體 + 草地）
      const body = view.group.children[0] as THREE.Mesh;
      this.pickables.push(body, view.grass);
      for (const [spotId, tree] of view.trees) {
        this.treeIndex.set(spotId, tree);
        this.pickables.push(tree.pick);
      }
    }

    // 橋：把六角格上相鄰的島連起來，整片群島才走得通
    this.bridges = buildBridges(this.islands);
    this.scene.add(this.bridges);

    // 人：一個統一的群眾系統，所有人都能沿著橋在島之間穿梭
    this.crowd = createCrowd(this.islands);
    this.scene.add(this.crowd.group);
    for (const [residentId, npc] of this.crowd.byId) {
      this.npcIndex.set(residentId, npc);
      this.pickables.push(npc.body, npc.shadow);
    }

    const built = buildFlows(this.islands);
    this.flowGroup = built.group;
    this.flows = built.flows;
    this.flowGroup.visible = false;
    this.scene.add(this.flowGroup);

    this.createClouds();
    this.createRain();
    this.bindEvents();
    this.setTime(720);
    this.setWeather('clear');
    this.applySky(this.skyNow);
    // 初始只顯示島嶼名牌，知識點名牌等 hover / 選取才出現
    this.updateLabelVisibility();
  }

  /** 雨：一小片跟著鏡頭走的落雨線段（每一滴 = 兩個端點） */
  private createRain(): void {
    const count = 1400;
    const pos = new Float32Array(count * 6);
    const spread = 85;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread * 2;
      const y = Math.random() * 55;
      const z = (Math.random() - 0.5) * spread * 2;
      pos[i * 6] = x;
      pos[i * 6 + 1] = y;
      pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x + 0.07;
      pos[i * 6 + 4] = y + 0.85;
      pos[i * 6 + 5] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain.geometry = geo;
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  private createClouds(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.86,
    });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const lumps = 3 + (i % 3);
      for (let j = 0; j < lumps; j++) {
        const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 + ((i * j) % 5) * 0.35, 0), mat);
        lump.position.set((j - lumps / 2) * 3.1, ((i + j) % 3) * 0.5, ((i * 7 + j) % 5) * 0.9);
        lump.scale.set(1.4, 0.55, 1);
        cloud.add(lump);
      }
      const a = (i / 12) * Math.PI * 2;
      const r = 40 + ((i * 13) % 40);
      cloud.position.set(Math.cos(a) * r, 30 + ((i * 5) % 14), Math.sin(a) * r);
      cloud.userData.speed = 0.25 + ((i % 5) * 0.09);
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.pointerInside = true;
  };

  private onPointerLeave = (): void => {
    this.pointerInside = false;
    this.pointer.set(-10, -10);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.downPos.set(e.clientX, e.clientY);
  };

  private onPointerUp = (e: PointerEvent): void => {
    const moved = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y);
    if (moved > 6) return; // 拖曳，不當成點擊
    const hit = this.pickFirst();
    if (!hit) return;

    const npc = hit.object.userData.npc as NpcView | undefined;
    if (npc) {
      this.selectResident(npc.data.residentId);
      this.cb.onSelectResident(npc.data.residentId);
      return;
    }

    const tree = hit.object.userData.tree as TreeView | undefined;
    if (tree) {
      this.select(tree.data.islandId, tree.data.spotId);
      this.cb.onSelectSpot(tree.data.spotId);
      return;
    }
    const island = hit.object.userData.island as IslandView | undefined;
    if (island) {
      this.select(island.fruitId, null);
      this.cb.onSelectIsland(island.fruitId);
    }
  };

  private pickFirst(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    for (const hit of hits) {
      if (isRenderable(hit.object)) return hit;
    }
    return null;
  }

  private updateHover(): void {
    if (!this.pointerInside) {
      if (this.hovered || this.hoveredNpc || this.hoveredIsland) {
        if (this.hovered) this.hovered.hovered = false;
        if (this.hoveredNpc) this.hoveredNpc.hovered = false;
        this.hovered = null;
        this.hoveredNpc = null;
        this.hoveredIsland = null;
        this.cb.onHoverSpot(null);
        this.cb.onHoverResident(null);
        this.updateLabelVisibility();
      }
      return;
    }

    const hit = this.pickFirst();
    const tree = (hit?.object.userData.tree as TreeView | undefined) ?? null;
    const npc = (hit?.object.userData.npc as NpcView | undefined) ?? null;
    const island = npc
      ? this.islandMap.get(npc.data.islandId) ?? null
      : tree
        ? this.islandMap.get(tree.data.islandId) ?? null
        : ((hit?.object.userData.island as IslandView | undefined) ?? null);

    if (npc !== this.hoveredNpc) {
      if (this.hoveredNpc) this.hoveredNpc.hovered = false;
      this.hoveredNpc = npc;
      if (npc) npc.hovered = true;
      this.cb.onHoverResident(npc ? npc.data.residentId : null);
    }

    if (tree !== this.hovered || island !== this.hoveredIsland) {
      if (this.hovered) this.hovered.hovered = false;
      this.hovered = tree;
      if (tree) tree.hovered = true;
      this.hoveredIsland = island;
      this.cb.onHoverSpot(tree ? tree.data.spotId : null);
      this.updateLabelVisibility();
      this.renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
    }
  }

  private updateLabelVisibility(): void {
    const showNames = this.toggles.names;
    const selId = this.selectedIsland?.fruitId ?? null;
    const hovId = this.hoveredIsland?.fruitId ?? null;

    for (const isl of this.islands) {
      setLabelVisible(isl.label, showNames);
      setLabelActive(isl.label, isl.fruitId === selId || isl.fruitId === hovId);
      for (const tree of isl.trees.values()) {
        const show = tree.selected || tree.hovered || (showNames && isl.fruitId === selId);
        setLabelVisible(tree.label, show);
        setLabelActive(tree.label, tree.selected);
      }
    }
    if (this.crowd) {
      const id = this.toggles.people && showNames ? (selId ?? hovId) : null;
      setCrowdLabels(this.crowd, id, !!id);
    }
  }

  // ---------- 對外 API ----------

  select(islandId: string | null, spotId: string | null, residentId: string | null = null): void {
    if (this.selectedTree) {
      this.selectedTree.selected = false;
      this.selectedTree = null;
    }
    if (this.selectedNpc) {
      this.selectedNpc.selected = false;
      this.selectedNpc = null;
    }
    const island = islandId ? this.islandMap.get(islandId) ?? null : null;
    this.selectedIsland = island;
    if (island && spotId) {
      const tree = island.trees.get(spotId) ?? null;
      if (tree) {
        tree.selected = true;
        this.selectedTree = tree;
      }
    }
    if (residentId) {
      const npc = this.npcIndex.get(residentId) ?? null;
      if (npc) {
        npc.selected = true;
        this.selectedNpc = npc;
      }
    }
    this.updateLabelVisibility();
  }

  private selectResident(residentId: string): void {
    const npc = this.npcIndex.get(residentId);
    if (!npc) return;
    this.select(npc.data.islandId, null, residentId);
  }

  focusIsland(fruitId: string): void {
    const island = this.islandMap.get(fruitId);
    if (!island) return;
    const target = island.center.clone();
    const offset = this.birdOn
      ? new THREE.Vector3(0, 56, 0.01)
      : new THREE.Vector3(5.4, 20, 21);
    this.flyTo(target.clone().add(offset), target, 1.05);
  }

  focusSpot(spotId: string): void {
    const tree = this.treeIndex.get(spotId);
    if (!tree) return;
    const wp = new THREE.Vector3();
    tree.group.getWorldPosition(wp);
    const target = wp.clone().add(new THREE.Vector3(0, 0.9, 0));
    const offset = this.birdOn
      ? new THREE.Vector3(0, 28, 0.01)
      : new THREE.Vector3(3.4, 10.8, 11.8);
    this.flyTo(target.clone().add(offset), target, 0.95);
  }

  /** 飛到某位居民面前（居民會一直走，所以先算出他當下的位置） */
  focusResident(residentId: string): void {
    const npc = this.npcIndex.get(residentId);
    if (!npc) return;
    npcWorldPosition(npc, this.bossPos);
    const wp = this.bossPos.clone();
    const target = wp.clone().add(new THREE.Vector3(0, 0.6, 0));
    const offset = this.birdOn
      ? new THREE.Vector3(0, 20, 0.01)
      : new THREE.Vector3(2.1, 3.4, 4.2);
    this.flyTo(target.clone().add(offset), target, 0.85);
  }

  /** 吳總現在在哪一座島（巡視模式用它顯示字幕） */
  get bossLocation(): { islandId: string | null } {
    return { islandId: this.bossIsland };
  }

  resetView(): void {
    const target = HOME_TARGET.clone();
    const pos = this.birdOn ? BIRD_POS.clone() : HOME_POS.clone();
    this.flyTo(pos, target, 1.1);
  }

  setTime(minutes: number): void {
    sampleSky(minutes, this.skyGoal);
    sunPosition(minutes, this.sunGoal);
  }

  /** 天氣：晴／陰／雨。影響光線、天空與霧，下雨時落下粒子 */
  setWeather(key: WeatherKey): void {
    this.weather = key;
    // 雲的高度與顏色跟著天氣走（晴天才又白又高）
    this.rain.visible = key === 'rain';
    for (const cloud of this.clouds.children) {
      for (const lump of cloud.children) {
        const mat = (lump as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.color.set(key === 'clear' ? '#FFFFFF' : key === 'cloudy' ? '#DDE3EA' : '#9FA8B4');
        mat.opacity = key === 'clear' ? 0.86 : key === 'cloudy' ? 0.92 : 0.96;
      }
      cloud.visible = key !== 'clear' || true;
    }
    this.applySky(this.skyNow);
  }

  /** 巡視模式：把鏡頭黏在吳總身後，跟著他走遍群島 */
  private followBoss(snap: boolean): void {
    const boss = this.crowd?.boss ?? null;
    if (!boss) return;
    npcWorldPosition(boss, this.bossPos);
    const target = this.bossPos.clone().add(new THREE.Vector3(0, 0.7, 0));
    const desired = target.clone().add(new THREE.Vector3(3.4, 4.6, 6.8));
    const k = snap ? 1 : Math.min(1, 0.09);
    this.camera.position.lerp(desired, k);
    this.controls.target.lerp(target, k);
  }

  setToggle(key: ToggleKey, value: boolean): void {
    this.toggles[key] = value;
    if (key === 'freeze') this.frozen = value;
    if (key === 'flows') this.flowGroup.visible = value;
    if (key === 'people' && this.crowd) {
      this.crowd.group.visible = value;
      this.updateLabelVisibility();
    }
    if (key === 'patrol') {
      this.controls.enabled = !value;
      if (value) this.followBoss(true);
    }
    if (key === 'fruits') {
      for (const tree of this.treeIndex.values()) {
        for (const f of tree.fruits) f.visible = value;
      }
    }
    if (key === 'bird') {
      this.birdOn = value;
      if (this.selectedIsland) this.focusIsland(this.selectedIsland.fruitId);
      else this.resetView();
    }
    if (key === 'names') this.updateLabelVisibility();
  }

  /** 依「月份」與「科別」條件調整島嶼亮度（當令者會微微發光）；主島不參與水果篩選 */
  setIslandFilter(month: number | null, families: string[]): void {
    for (const isl of this.islands) {
      if (isl.main) {
        isl.inSeason = true;
        setLabelActive(isl.label, true);
        continue;
      }
      const monthOk = month === null || hasPeak(isl.fruitId, month);
      const familyOk = families.length === 0 || families.includes(familyOf(isl.fruitId));
      isl.inSeason = monthOk && familyOk;
      setLabelActive(isl.label, isl.inSeason);
    }
  }

  get selected(): { islandId: string | null; spotId: string | null; residentId: string | null } {
    return {
      islandId: this.selectedIsland?.fruitId ?? null,
      spotId: this.selectedTree?.data.spotId ?? null,
      residentId: this.selectedNpc?.data.residentId ?? null,
    };
  }

  start(): void {
    this.clock.start();
    const loop = (): void => {
      this.rafId = requestAnimationFrame(loop);
      this.step();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  // ---------- 主迴圈 ----------

  private step(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.frozen) this.time += dt;
    const t = this.time;

    this.ocean.update(t);

    const peopleOn = this.toggles.people;
    for (const isl of this.islands) {
      updateIsland(isl, t, dt);
      for (const tree of isl.trees.values()) updateTree(tree, t, dt);
    }

    // 所有人一起動：跨島巡走、上橋拱道、距離太遠的自動休眠
    if (this.crowd) updateCrowd(this.crowd, this.camera, t, dt, peopleOn);

    if (this.weather === 'rain' && !this.frozen) this.updateRain(dt);

    if (this.flowGroup.visible) updateFlows(this.flows, t, this.islandMap);

    for (const cloud of this.clouds.children) {
      if (!this.frozen) cloud.position.x += (cloud.userData.speed as number) * dt;
      if (cloud.position.x > 120) cloud.position.x = -120;
    }

    const k = Math.min(1, dt * 5);
    lerpSky(this.skyNow, this.skyGoal, k);
    this.sunNow.lerp(this.sunGoal, k);

    // 靜態幾何的陰影：太陽移到下一格才重算一次，不必每幀畫兩百萬個三角形
    const sig = `${Math.round(this.sunNow.x / 3)},${Math.round(this.sunNow.y / 3)},${Math.round(this.sunNow.z / 3)}`;
    if (sig !== this.shadowSig) {
      this.shadowSig = sig;
      this.renderer.shadowMap.needsUpdate = true;
    }

    this.applySky(this.skyNow);

    if (this.toggles.patrol) {
      this.followBoss(false);
      this.controls.update();
    } else if (this.flight) {
      const f = this.flight;
      f.elapsed += dt;
      const p = easeInOutCubic(Math.min(1, f.elapsed / f.duration));
      this.camera.position.lerpVectors(f.fromPos, f.toPos, p);
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, p);
      if (p >= 1) this.flight = null;
    }
    this.trackBoss();

    this.updateHover();
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.cb.onFrame();
  }

  private flyTo(toPos: THREE.Vector3, toTarget: THREE.Vector3, duration: number): void {
    this.flight = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      elapsed: 0,
      duration,
    };
  }

  /** 追蹤吳總所在島，切換時通知 UI（「吳總正在巡視：芒果島」） */
  private trackBoss(): void {
    const boss = this.crowd?.boss ?? null;
    if (!boss) return;
    const id = npcIslandId(this.crowd!, boss.data.residentId);
    if (id !== this.bossIsland) {
      this.bossIsland = id;
      this.cb.onBossIsland(id);
    }
  }

  private updateRain(dt: number): void {
    const attr = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const cx = this.camera.position.x;
    const cz = this.camera.position.z;
    const fall = 30 * dt;
    for (let i = 0; i < arr.length; i += 6) {
      arr[i + 1] -= fall;
      arr[i + 4] -= fall;
      if (arr[i + 1] < -2) {
        const y = 40 + Math.random() * 16;
        const x = cx + (Math.random() - 0.5) * 150;
        const z = cz + (Math.random() - 0.5) * 150;
        arr[i] = x;
        arr[i + 1] = y;
        arr[i + 2] = z;
        arr[i + 3] = x + 0.07;
        arr[i + 4] = y + 0.85;
        arr[i + 5] = z;
      }
    }
    attr.needsUpdate = true;
  }

  private applySky(s: SkyState): void {
    const w = WEATHER_FACTOR[this.weather];
    (this.skyMat.uniforms.topColor.value as THREE.Color).copy(s.skyTop).lerp(GRAY_TOP, w.gray);
    (this.skyMat.uniforms.bottomColor.value as THREE.Color)
      .copy(s.skyBottom)
      .lerp(GRAY_BOTTOM, w.gray);
    if (this.scene.fog) {
      const fog = this.scene.fog as THREE.Fog;
      fog.color.copy(s.fog).lerp(GRAY_BOTTOM, w.gray * 0.8);
      fog.near = 120 * s.fogNear * w.fogNear;
      fog.far = 460 * s.fogFar * w.fogFar;
    }
    this.sun.color.copy(s.sunColor);
    this.sun.intensity = s.sunIntensity * w.sun;
    this.hemi.color.copy(s.hemiSky);
    this.hemi.groundColor.copy(s.hemiGround);
    this.hemi.intensity = s.hemiIntensity * w.hemi;
    this.fill.color.copy(s.fillColor);
    this.fill.intensity = s.fillIntensity * w.hemi;
    this.ambient.color.copy(s.ambientColor);
    this.ambient.intensity = s.ambientIntensity * w.ambient;
    this.ocean.setColor(s.waterColor.clone().lerp(RAIN_WATER, w.gray * 0.55));
    this.sun.position.copy(this.sunNow);
    // 天黑了，路燈就亮
    setPropNight(s.night);
  }
}

/** 天氣對環境光的加成／衰減 */
const WEATHER_FACTOR: Record<WeatherKey, { sun: number; hemi: number; ambient: number; gray: number; fogNear: number; fogFar: number }> = {
  clear: { sun: 1, hemi: 1, ambient: 1, gray: 0, fogNear: 1, fogFar: 1 },
  cloudy: { sun: 0.55, hemi: 1.02, ambient: 1.05, gray: 0.45, fogNear: 0.8, fogFar: 0.78 },
  rain: { sun: 0.22, hemi: 1.06, ambient: 1.14, gray: 0.62, fogNear: 0.55, fogFar: 0.5 },
};

const GRAY_TOP = new THREE.Color('#B7C4CC');
const GRAY_BOTTOM = new THREE.Color('#D8D2C8');
const RAIN_WATER = new THREE.Color('#6E8796');

function hasPeak(fruitId: string, month: number): boolean {
  return FRUIT_BY_ID[fruitId]?.peak.includes(month) ?? false;
}

function familyOf(fruitId: string): string {
  return FRUIT_BY_ID[fruitId]?.family ?? '';
}

function isRenderable(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

function lerpSky(now: SkyState, goal: SkyState, k: number): void {
  now.skyTop.lerp(goal.skyTop, k);
  now.skyBottom.lerp(goal.skyBottom, k);
  now.fog.lerp(goal.fog, k);
  now.sunColor.lerp(goal.sunColor, k);
  now.hemiSky.lerp(goal.hemiSky, k);
  now.hemiGround.lerp(goal.hemiGround, k);
  now.ambientColor.lerp(goal.ambientColor, k);
  now.waterColor.lerp(goal.waterColor, k);
  now.sunIntensity += (goal.sunIntensity - now.sunIntensity) * k;
  now.hemiIntensity += (goal.hemiIntensity - now.hemiIntensity) * k;
  now.ambientIntensity += (goal.ambientIntensity - now.ambientIntensity) * k;
  now.note = goal.note;
}
