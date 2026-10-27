import { FRUIT_BY_ID } from '../data/fruits';
import { MONTHS } from '../data/spots';
import type { TimeKey } from '../data/types';
import { formatClock, hourNote, PRESET_MINUTES } from '../scene/palette';
import type { ToggleKey, World } from '../scene/world';
import { store } from '../state';
import { clear, el, must } from './dom';

function presetOf(minutes: number): TimeKey {
  const h = minutes / 60;
  if (h < 5) return 'night';
  if (h < 9) return 'dawn';
  if (h < 17) return 'day';
  if (h < 20) return 'dusk';
  return 'night';
}

export function initHud(world: World): void {
  // ---- 圖層開關 ----
  const tgButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tg[data-toggle]'));
  for (const btn of tgButtons) {
    const key = btn.dataset.toggle as ToggleKey;
    btn.addEventListener('click', () => {
      const next = !store.state.toggles[key];
      store.set({ toggles: { ...store.state.toggles, [key]: next } });
    });
  }

  store.on(['toggles'], (s) => {
    for (const btn of tgButtons) {
      const key = btn.dataset.toggle as ToggleKey;
      btn.classList.toggle('is-on', s.toggles[key]);
      btn.setAttribute('aria-pressed', String(s.toggles[key]));
    }
    const legend = must<HTMLElement>('#legend');
    legend.hidden = !s.toggles.flows;
  });

  // ---- 時段 ----
  const timeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.seg [data-time]'));
  for (const btn of timeButtons) {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.time as TimeKey;
      store.set({ preset, minutes: PRESET_MINUTES[preset], playing: false });
    });
  }

  // ---- 一天的滑桿 ----
  const slider = must<HTMLInputElement>('#day');
  const clock = must<HTMLOutputElement>('#clock');
  const dayNote = must<HTMLParagraphElement>('#day-note');
  const playBtn = must<HTMLButtonElement>('#day-play');

  slider.addEventListener('input', () => {
    const m = Number(slider.value);
    store.set({ minutes: m, preset: presetOf(m), playing: false });
  });

  playBtn.addEventListener('click', () => {
    store.set({ playing: !store.state.playing });
  });

  store.on(['minutes', 'playing', 'preset'], (s) => {
    if (document.activeElement !== slider) slider.value = String(Math.round(s.minutes));
    clock.textContent = formatClock(s.minutes);
    dayNote.textContent = hourNote(s.minutes);
    playBtn.textContent = s.playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', s.playing ? '暫停一天' : '播放一天');
    for (const btn of timeButtons) {
      btn.classList.toggle('is-on', btn.dataset.time === s.preset);
    }
  });

  // ---- 工具列 ----
  must<HTMLButtonElement>('#home').addEventListener('click', () => {
    store.set({ islandId: null, spotId: null, cardOpen: false });
    world.resetView();
  });

  must<HTMLButtonElement>('#sidebar-toggle').addEventListener('click', () => {
    store.set({ sidebarOpen: !store.state.sidebarOpen });
  });

  must<HTMLButtonElement>('#mobile-close').addEventListener('click', () => {
    store.set({ sidebarOpen: false });
  });

  must<HTMLButtonElement>('#sheet-handle').addEventListener('click', () => {
    must<HTMLElement>('#sidebar').classList.toggle('is-expanded');
  });

  must<HTMLButtonElement>('#mob-time').addEventListener('click', () => {
    must<HTMLElement>('.controls').classList.toggle('is-open');
  });

  must<HTMLButtonElement>('#help').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('fruit-atlas:intro'));
  });

  // ---- 控制面板分頁 ----
  const ctlTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.control-tabs [data-panel]'));
  for (const tab of ctlTabs) {
    tab.addEventListener('click', () => {
      for (const t of ctlTabs) {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      }
      for (const p of Array.from(document.querySelectorAll<HTMLElement>('.panel'))) {
        p.classList.toggle('active', p.id === `panel-${tab.dataset.panel}`);
      }
    });
  }

  buildSeasonButtons();
  buildFamilyButtons();
}

function buildSeasonButtons(): void {
  const host = must<HTMLElement>('#season-buttons');
  clear(host);

  const all = el('button', 'sbtn', '全年');
  all.addEventListener('click', () => store.set({ month: null }));
  host.append(all);

  for (let m = 1; m <= 12; m++) {
    const btn = el('button', 'sbtn', MONTHS[m - 1]);
    btn.addEventListener('click', () => {
      const cur = store.state.month;
      store.set({ month: cur === m ? null : m });
    });
    host.append(btn);
  }

  store.on(['month'], (s) => {
    all.classList.toggle('is-on', s.month === null);
    Array.from(host.querySelectorAll<HTMLButtonElement>('.sbtn'))
      .slice(1)
      .forEach((btn, i) => btn.classList.toggle('is-on', s.month === i + 1));
  });
}

function buildFamilyButtons(): void {
  const host = must<HTMLElement>('#family-buttons');
  clear(host);

  const families = Array.from(new Set(Object.values(FRUIT_BY_ID).map((f) => f.family))).sort();
  for (const fam of families) {
    const btn = el('button', 'fbtn', fam.replace(/\s+/g, ' '));
    btn.addEventListener('click', () => {
      const cur = new Set(store.state.families);
      if (cur.has(fam)) cur.delete(fam);
      else cur.add(fam);
      store.set({ families: Array.from(cur) });
    });
    host.append(btn);
  }

  store.on(['families'], (s) => {
    const set = new Set(s.families);
    Array.from(host.querySelectorAll<HTMLButtonElement>('.fbtn')).forEach((btn, i) => {
      btn.classList.toggle('is-on', set.has(families[i]));
    });
  });
}
