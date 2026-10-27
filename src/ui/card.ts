import { FRUIT_BY_ID } from '../data/fruits';
import { ISLAND_BY_FRUIT, MONTHS, SPOT_BY_ID } from '../data/spots';
import type { Fruit, Spot } from '../data/types';
import { store, type AppState } from '../state';
import { clear, el, must } from './dom';

export function initCard(): void {
  const card = must<HTMLElement>('#card');
  const content = must<HTMLDivElement>('#card-content');

  must<HTMLButtonElement>('#card-close').addEventListener('click', () => {
    store.set({ cardOpen: false, spotId: null });
  });

  must<HTMLButtonElement>('#card-handle').addEventListener('click', () => {
    card.classList.toggle('is-expanded');
  });

  content.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    const act = btn?.dataset.act;
    if (!act) return;

    const { islandId, spotId } = store.state;
    if (!islandId) return;
    const island = ISLAND_BY_FRUIT[islandId];
    if (!island) return;
    const idx = spotId ? island.spots.findIndex((s) => s.id === spotId) : -1;

    if (act === 'prev' && idx > 0) goSpot(island.spots[idx - 1]);
    else if (act === 'next' && idx >= 0 && idx < island.spots.length - 1) goSpot(island.spots[idx + 1]);
    else if (act === 'first') goSpot(island.spots[0]);
    else if (act === 'random') goSpot(island.spots[Math.floor(Math.random() * island.spots.length)]);
    else if (act === 'done' && spotId) store.markVisited(spotId);
  });

  store.on(['islandId', 'spotId', 'visited', 'cardOpen'], (s) => render(card, content, s));
  render(card, content, store.state);
}

function goSpot(spot: Spot): void {
  store.set({ islandId: spot.fruitId, spotId: spot.id, cardOpen: true });
  store.markVisited(spot.id);
  const fruit = FRUIT_BY_ID[spot.fruitId];
  store.pushLog({
    islandId: spot.fruitId,
    spotId: spot.id,
    text: `${fruit?.name ?? spot.fruitId}｜${spot.title}`,
  });
}

function render(card: HTMLElement, content: HTMLElement, s: AppState): void {
  const open = s.cardOpen && (!!s.islandId || !!s.spotId);
  card.hidden = !open;
  if (!open) return;

  clear(content);
  const spot = s.spotId ? SPOT_BY_ID[s.spotId] : undefined;
  const fruit = s.islandId ? FRUIT_BY_ID[s.islandId] : undefined;

  if (spot && fruit) renderSpot(content, spot, fruit, s);
  else if (fruit) renderIsland(content, fruit, s);

  card.scrollTop = 0;
}

function renderSpot(content: HTMLElement, spot: Spot, fruit: Fruit, s: AppState): void {
  const island = ISLAND_BY_FRUIT[fruit.id];
  const idx = island ? island.spots.findIndex((x) => x.id === spot.id) : 0;
  const total = island ? island.spots.length : 0;
  const done = s.visited.includes(spot.id);

  const head = el('div', 'card-head');
  head.style.setProperty('--c', fruit.color);
  const kind = el('span', 'kind');
  kind.textContent = kindLabel(spot);
  head.append(kind, el('h2', undefined, spot.title), el('p', 'lead', spot.lead));
  content.append(head);

  if (spot.months) content.append(calendar(spot.months, fruit.color));

  const ul = el('ul', 'pts');
  for (const p of spot.points) {
    const li = el('li');
    li.textContent = p;
    ul.append(li);
  }
  content.append(ul);

  const nav = el('div', 'card-nav');
  nav.textContent = `${fruit.name}・第 ${idx + 1} / ${total} 個知識點`;
  content.append(nav);

  const actions = el('div', 'card-actions');
  const prev = el('button', 'btn', '← 上一點');
  prev.dataset.act = 'prev';
  prev.disabled = idx <= 0;

  const next = el('button', 'btn primary', '下一點 →');
  next.dataset.act = 'next';
  next.disabled = idx >= total - 1;

  const doneBtn = el('button', 'btn ghost', done ? '✓ 已學會' : '標記學會');
  doneBtn.dataset.act = 'done';
  doneBtn.disabled = done;

  actions.append(prev, doneBtn, next);
  content.append(actions);
}

function renderIsland(content: HTMLElement, fruit: Fruit, s: AppState): void {
  const island = ISLAND_BY_FRUIT[fruit.id];
  const head = el('div', 'card-head');
  head.style.setProperty('--c', fruit.color);
  head.append(
    el('span', 'kind', '水果島'),
    el('h2', undefined, fruit.name),
    el('p', 'sub', `${fruit.en}・${fruit.sci}`),
    el('p', 'lead', fruit.tagline),
  );
  content.append(head);

  content.append(calendar(fruit.peak, fruit.color));

  const dl = el('dl', 'facts');
  addFact(dl, '別名', fruit.alias);
  addFact(dl, '科別', fruit.family);
  addFact(dl, '產季', fruit.harvestNote);
  addFact(dl, '主要產地', fruit.regions.map((r) => r.name).join('、'));
  addFact(dl, '代表品種', fruit.varieties.map((v) => v.name).join('、'));
  content.append(dl);

  const actions = el('div', 'card-actions');
  const first = el('button', 'btn primary', '開始第一個知識點');
  first.dataset.act = 'first';
  const rand = el('button', 'btn', '隨機來一個');
  rand.dataset.act = 'random';
  actions.append(first, rand);
  content.append(actions);

  const done = island ? island.spots.filter((sp) => s.visited.includes(sp.id)).length : 0;
  const nav = el('div', 'card-nav');
  nav.textContent = `已學 ${done} / ${island?.spots.length ?? 0} 個知識點`;
  content.append(nav);
}

function addFact(dl: HTMLElement, label: string, value: string): void {
  const dt = el('dt', undefined, label);
  const dd = el('dd', undefined, value);
  dl.append(dt, dd);
}

function calendar(months: number[], color: string): HTMLElement {
  const wrap = el('div', 'cal');
  const set = new Set(months);
  for (let m = 1; m <= 12; m++) {
    const cell = el('span', 'cal-cell');
    if (set.has(m)) {
      cell.classList.add('on');
      cell.style.background = color;
    }
    cell.textContent = String(m);
    wrap.append(cell);
  }
  const note = el('p', 'cal-note', `盛產｜${months.map((m) => MONTHS[m - 1]).join('、')}`);
  const box = el('div', 'cal-wrap');
  box.append(wrap, note);
  return box;
}

function kindLabel(spot: Spot): string {
  const map: Record<Spot['kind'], string> = {
    basics: '基本檔案',
    season: '產季月曆',
    origin: '產地巡禮',
    variety: '品種圖譜',
    pick: '挑選保存',
    nutrition: '營養密碼',
    trivia: '冷知識',
    market: '北農檔案',
  };
  return map[spot.kind] ?? '知識點';
}
