import './styles.css';
import {
  ALL_ISLANDS,
  ALL_SPOT_BY_ID,
  MONTHS,
  TOTAL_ISLANDS,
  TOTAL_SPOTS,
  islandName,
} from './data/atlas';
import { RESIDENT_BY_ID, TOTAL_RESIDENTS } from './data/residents';
import type { TimeKey, ToggleKey } from './data/types';
import { formatClock, hourNote } from './scene/palette';
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
  return id === 'policy'
    ? '政策島｜這裡只有北農員工，沒有水果居民'
    : `${islandName(id)}島｜點果樹學知識，點路上的居民聊聊天`;
}

function updateStatus(s: AppState): void {
  const bits: string[] = [];
  if (s.islandId) bits.push(`目前：${islandName(s.islandId)}`);
  if (s.month) bits.push(`${MONTHS[s.month - 1]}當令`);
  if (s.families.length > 0) bits.push(`科別篩選 ${s.families.length}`);
  bits.push(`已學 ${s.visited.length} / ${TOTAL_SPOTS}`);
  bits.push(`居民 ${s.met.length} / ${TOTAL_RESIDENTS}`);
  statusEl.textContent = bits.join('　・　');
}

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
sideMeta.innerHTML = `${TOTAL_ISLANDS} 座水果島 ＋ 政策島　／<br>${TOTAL_SPOTS} 個知識點 ／ ${TOTAL_RESIDENTS} 位居民<br>選一座島，走進它的果園風景。`;

world.setTime(store.state.minutes);
world.setIslandFilter(store.state.month, store.state.families);
world.resetView();
world.start();

updateStatus(store.state);
updateMascot(null);
