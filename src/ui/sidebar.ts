import { FRUIT_BY_ID } from '../data/fruits';
import { ISLANDS, MONTHS, SPOT_BY_ID, SPOTS, type Island } from '../data/spots';
import type { Spot } from '../data/types';
import { store, type AppState } from '../state';
import { clear, el, must } from './dom';

const TAB_IDS = {
  islands: '#tab-islands',
  spots: '#tab-spots',
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
      store.set({ islandId: id, spotId: null, cardOpen: true });
      store.pushLog({ islandId: id, spotId: null, text: `抵達「${FRUIT_BY_ID[id]?.name ?? id}」島` });
      return;
    }

    const spot = SPOT_BY_ID[id];
    if (!spot) return;
    const fruit = FRUIT_BY_ID[spot.fruitId];
    store.set({ islandId: spot.fruitId, spotId: id, cardOpen: true });
    store.markVisited(id);
    store.pushLog({
      islandId: spot.fruitId,
      spotId: id,
      text: `${fruit?.name ?? spot.fruitId}｜${spot.title}`,
    });
  });

  store.on(['tab', 'query', 'islandId', 'spotId', 'visited', 'month', 'families'], (s) => render(s, host));
  render(store.state, host);
}

function render(s: AppState, host: HTMLElement): void {
  (Object.keys(TAB_IDS) as (keyof typeof TAB_IDS)[]).forEach((tab) => {
    must<HTMLButtonElement>(TAB_IDS[tab]).classList.toggle('active', s.tab === tab);
  });

  clear(host);
  const q = s.query.toLowerCase();
  const visited = new Set(s.visited);

  if (s.tab === 'islands') renderIslands(host, q, s, visited);
  else if (s.tab === 'spots') renderSpots(host, q, visited);
  else renderSeason(host, q, visited);
}

function renderIslands(host: HTMLElement, q: string, s: AppState, visited: Set<string>): void {
  let found = 0;
  for (const island of ISLANDS) {
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
  for (const spot of SPOTS) {
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
  const fruit = FRUIT_BY_ID[spot.fruitId];
  btn.style.setProperty('--c', spot.kind === 'market' ? '#2F6690' : fruit?.color ?? '#E8871A');
  btn.append(el('em', undefined, spot.mark ?? '•'), el('span', undefined, spot.title));
  if (done) btn.append(el('span', 'ok', '✓'));
  return btn;
}

function emptyState(text: string): HTMLElement {
  return el('p', 'empty', text);
}
