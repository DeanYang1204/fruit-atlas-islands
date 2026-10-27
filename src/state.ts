import type { TimeKey, ToggleKey } from './data/types';

export interface LogEntry {
  id: number;
  at: string;
  islandId: string | null;
  spotId: string | null;
  text: string;
}

export type SidebarTab = 'islands' | 'spots' | 'season';

export interface AppState {
  /** 目前選取的島（水果 id） */
  islandId: string | null;
  /** 目前選取的知識點 */
  spotId: string | null;
  hoverSpotId: string | null;
  /** 一天中的分鐘數 0–1439 */
  minutes: number;
  preset: TimeKey;
  tab: SidebarTab;
  query: string;
  /** 產季篩選月份 1–12，null 為全部 */
  month: number | null;
  /** 分類（科別）篩選 */
  families: string[];
  visited: string[];
  log: LogEntry[];
  sidebarOpen: boolean;
  logOpen: boolean;
  cardOpen: boolean;
  /** 自動導覽目前步驟，null 為未啟動 */
  tourIndex: number | null;
  tourPlaying: boolean;
  /** 「一天」時間軸播放中 */
  playing: boolean;
  /** 圖層開關 */
  toggles: Record<ToggleKey, boolean>;
}

type Keys = keyof AppState;
type Listener = (s: AppState, changed: Set<Keys>) => void;

const STORAGE_KEY = 'fruit-atlas-islands.visited.v1';

function loadVisited(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function persistVisited(visited: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  } catch {
    /* 隱私模式或容量不足時靜默略過 */
  }
}

class Store {
  readonly state: AppState = {
    islandId: null,
    spotId: null,
    hoverSpotId: null,
    minutes: 720,
    preset: 'day',
    tab: 'islands',
    query: '',
    month: null,
    families: [],
    visited: loadVisited(),
    log: [],
    sidebarOpen: false,
    logOpen: false,
    cardOpen: false,
    tourIndex: null,
    tourPlaying: false,
    playing: false,
    toggles: {
      names: true,
      fruits: true,
      flows: false,
      freeze: false,
      bird: false,
      log: false,
    },
  };

  private listeners: { keys: Set<Keys> | null; fn: Listener }[] = [];

  on(keys: Keys[] | null, fn: Listener): () => void {
    const entry = { keys: keys ? new Set(keys) : null, fn };
    this.listeners.push(entry);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== entry);
    };
  }

  set(patch: Partial<AppState>): void {
    const changed = new Set<Keys>();
    for (const key of Object.keys(patch) as Keys[]) {
      const next = patch[key];
      if (next === undefined) continue;
      const prev = this.state[key];
      if (!shallowEqual(prev, next)) {
        (this.state as unknown as Record<string, unknown>)[key] = next;
        changed.add(key);
      }
    }
    if (changed.size === 0) return;

    if (changed.has('visited')) persistVisited(this.state.visited);

    for (const l of [...this.listeners]) {
      if (!l.keys || intersects(l.keys, changed)) l.fn(this.state, changed);
    }
  }

  markVisited(spotId: string): void {
    if (this.state.visited.includes(spotId)) return;
    this.set({ visited: [...this.state.visited, spotId] });
  }

  pushLog(entry: Omit<LogEntry, 'id' | 'at'>): void {
    const now = new Date();
    const at = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
    const next: LogEntry = { ...entry, id: Date.now() + Math.random(), at };
    this.set({ log: [next, ...this.state.log].slice(0, 200) });
  }
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
}

function intersects(a: Set<Keys>, b: Set<Keys>): boolean {
  for (const key of b) if (a.has(key)) return true;
  return false;
}

export const store = new Store();
