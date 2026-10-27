import type { Fruit, Spot } from './types';
import type { Island } from './spots';

/** 第一果菜批發市場（群島主島之一，偏西側） */
export const MARKET1_ID = 'market1';
/** 第二果菜批發市場（群島主島之二，偏東側） */
export const MARKET2_ID = 'market2';

export const MARKET_IDS: string[] = [MARKET1_ID, MARKET2_ID];

/** 兩座主島（＝北農的兩個果菜批發市場） */
export function isMarket(id: string): boolean {
  return id === MARKET1_ID || id === MARKET2_ID;
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const BASE_KEYWORDS = [
  '北農',
  '台北農產',
  'TAPMC',
  '第一果菜批發市場',
  '第二果菜批發市場',
  '拍賣',
  '批發市場',
  '承銷人',
  '供應人',
];

/**
 * 第一果菜批發市場
 * 公司最早的拍賣基地，蔬果拍賣與零批場皆在此運作。
 */
export const MARKET1_FRUIT: Fruit = {
  id: MARKET1_ID,
  name: '第一果菜市場',
  alias: '一市・台北第一果菜批發市場',
  en: 'Taipei First Fruit & Vegetable Wholesale Market',
  sci: '臺北農產運銷股份有限公司 第一果菜批發市場',
  family: '台北農產運銷公司',
  color: '#2F6690',
  accent: '#6E9B6A',
  peak: ALL_MONTHS,
  harvestNote: '全年無休。下午開始理貨，隔日凌晨 03:20 開拍。',
  regions: [
    { name: '一市場場區', note: '本公司最早的拍賣基地，蔬果拍賣與零批場皆在此運作。' },
    { name: '零批場', note: '拍賣完成後，承銷人在此分批轉售給零售端。' },
  ],
  varieties: [],
  pick: [],
  nutrition: [],
  trivia: [],
  tagline: '群島的主島之一。這裡不住水果，住的是讓蔬果半夜被賣掉的人。',
  hex: [0, 0],
};

/**
 * 第二果菜批發市場
 * 總公司行政中心所在地，設施較新，與一市場分流貨量。
 */
export const MARKET2_FRUIT: Fruit = {
  id: MARKET2_ID,
  name: '第二果菜市場',
  alias: '二市・台北第二果菜批發市場',
  en: 'Taipei Second Fruit & Vegetable Wholesale Market',
  sci: '臺北農產運銷股份有限公司 第二果菜批發市場',
  family: '台北農產運銷公司',
  color: '#3D5A80',
  accent: '#7FA36B',
  peak: ALL_MONTHS,
  harvestNote: '全年無休。與一市場分工，共同消化全台進場貨量。',
  regions: [
    { name: '二市場場區', note: '設施現代化，處理量逐年成長，與一市場分流貨量。' },
    { name: '行政中心', note: '總公司行政單位所在，公司管理與決策的中樞。' },
  ],
  varieties: [],
  pick: [],
  nutrition: [],
  trivia: [],
  tagline: '群島的主島之二。同一套制度，另一個場，隔著橋就到一市。',
  hex: [1, 0],
};

const m1Base = {
  fruitId: MARKET1_ID,
  keywords: [...BASE_KEYWORDS, '一市', '第一市場', '零批場'],
};

const m2Base = {
  fruitId: MARKET2_ID,
  keywords: [...BASE_KEYWORDS, '二市', '第二市場', '行政中心'],
};

export const MARKET1_SPOTS: Spot[] = [
  {
    ...m1Base,
    id: `${MARKET1_ID}:basics`,
    kind: 'basics',
    title: '第一果菜批發市場',
    lead: '北農最早的拍賣基地：半夜三點，全場的燈是最亮的那一群。',
    points: [
      '地位｜台北農產運銷公司經營的兩座果菜批發市場之一，歷史最久。',
      '場區機能｜蔬果拍賣與零批場皆在此運作，拍完直接轉零售。',
      '作業節奏｜下午起理貨，隔日凌晨 03:20 開拍，天亮前完成交易。',
      '吳總｜總經理的巡視通常是從這裡開始，再過橋去二市。',
      '※ 場區配置與最新數據以北農官網、年報為準（本島內容持續校正）。',
    ],
    mark: '一',
  },
  {
    ...m1Base,
    id: `${MARKET1_ID}:org`,
    kind: 'org',
    title: '場內的角色分工',
    lead: '一顆水果從進場到出去，會經過好幾雙手。島上走動的就是這些人。',
    points: [
      '供應人｜把貨交給市場的人：產地農友、農會、合作社與販運商。',
      '拍賣員｜市場員工，受供應人委託主持競價，是全場的靈魂人物。拍賣資料中的 P 欄就是拍賣員編號。',
      '承銷人｜進場看貨競價的採購者，得標後自行整理、再分銷到零售端。',
      '理貨員｜負責分類、評級、標號、陳列，讓承銷人能順利看貨。',
      '駐在員｜農會、國聯社、農聯社、青果社派駐市場的人員，協助所屬農友處理第一線問題。',
      '拖工／搬運｜把成交的貨拖離現場，送往零批攤位或採購車。',
      '清潔與維修｜交易結束後進行現場清潔、定期消毒，以及拖車維修補強。',
    ],
    mark: '織',
  },
  {
    ...m1Base,
    id: `${MARKET1_ID}:season`,
    kind: 'season',
    title: '市場的一天',
    lead: '這座島沒有朝九晚五，真正的熱鬧從凌晨開始。',
    points: [
      '下午｜全台產地的蔬果陸續運抵市場，展開理貨作業。',
      '02:00｜拍賣員進場，掌握進貨量、天候、節慶與承銷人看貨情形。',
      '03:00｜承銷人進場，依標號與陳列看貨、驗貨。',
      '03:20｜正式開拍，電腦拍賣機啟動。',
      '05:00–06:30｜拖工依交易傳票領貨，送往零批攤位或採購車。',
      '06:00｜零批場開始販售，貨色轉往零售端。',
      '06:30｜清潔人員進場作業，並定期全面消毒。',
      '08:00｜拖車維修與車身補強，準備隔日任務。',
    ],
    months: ALL_MONTHS,
    mark: '季',
  },
  {
    ...m1Base,
    id: `${MARKET1_ID}:market`,
    kind: 'market',
    title: '代號、傳票與拍賣資料',
    lead: '看懂這幾個欄位，就看得懂市場的資料語言。',
    points: [
      'P 欄｜拍賣員編號，記錄這筆交易由哪位拍賣員執行。',
      'O 欄｜拍賣序（裁價序），同一拍賣序內的交易共用一個序號。',
      '供應商代號｜常見為 6 碼，代表供貨的農友、農會或販運單位。',
      '子代碼｜常見為 3 碼，區分同一供應單位下的細項品項。',
      '傳票編號｜一筆成交的交易憑證。統計「交易筆數」時以傳票編號計，同一拍賣序只算一次。',
      '交易筆數定義｜員工壓力指標用：以傳票數量計數，非原始記錄筆數。',
      '※ 代號規則與欄位名稱以公司現行作業系統為準。',
    ],
    mark: '市',
  },
];

export const MARKET2_SPOTS: Spot[] = [
  {
    ...m2Base,
    id: `${MARKET2_ID}:basics`,
    kind: 'basics',
    title: '第二果菜批發市場',
    lead: '總公司行政中心在此。橋的另一頭是一市，兩個場共用同一套制度。',
    points: [
      '地位｜台北農產運銷公司經營的兩座果菜批發市場之一，設施較新。',
      '行政中心｜總公司行政單位所在，管理與決策的中樞。',
      '與一市分工｜兩市場分流全台進場貨量，行情互為參考。',
      '經營標的｜本公司受託經營第一、第二果菜批發市場，共同形成台北區行情。',
      '※ 場區配置與最新數據以北農官網、年報為準（本島內容持續校正）。',
    ],
    mark: '二',
  },
  {
    ...m2Base,
    id: `${MARKET2_ID}:rule`,
    kind: 'rule',
    title: '價格是怎麼形成的',
    lead: '沒有誰喊了算，價格由現場供需決定。',
    points: [
      '交易方式｜以公開競價拍賣為主，承銷人自由出價，價高者得。',
      '拍賣起點｜每日凌晨 03:20 起分批開拍，通常三小時內完成全場。',
      '電腦化｜現場配置多台電腦拍賣機，承銷人以晶片感應完成交易。',
      '腹案｜拍賣員依到貨量、天候、節慶假日與前日行情擬定裁價與拍賣腹案。',
      '行情｜成交價形成後即為全台指標性行情，當日上午即公告於北農官網。',
      '管理費｜依《農產品市場交易法》按成交金額收取管理費，以維持市場營運。',
    ],
    mark: '拍',
  },
  {
    ...m2Base,
    id: `${MARKET2_ID}:origin`,
    kind: 'origin',
    title: '從產地到餐桌的供銷鏈',
    lead: '產地 → 共同運銷 → 批發市場 → 承銷人 → 零售 → 消費者',
    points: [
      'Step 1 產地｜農友採收後，交由農會、合作社或販運商集貨。',
      'Step 2 運銷｜共同運銷團體協助計畫性供貨，穩定產銷。',
      'Step 3 進場｜貨件進入批發市場，由理貨員分類、評級、標號。',
      'Step 4 交易｜拍賣員主持、承銷人競價，形成公開行情。',
      'Step 5 分銷｜承銷人整理後批給零售商、餐廳、團膳與量販通路。',
      'Step 6 末端｜零批場與零售通路送到一般消費者手上。',
      '品質把關｜市場設農藥殘留檢驗室抽樣篩檢，不合格者拒絕交易並扣留銷毀。',
    ],
    mark: '地',
  },
  {
    ...m2Base,
    id: `${MARKET2_ID}:basics-corp`,
    kind: 'org',
    title: '認識台北農產運銷公司',
    lead: '兩個市場背後是同一家公司：替全台蔬果集散、形成價格、清算貨款。',
    points: [
      '正式名稱｜臺北農產運銷股份有限公司，簡稱北農（TAPMC）。',
      '經營標的｜台北第一果菜批發市場、第二果菜批發市場。',
      '公司定位｜官民合資的股份有限公司，受主管機關與議會監督。',
      '核心任務｜接受供應人委託，將蔬果公開拍賣給承銷人。',
      '五大功能｜迅速集散、齊備貨色、形成價格、清算貨款、行情報導。',
      '規模｜全台最具規模的果菜集散中心，每日約 2,300 公噸蔬果在場內完成交易。',
    ],
    mark: '本',
  },
];

export const MARKET_ISLANDS: Island[] = [
  { fruit: MARKET1_FRUIT, spots: MARKET1_SPOTS },
  { fruit: MARKET2_FRUIT, spots: MARKET2_SPOTS },
];

export const MARKET_ISLAND_BY_ID: Record<string, Island> = {
  [MARKET1_ID]: MARKET_ISLANDS[0],
  [MARKET2_ID]: MARKET_ISLANDS[1],
};

export const MARKET_FRUIT_BY_ID: Record<string, Fruit> = {
  [MARKET1_ID]: MARKET1_FRUIT,
  [MARKET2_ID]: MARKET2_FRUIT,
};
