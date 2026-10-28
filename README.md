# 水果圖鑑群島（Fruit Atlas Islands）

14 座島（第一／第二果菜市場 + 12 座水果島）、93 個知識點、74 位居民的台灣水果互動圖鑑。靈感取自 puma.taipei/heart-island 的群島互動，內容全部改為水果知識。

> 中央的兩座主島是北農的第一／第二果菜批發市場：島上沒有水果居民，只有北農的員工，唯一的 BOSS 是總經理「吳總」。
> 水果島上走著各種品種化身 —— 點芒果島的居民就會遇到愛文人、金煌人、玉文人。
> 所有人都能沿著橋在各島之間穿梭，吳總則是巡視全群島。

## 功能

- **溫暖的玩具模型城市**：長焦鏡頭（FOV 34）壓扁透視＋奶油色暖霧＋畫面暗角，整座群島像一組放在桌上的微縮模型
- **3D 群島**：Three.js 低面數六邊形島嶼，相鄰島之間有拱形木棧橋連通，整片群島走得通
- **每座島都是一個小鎮**：島上排著賣自己水果的攤車（條紋遮陽棚＋滿桌水果）、木箱堆、手推車、棧板籃子、木桶、長椅、花盆、三角旗串與島名招牌；入夜後路燈會亮
- **每座島長得不一樣**：程序化 canvas 地面貼圖（果園田壟／草地／火龍果礫石地／市場磁磚）＋四層土壤色階的懸崖＋島緣木條＋淺灘與浪花環，遠看就能認出島
- **跨島巡走**：所有角色（員工與水果居民）用世界座標移動，會沿環島步道散步、走橋串門子；吳總以「走遍全部島」為目標持續巡視
- **兩座主島**：第一果菜市場 / 第二果菜市場，島上只有北農員工（深藍制服＋紅滾邊＋黑頭帶），吳總穿灰西裝＋眼鏡
- **依真實型態建模的植物**：火龍果是攀在水泥柱上的三角柱仙人掌、香蕉是假莖草本、鳳梨貼地蓮座、木瓜單一假莖
- **點選聚焦**：點果樹飛到該知識點、點居民飛到他面前、點島嶼看總覽
- **產季月曆**：選月份，當令水果島亮起
- **分類檢索**：依科別篩選
- **時段模擬**：清晨／白天／黃昏／夜晚，或用滑桿播放「果園的一天」（入夜時整座介面與暗角也跟著入夜）
- **天氣模式**：晴／陰／雨，影響光線、天空、雲色、海面與雨絲
- **巡視模式**：鏡頭跟著吳總走，狀態列顯示他目前在哪一島
- **圖層開關**：名牌、果實、居民、產季線（同期盛產的島嶼連線）、暫停動畫、鳥瞰
- **清單側欄**：島嶼／知識點／居民／產季 四頁籤＋全文搜尋
- **知識卡**：右側詳細內容，可標記學會、前後翻頁，島卡附居民名單可直接飛過去打招呼
- **圖鑑日誌**：學習進度儀表板＋事件日誌（localStorage 持久化）
- **自動導覽**：14 座島依序導覽
- **首次引導**：四步驟操作教學

## 技術棧

- Vite 5 + TypeScript（strict）
- Three.js（WebGL + CSS2DRenderer 標籤 + OrbitControls + BufferGeometryUtils 合併幾何 + RoundedBoxGeometry 圓角盒）
- 地面／步道／島緣貼圖全部用 canvas 程序化產生，不載外部圖檔
- 陰影圖只在太陽移動到下一格時重算（`shadowMap.autoUpdate = false`），攤車木箱再多也不拖效能
- 無後端、無框架，純 DOM UI

## 技術棧

- Vite 5 + TypeScript（strict）
- Three.js（WebGL + CSS2DRenderer 標籤 + OrbitControls + BufferGeometryUtils 合併幾何）
- 無後端、無框架，純 DOM UI

## 本地開發

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 輸出到 dist/
npm run preview    # 預覽 build 結果 http://localhost:4173
```

## 資料結構

- `src/data/fruits.ts`：所有水果內容，一個水果一個物件（含六邊形座標）
- `src/data/markets.ts`：兩座主島（第一／第二果菜市場）的內容與知識點
- `src/data/residents.ts`：島上居民資料 —— 水果品種化身自動從 `fruits.ts` 的 `varieties` 生成，北農員工是手寫的 `STAFF_SEEDS`（含所屬市場與吳總）
- `src/data/spots.ts`：知識點由水果資料自動生成，不需要手寫 93 筆
- `src/data/atlas.ts`：把主島與水果島整合成世界的清單
- `src/scene/roam.ts`：跨島巡走系統（環島步道 → 橋頭 → 拱橋 → 下一座島）
- `src/scene/crowd.ts`：全群島居民統一管理（世界座標、依距離休眠）

要改水果內容，只動 `fruits.ts`；要改市場內容，只動 `markets.ts`；要調整員工分工，只動 `residents.ts` 的 `STAFF_SEEDS`。

## 部署到 GitHub Pages

已附 `.github/workflows/deploy.yml`：

1. 把專案推到 GitHub repo（例如 `fruit-atlas-islands`）
2. Repo → Settings → Pages → Source 選 **GitHub Actions**
3. push 到 `main` 後自動建置並發佈

`vite.config.ts` 已設 `base: './'`，所以掛在 `https://<帳號>.github.io/<repo>/` 子目錄也能正常運作。
