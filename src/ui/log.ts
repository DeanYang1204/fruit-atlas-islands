import { FRUIT_BY_ID } from '../data/fruits';
import { ISLANDS, SPOT_BY_ID } from '../data/spots';
import { store, type AppState } from '../state';
import { clear, el, must } from './dom';

export function initLog(): void {
  const panel = must<HTMLElement>('#log');
  const overview = must<HTMLElement>('#overview-panel');
  const logBody = must<HTMLElement>('#log-body');
  const list = must<HTMLElement>('#log-list');
  const filter = must<HTMLSelectElement>('#log-filter');

  must<HTMLButtonElement>('#log-close').addEventListener('click', () => {
    store.set({ toggles: { ...store.state.toggles, log: false } });
  });

  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-logtab]'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const which = tab.dataset.logtab;
      for (const t of tabs) {
        const on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      }
      overview.hidden = which !== 'overview';
      logBody.hidden = which !== 'log';
    });
  }

  buildFilterOptions(filter);
  filter.addEventListener('change', () => renderList(list, filter, store.state));

  store.on(['toggles', 'log', 'visited'], (s) => {
    panel.classList.toggle('is-open', s.toggles.log);
    renderOverview(overview, s);
    renderList(list, filter, s);
  });
}

function renderOverview(host: HTMLElement, s: AppState): void {
  clear(host);
  const visited = new Set(s.visited);

  const totalSpots = ISLANDS.reduce((n, i) => n + i.spots.length, 0);
  const doneIslands = ISLANDS.filter((i) => i.spots.every((sp) => visited.has(sp.id))).length;

  const grid = el('div', 'stat-grid');
  grid.append(
    stat('已解鎖水果島', `${doneIslands} / ${ISLANDS.length}`),
    stat('已學知識點', `${visited.size} / ${totalSpots}`),
    stat('完成度', `${Math.round((visited.size / totalSpots) * 100)}%`),
  );
  host.append(grid);

  const barWrap = el('div', 'prog-list');
  for (const island of ISLANDS) {
    const done = island.spots.filter((sp) => visited.has(sp.id)).length;
    const row = el('div', 'prog-row');
    row.style.setProperty('--c', island.fruit.color);
    row.append(el('span', 'prog-name', island.fruit.name));
    const bar = el('span', 'prog-bar');
    const fill = el('i');
    fill.style.width = `${(done / island.spots.length) * 100}%`;
    bar.append(fill);
    row.append(bar, el('span', 'prog-num', `${done}/${island.spots.length}`));
    barWrap.append(row);
  }
  host.append(barWrap);
}

function stat(label: string, value: string): HTMLElement {
  const box = el('div', 'stat');
  box.append(el('span', 'stat-v', value), el('span', 'stat-l', label));
  return box;
}

/** 篩選選單的選項是靜態的，建立一次即可 */
function buildFilterOptions(select: HTMLSelectElement): void {
  clear(select);
  const allOpt = el('option', undefined, '全部事件');
  allOpt.value = 'all';
  select.append(allOpt);
  for (const island of ISLANDS) {
    const opt = el('option', undefined, island.fruit.name);
    opt.value = island.fruit.id;
    select.append(opt);
  }
  select.value = 'all';
}

function renderList(list: HTMLElement, filter: HTMLSelectElement, s: AppState): void {
  clear(list);
  const which = filter.value || 'all';
  const entries = s.log.filter((e) => which === 'all' || e.islandId === which);

  if (entries.length === 0) {
    const li = el('li', 'log-empty', '還沒有紀錄。點選島上的果樹，就會開始累積你的圖鑑日誌。');
    list.append(li);
    return;
  }

  for (const e of entries) {
    const li = el('li', 'log-item');
    const fruit = e.islandId ? FRUIT_BY_ID[e.islandId] : undefined;
    if (fruit) li.style.setProperty('--c', fruit.color);

    const time = el('span', 'log-time', e.at);
    const text = el('span', 'log-text');
    text.textContent = e.text;

    const spot = e.spotId ? SPOT_BY_ID[e.spotId] : undefined;
    const kind = el('span', 'log-kind');
    kind.textContent = spot ? kindName(spot.kind) : '島嶼';

    li.append(time, kind, text);
    list.append(li);
  }
}

function kindName(kind: string): string {
  const map: Record<string, string> = {
    basics: '基本',
    season: '產季',
    origin: '產地',
    variety: '品種',
    pick: '挑選',
    nutrition: '營養',
    trivia: '冷知識',
    market: '北農',
  };
  return map[kind] ?? '知識';
}
