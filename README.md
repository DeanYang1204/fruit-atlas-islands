# 水果圖鑑群島（Fruit Atlas Islands）

13 座六邊形小島、91 個知識點、69 位居民的台灣水果互動圖鑑。靈感取自 puma.taipei/heart-island 的群島互動，內容全部改為水果知識。

> 中央是政策島（北農行政中心）：沒有水果居民，只有北農的員工，唯一的 BOSS 是總經理。
> 其他島上走著各種品種化身 —— 點芒果島的居民就會遇到愛文人、金煌人、玉文人。

## 功能

- **3D 群島**：Three.js 低面數六邊形島嶼，每座島代表一種水果，島上的果樹就是知識點
- **島上居民**：每個品種化身成一位居民沿著外環步道散步，點他就會彈出品種詳細資訊
- **政策島**：中央的北農行政中心，島上是拍賣員、理貨員、檢查員、拖工、駐在員、統計員、清潔員與唯一的 BOSS 總經理
- **點選聚焦**：點果樹飛到該知識點、點居民飛到他面前、點島嶼看水果總覽
- **產季月曆**：選月份，當令水果島亮起
- **分類檢索**：依科別篩選
- **時段模擬**：清晨／白天／黃昏／夜晚，或用滑桿播放「果園的一天」
- **圖層開關**：名牌、果實、居民、產季線（同期盛產的島嶼連線）、暫停動畫、鳥瞰
- **清單側欄**：水果島／知識點／居民／產季 四頁籤＋全文搜尋
- **知識卡**：右側詳細內容，可標記學會、前後翻頁，島卡附居民名單可直接飛過去打招呼
- **圖鑑日誌**：學習進度儀表板＋事件日誌（localStorage 持久化）
- **自動導覽**：13 座島依序導覽
- **首次引導**：四步驟操作教學

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

- `src/data/fruits.ts`：所有水果內容，一個水果一個物件
- `src/data/policy.ts`：政策島（北農行政中心）的內容與知識點
- `src/data/residents.ts`：島上居民資料 —— 水果品種化身自動從 `fruits.ts` 的 `varieties` 生成，北農員工是手寫的 `STAFF_SEEDS`
- `src/data/spots.ts`：知識點由水果資料自動生成，不需要手寫 91 筆
- `src/data/atlas.ts`：把政策島與水果島整合成世界的清單

要改水果內容，只動 `fruits.ts`；要改政策島內容，只動 `policy.ts`；要調整員工分工，只動 `residents.ts` 的 `STAFF_SEEDS`。

## 部署到 GitHub Pages

已附 `.github/workflows/deploy.yml`：

1. 把專案推到 GitHub repo（例如 `fruit-atlas-islands`）
2. Repo → Settings → Pages → Source 選 **GitHub Actions**
3. push 到 `main` 後自動建置並發佈

`vite.config.ts` 已設 `base: './'`，所以掛在 `https://<帳號>.github.io/<repo>/` 子目錄也能正常運作。

