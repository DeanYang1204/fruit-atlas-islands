import { must } from './dom';

const STEPS: { title: string; body: string }[] = [
  {
    title: '歡迎來到水果圖鑑群島',
    body: '中央是政策島（北農行政中心），周圍 12 座水果島。拖曳可以旋轉視角，滾輪可以拉近拉遠。',
  },
  {
    title: '點果樹，學知識',
    body: '每座島上有知識點：基本檔案、產季月曆、產地巡禮、品種圖譜、挑選保存、營養密碼，還有冷知識。點一下果樹就會飛過去。',
  },
  {
    title: '點路上的居民，聊品種',
    body: '島上有各種品種化身在散步，例如芒果島上會看到愛文人、金煌人、玉文人。政策島上沒有水果居民，只有北農的員工，唯一的 BOSS 是吳總（總經理）。',
  },
  {
    title: '用清單與產季找水果',
    body: '左上角「清單」可以看完整目錄與搜尋；下方「產季月曆」可以選月份，當令的水果島會亮起來。學過的知識點與認識的居民會記錄在右下角「日誌」。',
  },
];

const FLAG_KEY = 'fruit-atlas-islands.intro.v2';

export function initIntro(): void {
  const overlay = must<HTMLElement>('#intro');
  const count = must<HTMLElement>('#intro-count');
  const title = must<HTMLElement>('#intro-title');
  const body = must<HTMLElement>('#intro-body');
  const next = must<HTMLButtonElement>('#intro-next');
  const skip = must<HTMLButtonElement>('#intro-skip');

  let step = 0;

  const show = (i: number): void => {
    step = i;
    const s = STEPS[i];
    count.textContent = `HELLO, FRUIT / ${String(i + 1).padStart(2, '0')}`;
    title.textContent = s.title;
    body.textContent = s.body;
    next.textContent = i === STEPS.length - 1 ? '開始探索 →' : '下一步 →';
    overlay.hidden = false;
  };

  const close = (): void => {
    overlay.hidden = true;
    try {
      localStorage.setItem(FLAG_KEY, '1');
    } catch {
      /* 忽略 */
    }
  };

  next.addEventListener('click', () => {
    if (step < STEPS.length - 1) show(step + 1);
    else close();
  });

  skip.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  window.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      next.click();
    }
  });

  window.addEventListener('fruit-atlas:intro', () => show(0));

  let seen = false;
  try {
    seen = localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    seen = false;
  }
  if (!seen) show(0);
}
