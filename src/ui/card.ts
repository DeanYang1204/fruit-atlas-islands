import { ALL_ISLAND_BY_ID, ALL_SPOT_BY_ID, ISLAND_FRUIT_BY_ID, islandName, MONTHS } from '../data/atlas';
import { RESIDENT_BY_ID, RESIDENTS_BY_ISLAND } from '../data/residents';
import type { Fruit, Resident, Spot } from '../data/types';
import { store, type AppState } from '../state';
import { clear, el, must } from './dom';

export function initCard(): void {
  const card = must<HTMLElement>('#card');
  const content = must<HTMLDivElement>('#card-content');

  must<HTMLButtonElement>('#card-close').addEventListener('click', () => {
    store.set({ cardOpen: false, spotId: null, residentId: null });
  });

  must<HTMLButtonElement>('#card-handle').addEventListener('click', () => {
    card.classList.toggle('is-expanded');
  });

  content.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    const act = btn?.dataset.act;
    if (!act) return;

    const { islandId, spotId, residentId } = store.state;
    if (!islandId) return;
    const island = ALL_ISLAND_BY_ID[islandId];
    if (!island) return;
    const idx = spotId ? island.spots.findIndex((s) => s.id === spotId) : -1;

    if (act === 'prev' && idx > 0) goSpot(island.spots[idx - 1]);
    else if (act === 'next' && idx >= 0 && idx < island.spots.length - 1) goSpot(island.spots[idx + 1]);
    else if (act === 'first') goSpot(island.spots[0]);
    else if (act === 'random') goSpot(island.spots[Math.floor(Math.random() * island.spots.length)]);
    else if (act === 'done' && spotId) store.markVisited(spotId);
    else if (act === 'met' && residentId) store.markMet(residentId);
    else if (act === 'home-island') store.set({ spotId: null, residentId: null, cardOpen: true });
    else if (act === 'resident' && btn?.dataset.id) goResident(btn.dataset.id);
  });

  store.on(['islandId', 'spotId', 'residentId', 'visited', 'met', 'cardOpen'], (s) =>
    render(card, content, s),
  );
  render(card, content, store.state);
}

function goResident(residentId: string): void {
  const resident = RESIDENT_BY_ID[residentId];
  if (!resident) return;
  store.set({ islandId: resident.islandId, spotId: null, residentId, cardOpen: true });
  store.markMet(residentId);
  store.pushLog({
    islandId: resident.islandId,
    spotId: null,
    text: `${islandName(resident.islandId)}｜遇見 ${resident.name}`,
  });
}

function goSpot(spot: Spot): void {
  store.set({ islandId: spot.fruitId, spotId: spot.id, residentId: null, cardOpen: true });
  store.markVisited(spot.id);
  store.pushLog({
    islandId: spot.fruitId,
    spotId: spot.id,
    text: `${islandName(spot.fruitId)}｜${spot.title}`,
  });
}

function render(card: HTMLElement, content: HTMLElement, s: AppState): void {
  const open = s.cardOpen && (!!s.islandId || !!s.spotId || !!s.residentId);
  card.hidden = !open;
  if (!open) return;

  clear(content);
  const resident = s.residentId ? RESIDENT_BY_ID[s.residentId] : undefined;
  const spot = s.spotId ? ALL_SPOT_BY_ID[s.spotId] : undefined;
  const fruit = s.islandId ? ISLAND_FRUIT_BY_ID[s.islandId] : undefined;

  if (resident && fruit) renderResident(content, resident, fruit, s);
  else if (spot && fruit) renderSpot(content, spot, fruit, s);
  else if (fruit) renderIsland(content, fruit, s);

  card.scrollTop = 0;
}

/** 島上居民（水果品種化身／北農員工）的詳細資料 */
function renderResident(content: HTMLElement, r: Resident, islandFruit: Fruit, s: AppState): void {
  const head = el('div', 'card-head');
  head.style.setProperty('--c', r.color);
  const kind = el('span', 'kind', r.boss ? 'BOSS' : r.kind === 'staff' ? '北農員工' : '水果居民');
  const homeLabel = islandFruit.name.endsWith('島') ? islandFruit.name : `${islandFruit.name}島`;
  head.append(
    kind,
    el('h2', undefined, r.name),
    el('p', 'sub', `${r.role}｜住在${homeLabel}`),
    el('p', 'lead', r.lead),
  );
  content.append(head);

  const ul = el('ul', 'pts');
  for (const p of r.points) {
    const li = el('li');
    li.textContent = p;
    ul.append(li);
  }
  content.append(ul);

  if (r.kind === 'variety') {
    const tip = el('p', 'card-tip', '提示｜同一座島上的居民是不同的品種，聊過一位就認識一個品種。');
    content.append(tip);
  }

  const actions = el('div', 'card-actions');
  const met = s.met.includes(r.id);
  const metBtn = el('button', 'btn ghost', met ? '✓ 已認識' : '打過招呼');
  metBtn.dataset.act = 'met';
  metBtn.disabled = met;
  const home = el('button', 'btn', `看${islandFruit.name}島`);
  home.dataset.act = 'home-island';
  actions.append(metBtn, home);
  content.append(actions);

  const nav = el('div', 'card-nav');
  nav.textContent = `已認識 ${s.met.length} 位居民`;
  content.append(nav);
}

function renderSpot(content: HTMLElement, spot: Spot, fruit: Fruit, s: AppState): void {
  const island = ALL_ISLAND_BY_ID[fruit.id];
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
  const island = ALL_ISLAND_BY_ID[fruit.id];
  const people = island ? RESIDENTS_BY_ISLAND[fruit.id] ?? [] : [];
  const isPolicy = fruit.id === 'policy';

  const head = el('div', 'card-head');
  head.style.setProperty('--c', fruit.color);
  head.append(
    el('span', 'kind', isPolicy ? '行政中樞' : '水果島'),
    el('h2', undefined, fruit.name),
    el('p', 'sub', `${fruit.en}・${fruit.sci}`),
    el('p', 'lead', fruit.tagline),
  );
  content.append(head);

  content.append(calendar(fruit.peak, fruit.color));

  const dl = el('dl', 'facts');
  addFact(dl, '別名', fruit.alias);
  addFact(dl, isPolicy ? '所屬體系' : '科別', fruit.family);
  addFact(dl, isPolicy ? '作業時間' : '產季', fruit.harvestNote);
  addFact(dl, isPolicy ? '主要場區' : '主要產地', fruit.regions.map((r) => r.name).join('、'));
  if (!isPolicy) addFact(dl, '代表品種', fruit.varieties.map((v) => v.name).join('、'));
  content.append(dl);

  const actions = el('div', 'card-actions');
  const first = el('button', 'btn primary', '開始第一個知識點');
  first.dataset.act = 'first';
  const rand = el('button', 'btn', '隨機來一個');
  rand.dataset.act = 'random';
  actions.append(first, rand);
  content.append(actions);

  // 島上居民一覽，點名字就能飛到他面前
  if (people.length > 0) {
    const peopleHead = el('div', 'people-head');
    peopleHead.append(el('b', undefined, isPolicy ? '島上的北農員工' : '島上的水果居民'));
    peopleHead.append(el('span', undefined, `${people.length} 位`));
    content.append(peopleHead);

    const list = el('div', 'people-list');
    for (const r of people) {
      const btn = el('button', 'person' + (r.boss ? ' is-boss' : ''));
      btn.dataset.act = 'resident';
      btn.dataset.id = r.id;
      btn.style.setProperty('--c', r.color);
      const met = s.met.includes(r.id);
      if (met) btn.classList.add('is-met');
      btn.append(
        el('em', undefined, r.boss ? '★' : '●'),
        el('span', undefined, r.name),
        el('i', undefined, met ? '✓' : r.short),
      );
      list.append(btn);
    }
    content.append(list);
  }

  const done = island ? island.spots.filter((sp) => s.visited.includes(sp.id)).length : 0;
  const nav = el('div', 'card-nav');
  nav.textContent = `已學 ${done} / ${island?.spots.length ?? 0} 個知識點　・　已認識 ${
    people.filter((r) => s.met.includes(r.id)).length
  } / ${people.length} 位居民`;
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
    org: '組織分工',
    rule: '拍賣制度',
  };
  return map[spot.kind] ?? '知識點';
}
