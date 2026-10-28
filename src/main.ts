import './styles.css';
import {
  ALL_ISLANDS,
  ALL_SPOT_BY_ID,
  MAIN_ISLAND_IDS,
  MONTHS,
  TOTAL_ALL_ISLANDS,
  TOTAL_ALL_SPOTS,
  islandLabelName,
  islandName,
  isMainIsland,
} from './data/atlas';
import { RESIDENT_BY_ID, TOTAL_RESIDENTS } from './data/residents';
import type { TimeKey, ToggleKey, WeatherKey } from './data/types';
import { formatClock, hourNote, nightFactor } from './scene/palette';
import { World } from './scene/world';
import { store, type AppState } from './state';
import { initCard } from './ui/card';
import { initDock } from './ui/dock';
import { must } from './ui/dom';
import { initHud } from './ui/hud';
import { initIntro } from './ui/intro';
import { initLog } from './ui/log';
import { initSidebar } from './ui/sidebar';

const stage = must<HTMLElement>('#stage');
const loading = must<HTMLElement>('#loading');
const mascotText = must<HTMLElement>('#mascot-text');
const statusEl = must<HTMLElement>('#status');
const clockEl = must<HTMLOutputElement>('#clock');
const dayNoteEl = must<HTMLParagraphElement>('#day-note');
const daySlider = must<HTMLInputElement>('#day');

let firstFrame = true;

function presetOf(minutes: number): TimeKey {
  const h = minutes / 60;
  if (h < 5) return 'night';
  if (h < 9) return 'dawn';
  if (h < 17) return 'day';
  if (h < 20) return 'dusk';
  return 'night';
}

function updateMascot(hoverSpotId: string | null, hoverResidentId: string | null = null): void {
  const s = store.state;
  if (hoverResidentId) {
    const r = RESIDENT_BY_ID[hoverResidentId];
    mascotText.textContent = r ? `${r.name}｜${r.role}` : '路上有人在走，點他看看';
    return;
  }
  if (hoverSpotId) {
    const spot = ALL_SPOT_BY_ID[hoverSpotId];
    mascotText.textContent = spot ? `${islandName(spot.fruitId)}｜${spot.title}` : '點一格，開始探索';
    return;
  }
  if (s.residentId) {
    const r = RESIDENT_BY_ID[s.residentId];
    mascotText.textContent = r ? `跟 ${r.name} 聊過了` : '路上有人在走，點他看看';
    return;
  }
  if (s.spotId) {
    const spot = ALL_SPOT_BY_ID[s.spotId];
    mascotText.textContent = spot ? `正在看：${spot.title}` : '點一格，開始探索';
    return;
  }
  if (s.islandId) {
    mascotText.textContent = islandHint(s.islandId);
  } else mascotText.textContent = '果籽 · 點一格，開始探索';
}

function islandHint(id: string): string {
  return isMainIsland(id)
    ? `${islandName(id)}｜住的是北農的員工，吳總也從這裡出發巡島`
    : `${islandName(id)}島｜點果樹學知識，點路上的居民聊聊天`;
}

function updateStatus(s: AppState): void {
  const bits: string[] = [];
  if (s.islandId) bits.push(`目前：${islandLabelName(s.islandId)}`);
  if (s.month) bits.push(`${MONTHS[s.month - 1]}當令`);
  if (s.families.length > 0) bits.push(`科別篩選 ${s.families.length}`);
  const weatherLabel = WEATHER_LABEL[s.weather];
  if (s.weather !== 'clear') bits.push(`天氣：${weatherLabel}`);
  bits.push(`已學 ${s.visited.length} / ${TOTAL_ALL_SPOTS}`);
  bits.push(`居民 ${s.met.length} / ${TOTAL_RESIDENTS}`);
  // 吳總巡視到哪一島
  if (s.bossIslandId) bits.push(`吳總在：${islandLabelName(s.bossIslandId)}`);
  statusEl.textContent = bits.join('　・　');
}

const WEATHER_LABEL: Record<WeatherKey, string> = {
  clear: '晴',
  cloudy: '陰',
  rain: '雨',
};

const world = new World(stage, {
  onHoverSpot: (id) => {
    store.set({ hoverSpotId: id });
    updateMascot(id);
  },
  onHoverResident: (id) => {
    store.set({ hoverResidentId: id });
    if (id) updateMascot(null, id);
    else updateMascot(store.state.hoverSpotId);
  },
  onSelectSpot: (id) => {
    const spot = ALL_SPOT_BY_ID[id];
    if (!spot) return;
    store.set({ islandId: spot.fruitId, spotId: id, residentId: null, cardOpen: true });
    store.markVisited(id);
    store.pushLog({ islandId: spot.fruitId, spotId: id, text: `${islandName(spot.fruitId)}｜${spot.title}` });
    updateMascot(id);
  },
  onSelectIsland: (fruitId) => {
    store.set({ islandId: fruitId, spotId: null, residentId: null, cardOpen: true });
    store.pushLog({ islandId: fruitId, spotId: null, text: `抵達「${islandName(fruitId)}」島` });
    updateMascot(null);
  },
  onSelectResident: (id) => {
    const resident = RESIDENT_BY_ID[id];
    if (!resident) return;
    store.set({ islandId: resident.islandId, spotId: null, residentId: id, cardOpen: true });
    store.markMet(id);
    store.pushLog({ islandId: resident.islandId, spotId: null, text: `遇見 ${resident.name}` });
    updateMascot(null, id);
  },
  onBossIsland: (fruitId) => {
    store.set({ bossIslandId: fruitId });
    updateStatus(store.state);
  },
  onFrame: () => {
    if (firstFrame) {
      firstFrame = false;
      loading.classList.add('is-done');
      window.setTimeout(() => {
        loading.hidden = true;
      }, 620);
    }
    if (store.state.playing) {
      const next = (store.state.minutes + 0.9) % 1440;
      store.set({ minutes: next, preset: presetOf(next) });
    }
  },
});

initSidebar();
initCard();
initDock();
initHud(world);
initLog();
initIntro();

// ---- 狀態 → 3D 世界同步 ----

store.on(['islandId', 'spotId', 'residentId'], (s) => {
  world.select(s.islandId, s.spotId, s.residentId);
  if (s.residentId) world.focusResident(s.residentId);
  else if (s.spotId) world.focusSpot(s.spotId);
  else if (s.islandId) world.focusIsland(s.islandId);
  updateStatus(s);
  updateMascot(null);
});

store.on(['minutes'], (s) => {
  world.setTime(s.minutes);
  if (document.activeElement !== daySlider) daySlider.value = String(Math.round(s.minutes));
  clockEl.textContent = formatClock(s.minutes);
  dayNoteEl.textContent = hourNote(s.minutes);
  // 入夜時整座介面跟著換成夜色（暗角、面板配色）
  document.body.classList.toggle('is-night', nightFactor(s.minutes) > 0.5);
});

let prevToggles: Record<ToggleKey, boolean> = { ...store.state.toggles };
store.on(['toggles'], (s) => {
  for (const key of Object.keys(s.toggles) as ToggleKey[]) {
    if (prevToggles[key] !== s.toggles[key]) world.setToggle(key, s.toggles[key]);
  }
  prevToggles = { ...s.toggles };
});

store.on(['month', 'families'], (s) => {
  world.setIslandFilter(s.month, s.families);
  updateStatus(s);
});

store.on(['weather'], (s) => {
  world.setWeather(s.weather);
  updateStatus(s);
});

store.on(['visited', 'met'], (s) => updateStatus(s));

store.on(['sidebarOpen'], (s) => {
  document.body.classList.toggle('sidebar-open', s.sidebarOpen);
});

// ---- 自動導覽 ----

const tourCaption = must<HTMLElement>('#tour-caption');
const tourControls = must<HTMLElement>('.tour-controls');
const tourTime = must<HTMLElement>('#tour-time');
const tourStart = must<HTMLButtonElement>('#tour-start');
const tourPause = must<HTMLElement>('#tour-pause');
const tourExit = must<HTMLElement>('#tour-exit');

let tourTimer: number | null = null;

function clearTourTimer(): void {
  if (tourTimer !== null) {
    window.clearTimeout(tourTimer);
    tourTimer = null;
  }
}

function runTourStep(): void {
  clearTourTimer();
  const i = store.state.tourIndex;
  if (i === null) return;
  if (i >= ALL_ISLANDS.length) {
    stopTour();
    return;
  }

  const island = ALL_ISLANDS[i];
  store.set({ islandId: island.fruit.id, spotId: null, residentId: null, cardOpen: true });
  tourCaption.textContent = `${String(i + 1).padStart(2, '0')} / ${ALL_ISLANDS.length}　${island.fruit.name}｜${island.fruit.tagline}`;
  tourTime.textContent = `${String(i + 1).padStart(2, '0')} / ${ALL_ISLANDS.length}`;
  tourPause.textContent = '暫停';

  if (store.state.tourPlaying) {
    tourTimer = window.setTimeout(() => {
      store.set({ tourIndex: (store.state.tourIndex ?? 0) + 1 });
      runTourStep();
    }, 5200);
  }
}

function startTour(): void {
  store.set({ tourIndex: 0, tourPlaying: true });
  tourControls.classList.add('is-open');
  tourCaption.classList.add('is-open');
  runTourStep();
}

function stopTour(): void {
  clearTourTimer();
  store.set({ tourIndex: null, tourPlaying: false });
  tourControls.classList.remove('is-open');
  tourCaption.classList.remove('is-open');
  updateStatus(store.state);
}

tourStart.addEventListener('click', () => {
  if (store.state.tourIndex === null) startTour();
  else stopTour();
});

tourPause.addEventListener('click', () => {
  if (store.state.tourIndex === null) return;
  const playing = !store.state.tourPlaying;
  store.set({ tourPlaying: playing });
  if (playing) runTourStep();
  else {
    clearTourTimer();
    tourPause.textContent = '繼續';
  }
});

tourExit.addEventListener('click', stopTour);

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === 'Escape') {
    store.set({ cardOpen: false, spotId: null, residentId: null, sidebarOpen: false, logOpen: false });
    store.set({ toggles: { ...store.state.toggles, log: false } });
    if (store.state.tourIndex !== null) stopTour();
  }
});

// ---- 初始化顯示 ----

const sideMeta = must<HTMLElement>('#side-meta');
const fruitIslandCount = ALL_ISLANDS.length - MAIN_ISLAND_IDS.length;
sideMeta.innerHTML = `${fruitIslandCount} 座水果島 ＋ ${MAIN_ISLAND_IDS.length} 座主島（第一／第二果菜市場）<br>${TOTAL_ALL_SPOTS} 個知識點 ／ ${TOTAL_RESIDENTS} 位居民在路上走<br>大家都用橋互通，走到哪學到哪。`;

// 頁籤上的數字（島數／知識點數／居民數）直接由資料算出來，不用手改
const tabCounts: { id: string; count: number }[] = [
  { id: '#tab-islands', count: TOTAL_ALL_ISLANDS },
  { id: '#tab-spots', count: TOTAL_ALL_SPOTS },
  { id: '#tab-residents', count: TOTAL_RESIDENTS },
];
for (const t of tabCounts) {
  const node = document.querySelector<HTMLButtonElement>(t.id);
  if (node) node.textContent = `${node.textContent?.split(' ')[0] ?? ''} ${t.count}`;
}

world.setTime(store.state.minutes);
world.setIslandFilter(store.state.month, store.state.families);
world.resetView();
world.start();

updateStatus(store.state);
updateMascot(null);
