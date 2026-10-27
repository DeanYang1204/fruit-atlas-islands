import { ALL_ISLANDS, islandLabelName, isMainIsland } from '../data/atlas';
import { RESIDENTS_BY_ISLAND } from '../data/residents';
import { store } from '../state';
import { clear, el, must } from './dom';

export function initDock(): void {
  const dock = must<HTMLElement>('#dock');
  clear(dock);

  for (const island of ALL_ISLANDS) {
    const fruit = island.fruit;
    const isMain = isMainIsland(fruit.id);
    const btn = el('button', 'dock-item' + (isMain ? ' is-policy' : ''));
    btn.dataset.fruit = fruit.id;
    btn.title = `${fruit.name}｜${fruit.tagline}`;
    btn.style.setProperty('--c', fruit.color);
    // 主島顯示全名（第一／第二果菜市場），水果島維持短名
    btn.append(el('span', 'dot'), el('span', 'dock-name', isMain ? fruit.name : fruit.name));
    btn.addEventListener('click', () => {
      store.set({ islandId: fruit.id, spotId: null, residentId: null, cardOpen: true });
      store.pushLog({ islandId: fruit.id, spotId: null, text: `前往「${islandLabelName(fruit.id)}」` });
    });
    dock.append(btn);
  }

  const sync = (): void => {
    const id = store.state.islandId;
    for (const btn of Array.from(dock.querySelectorAll<HTMLButtonElement>('.dock-item'))) {
      btn.classList.toggle('is-active', btn.dataset.fruit === id);
      const fid = btn.dataset.fruit ?? '';
      const isl = ALL_ISLANDS.find((i) => i.fruit.id === fid);
      const done = isl ? isl.spots.filter((s) => store.state.visited.includes(s.id)).length : 0;
      const people = RESIDENTS_BY_ISLAND[fid] ?? [];
      const met =
        people.length > 0 && people.every((r) => store.state.met.includes(r.id));
      btn.classList.toggle('is-done', !!isl && done === isl.spots.length && met);
    }
  };

  store.on(['islandId', 'visited', 'met'], sync);
  sync();
}
