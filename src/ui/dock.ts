import { ALL_ISLANDS, islandName } from '../data/atlas';
import { RESIDENTS_BY_ISLAND } from '../data/residents';
import { store } from '../state';
import { clear, el, must } from './dom';

export function initDock(): void {
  const dock = must<HTMLElement>('#dock');
  clear(dock);

  for (const island of ALL_ISLANDS) {
    const fruit = island.fruit;
    const isPolicy = fruit.id === 'policy';
    const btn = el('button', 'dock-item' + (isPolicy ? ' is-policy' : ''));
    btn.dataset.fruit = fruit.id;
    btn.title = `${fruit.name}｜${fruit.tagline}`;
    btn.style.setProperty('--c', fruit.color);
    btn.append(el('span', 'dot'), el('span', 'dock-name', fruit.name));
    btn.addEventListener('click', () => {
      store.set({ islandId: fruit.id, spotId: null, residentId: null, cardOpen: true });
      store.pushLog({ islandId: fruit.id, spotId: null, text: `前往「${islandName(fruit.id)}」島` });
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
