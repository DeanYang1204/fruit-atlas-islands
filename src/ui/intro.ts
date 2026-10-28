import { must } from './dom';

const STEPS: { title: string; body: string }[] = [
  {
    title: '歡迎來到水果圖鑑群島',
    body: '中央是兩座主島：第一果菜市場與第二果菜市場，四周 12 座水果島。島跟島之間都有橋，拖曳可以旋轉視角，滾輪可以拉近拉遠。',
  },
  {
    title: '點果樹，學知識',
    body: '每座島上有知識點：基本檔案、產季月曆、產地巡禮、品種圖譜、挑選保存、營養密碼，還有冷知識。點一下果樹就會飛過去。',
  },
  {
    title: '島上有人，而且到處走',
    body: '水果島上的居民是各品種的化身，名字就是「品種＋水果」（例如芒果島有愛文 芒果、金煌 芒果、玉文 芒果），主島住的是北農員工。所有人都會順著橋走到別的島串門子，也可以打開「巡視」跟著吳總看整片群島。',
  },
  {
    title: '天氣與時段都能切',
    body: '左下角有清晨／白天／黃昏／夜晚的時段，以及晴／陰／雨的天氣。想找特定水果就用清單搜尋、產季月曆選月份，學過的東西都記在右下角「日誌」。',
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
