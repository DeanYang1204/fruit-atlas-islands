import {
  ALL_ISLANDS,
  ALL_SPOTS,
  ALL_SPOT_BY_ID,
  ISLANDS,
  ISLAND_FRUIT_BY_ID,
  MAIN_ISLAND_IDS,
  MONTHS,
  islandName,
  isMainIsland,
} from '../data/atlas';
import { RESIDENTS, RESIDENTS_BY_ISLAND } from '../data/residents';
import type { Island } from '../data/spots';
import type { Resident, Spot } from '../data/types';
import { store, type AppState } from '../state';
import { clear, el, must } from './dom';

const TAB_IDS = {
  islands: '#tab-islands',
  spots: '#tab-spots',
  residents: '#tab-residents',
  season: '#tab-season',
} as const;

function spotHaystack(spot: Spot): string {
  return [spot.title, spot.lead, ...spot.points, ...spot.keywords].join(' ').toLowerCase();
}

function islandHaystack(island: Island): string {
  const f = island.fruit;
  return [f.name, f.alias, f.en, f.sci, f.family, ...f.regions.map((r) => r.name), ...f.varieties.map((v) => v.name)]
    .join(' ')
    .toLowerCase();
}

function progressOf(island: Island, visited: Set<string>): { done: number; total: number } {
  let done = 0;
  for (const spot of island.spots) if (visited.has(spot.id)) done++;
  return { done, total: island.spots.length };
}

export function initSidebar(): void {
  const host = must<HTMLDivElement>('#tree');
  const search = must<HTMLInputElement>('#search');

  search.addEventListener('input', () => store.set({ query: search.value.trim() }));

  (Object.keys(TAB_IDS) as (keyof typeof TAB_IDS)[]).forEach((tab) => {
    must<HTMLButtonElement>(TAB_IDS[tab]).addEventListener('click', () => store.set({ tab }));
  });

  host.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    const action = btn?.dataset.action;
    const id = btn?.dataset.id;
    if (!action || !id) return;

    if (action === 'island') {
      store.set({ islandId: id, spotId: null, residentId: null, cardOpen: true });
      store.pushLog({ islandId: id, spotId: null, text: `抵達「${islandName(id)}」島` });
      return;
    }

    if (action === 'resident') {
      const resident = RESIDENTS.find((r) => r.id === id);
      if (!resident) return;
      store.set({ islandId: resident.islandId, spotId: null, residentId: id, cardOpen: true });
      store.markMet(id);
      store.pushLog({ islandId: resident.islandId, spotId: null, text: `遇見 ${resident.name}` });
      return;
    }

    const spot = ALL_SPOT_BY_ID[id];
    if (!spot) return;
    store.set({ islandId: spot.fruitId, spotId: id, residentId: null, cardOpen: true });
    store.markVisited(id);
    store.pushLog({
      islandId: spot.fruitId,
      spotId: id,
      text: `${islandName(spot.fruitId)}｜${spot.title}`,
    });
  });

  store.on(['tab', 'query', 'islandId', 'spotId', 'residentId', 'visited', 'met', 'month', 'families'], (s) =>
    render(s, host),
  );
  render(store.state, host);
}

function render(s: AppState, host: HTMLElement): void {
  (Object.keys(TAB_IDS) as (keyof typeof TAB_IDS)[]).forEach((tab) => {
    must<HTMLButtonElement>(TAB_IDS[tab]).classList.toggle('active', s.tab === tab);
  });

  clear(host);
  const q = s.query.toLowerCase();
  const visited = new Set(s.visited);
  const met = new Set(s.met);

  if (s.tab === 'islands') renderIslands(host, q, s, visited);
  else if (s.tab === 'spots') renderSpots(host, q, visited);
  else if (s.tab === 'residents') renderResidents(host, q, s, met);
  else renderSeason(host, q, visited);
}

/** 居民頁籤：兩座主島的北農員工在前，其後是各水果島的品種化身 */
function renderResidents(host: HTMLElement, q: string, s: AppState, met: Set<string>): void {
  const order = [...MAIN_ISLAND_IDS, ...ISLANDS.map((i) => i.fruit.id)];
  let found = 0;

  for (const islandId of order) {
    const people = RESIDENTS_BY_ISLAND[islandId];
    if (!people || people.length === 0) continue;
    const visible = people.filter((r) => !q || residentHaystack(r).includes(q));
    if (visible.length === 0) continue;
    found += visible.length;

    const done = people.filter((r) => met.has(r.id)).length;
    const head = el('div', 'res-head');
    head.append(
      el('b', undefined, isMainIsland(islandId) ? `${islandName(islandId)}・北農員工` : `${islandName(islandId)}島`),
      el('span', undefined, `${done}/${people.length}`),
    );
    host.append(head);

    const row = el('div', 'res-row');
    for (const r of visible) {
      const btn = el('button', 'person' + (r.boss ? ' is-boss' : ''));
      btn.dataset.action = 'resident';
      btn.dataset.id = r.id;
      btn.style.setProperty('--c', r.color);
      if (met.has(r.id)) btn.classList.add('is-met');
      if (s.residentId === r.id) btn.classList.add('is-active');
      btn.append(
        el('em', undefined, r.boss ? '★' : '●'),
        el('span', undefined, r.name),
        // 名字已含品種與水果（例：金鑽 鳳梨），這格只留「已認識」記號
        el('i', undefined, met.has(r.id) ? '✓' : ''),
      );
      row.append(btn);
    }
    host.append(row);
  }

  if (found === 0) host.append(emptyState('沒有符合的居民，換個關鍵字試試'));
}

function residentHaystack(r: Resident): string {
  return [r.name, r.short, r.role, r.lead, ...r.points, ...r.keywords].join(' ').toLowerCase();
}

/** 島嶼清單（兩座主島在最前） */
function renderIslands(host: HTMLElement, q: string, s: AppState, visited: Set<string>): void {
  let found = 0;
  for (const island of ALL_ISLANDS) {
    const hay = islandHaystack(island) + ' ' + island.spots.map((sp) => sp.title).join(' ');
    if (q && !hay.includes(q)) continue;
    found++;

    const { done, total } = progressOf(island, visited);
    const expanded = q.length > 0 || s.islandId === island.fruit.id;

    const btn = el('button', 'node node-island');
    btn.dataset.action = 'island';
    btn.dataset.id = island.fruit.id;
    btn.setAttribute('aria-expanded', String(expanded));
    btn.style.setProperty('--c', island.fruit.color);

    const dot = el('span', 'dot');
    dot.style.background = island.fruit.color;

    const main = el('span', 'node-main');
    main.append(el('b', undefined, island.fruit.name), el('i', undefined, island.fruit.alias));

    const prog = el('span', 'prog');
    const fill = el('em');
    fill.style.width = `${total > 0 ? (done / total) * 100 : 0}%`;
    prog.append(fill);

    btn.append(dot, main, prog, el('span', 'count', `${done}/${total}`));
    host.append(btn);

    if (expanded) {
      const kids = el('div', 'kids');
      for (const spot of island.spots) {
        if (q && !spotHaystack(spot).includes(q) && !hay.includes(q)) continue;
        kids.append(spotButton(spot, visited));
      }
      host.append(kids);
    }
  }

  if (found === 0) host.append(emptyState('沒有符合的水果，換個關鍵字試試'));
}

function renderSpots(host: HTMLElement, q: string, visited: Set<string>): void {
  let found = 0;
  for (const spot of ALL_SPOTS) {
    if (q && !spotHaystack(spot).includes(q)) continue;
    found++;
    host.append(spotButton(spot, visited));
  }
  if (found === 0) host.append(emptyState('沒有符合的知識點，換個關鍵字試試'));
}

function renderSeason(host: HTMLElement, q: string, visited: Set<string>): void {
  let found = 0;
  for (let m = 1; m <= 12; m++) {
    const list = ISLANDS.filter((i) => i.fruit.peak.includes(m));
    const visible = list.filter((i) => !q || islandHaystack(i).includes(q));
    if (visible.length === 0) continue;
    found += visible.length;

    const head = el('div', 'month-head');
    head.append(el('b', undefined, MONTHS[m - 1]), el('span', undefined, `${visible.length} 種當令`));
    host.append(head);

    const row = el('div', 'month-row');
    for (const island of visible) {
      const chip = el('button', 'chip');
      chip.dataset.action = 'island';
      chip.dataset.id = island.fruit.id;
      chip.style.setProperty('--c', island.fruit.color);
      chip.classList.toggle('is-done', progressOf(island, visited).done === island.spots.length);
      chip.append(el('span', 'dot'), el('span', undefined, island.fruit.name));
      row.append(chip);
    }
    host.append(row);
  }
  if (found === 0) host.append(emptyState('沒有符合的產季結果'));
}

function spotButton(spot: Spot, visited: Set<string>): HTMLElement {
  const btn = el('button', 'node node-spot');
  btn.dataset.action = 'spot';
  btn.dataset.id = spot.id;
  const done = visited.has(spot.id);
  if (done) btn.classList.add('is-done');
  btn.style.setProperty('--c', spot.kind === 'market' ? '#2F6690' : spot.kind === 'org' ? '#3D5A80' : spot.kind === 'rule' ? '#B4472E' : ISLAND_FRUIT_BY_ID[spot.fruitId]?.color ?? '#E8871A');
  btn.append(el('em', undefined, spot.mark ?? '•'), el('span', undefined, spot.title));
  if (done) btn.append(el('span', 'ok', '✓'));
  return btn;
}

function emptyState(text: string): HTMLElement {
  return el('p', 'empty', text);
}
