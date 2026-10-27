import { FRUIT_BY_ID } from '../data/fruits';
import { ISLANDS } from '../data/spots';
import { store } from '../state';
import { clear, el, must } from './dom';

export function initDock(): void {
  const dock = must<HTMLElement>('#dock');
  clear(dock);

  for (const island of ISLANDS) {
    const fruit = island.fruit;
    const btn = el('button', 'dock-item');
    btn.dataset.fruit = fruit.id;
    btn.title = `${fruit.name}｜${fruit.tagline}`;
    btn.style.setProperty('--c', fruit.color);
    btn.append(el('span', 'dot'), el('span', 'dock-name', fruit.name));
    btn.addEventListener('click', () => {
      store.set({ islandId: fruit.id, spotId: null, cardOpen: true });
      store.pushLog({ islandId: fruit.id, spotId: null, text: `前往「${FRUIT_BY_ID[fruit.id]?.name ?? fruit.id}」島` });
    });
    dock.append(btn);
  }

  const sync = (): void => {
    const id = store.state.islandId;
    for (const btn of Array.from(dock.querySelectorAll<HTMLButtonElement>('.dock-item'))) {
      btn.classList.toggle('is-active', btn.dataset.fruit === id);
      const fid = btn.dataset.fruit ?? '';
      const isl = ISLANDS.find((i) => i.fruit.id === fid);
      const done = isl ? isl.spots.filter((s) => store.state.visited.includes(s.id)).length : 0;
      btn.classList.toggle('is-done', !!isl && done === isl.spots.length);
    }
  };

  store.on(['islandId', 'visited'], sync);
  sync();
}
