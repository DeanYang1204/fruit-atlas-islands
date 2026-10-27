# 水果圖鑑群島（Fruit Atlas Islands）

12 座六邊形小島、85 個知識點的台灣水果互動圖鑑。靈感取自 puma.taipei/heart-island 的群島互動，內容全部改為水果知識。

> 點一格知識點，認識一種台灣水果的產季、產地、品種、挑選、營養與冷知識。

## 功能

- **3D 群島**：Three.js 低面數六邊形島嶼，每座島代表一種水果，島上的果樹就是知識點
- **點選聚焦**：點果樹飛到該知識點，點島嶼看水果總覽
- **產季月曆**：選月份，當令水果島亮起
- **分類檢索**：依科別篩選
- **時段模擬**：清晨／白天／黃昏／夜晚，或用滑桿播放「果園的一天」
- **圖層開關**：名牌、果實、產季線（同期盛產的島嶼連線）、暫停動畫、鳥瞰
- **清單側欄**：水果島／知識點／產季 三頁籤＋全文搜尋
- **知識卡**：右側詳細內容，可標記學會、前後翻頁
- **圖鑑日誌**：學習進度儀表板＋事件日誌（localStorage 持久化）
- **自動導覽**：12 座島依序導覽
- **首次引導**：三步驟操作教學

## 技術棧

- Vite 5 + TypeScript（strict）
- Three.js（WebGL + CSS2DRenderer 標籤 + OrbitControls）
- 無後端、無框架，純 DOM UI

## 本地開發

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 輸出到 dist/
npm run preview    # 預覽 build 結果 http://localhost:4173
```

## 資料結構

所有水果內容集中在 `src/data/fruits.ts`，一個水果一個物件：

```ts
{
  id: 'banana',
  name: '香蕉',
  alias: '芎蕉（台語 kin-tsio）',
  peak: [3, 4, 5, 6, 7, 8],     // 盛產月份
  regions: [...],                // 產地
  varieties: [...],              // 品種
  pick: [...],                   // 挑選保存
  nutrition: [...],              // 營養
  trivia: [...],                 // 冷知識
  market: [{ code: '811', ... }],// 北農代號（可選）
  hex: [-2, 0],                  // 六邊形座標
}
```

知識點（基本檔案／產季／產地／品種／挑選保存／營養／冷知識）由 `src/data/spots.ts` 依水果資料自動生成，不需要手寫 85 筆。要改內容，只動 `fruits.ts`。

## 部署到 GitHub Pages

已附 `.github/workflows/deploy.yml`：

1. 把專案推到 GitHub repo（例如 `fruit-atlas-islands`）
2. Repo → Settings → Pages → Source 選 **GitHub Actions**
3. push 到 `main` 後自動建置並發佈

`vite.config.ts` 已設 `base: './'`，所以掛在 `https://<帳號>.github.io/<repo>/` 子目錄也能正常運作。
