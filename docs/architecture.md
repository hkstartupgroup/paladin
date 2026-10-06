# 專案結構與架構

> 上層索引見 [README](../README.md)。

## 架構：Data + Config + Constant → Model → System / Information

- **Constant / Config**（`src/config/`）：不改邏輯即可調整的數值，如經驗曲線、成長率、爆擊率、存檔位置。
- **Model**（`src/models/types.ts`）：所有實體與資料結構的型別定義。
- **Data**（`src/data/`）：角色、武功、物品、敵人、劇情、場景等純資料。
- **System**（`src/systems/`）：戰鬥、升級、劇情、探索、物品等規則運算。
- **Information / UI**（`src/ui/` 與 `src/engine/`）：僅負責呈現與流程驅動；遊戲流程集中於 `game.ts`，存讀檔獨立於 `save.ts`。

新增內容時，原則上只需在 `data/` 補資料、必要時在 `config/` 調數值，盡量不動 `systems/`。

終端版與網頁版**共用 `src/systems` 與 `src/data`**（單一來源）；兩者僅「流程與呈現」各寫一份，網頁端由 esbuild 打包，詳見 [deploy.md](deploy.md)。戰鬥純規則（無 UI）抽於 `src/systems/combat-core.ts`，供兩版共用。

## 專案結構

```
paladin/
├── package.json
├── tsconfig.json
├── README.md
├── index.html                       # 網頁版入口（遊戲本體；npm run build:web 產生）
├── paladin.html                     # 相容別名：轉往 index.html
├── 404.html                         # Pages 404 頁：網址為 /paladin 時導回根目錄
├── .github/workflows/               # GitHub Actions（自動建置並部署 Pages）
├── scripts/
│   └── build-web.ts                 # 以 esbuild 打包單一 HTML（打包 web/src，共用 src/ 資料與引擎）
├── web/
│   ├── src/                         # 網頁版流程與 DOM，共用 src/ 的 systems 與 data（由 esbuild 打包）
│   │   ├── main.ts                  # 網頁版引擎（瀏覽器端流程，import src/ 共用模組）
│   │   └── data.ts                  # 自 src/ 匯出的共用遊戲資料（D）
│   └── style.css                    # 網頁版樣式
├── src/
│   ├── index.ts                     # 程式入口（行程參數：scene id / --test）
│   ├── config/
│   │   ├── constants.ts             # 全域常量（標題、存檔位置、裝備部位）
│   │   └── balance.ts               # 數值平衡（經驗曲線、戰鬥、探索）
│   ├── models/
│   │   └── types.ts                 # 資料模型（角色／武功／物品／敵人／劇情／場景）
│   ├── data/
│   │   ├── characters.ts            # 角色資料與建立函式
│   │   ├── skills.ts                # 武功資料
│   │   ├── items.ts                 # 物品資料
│   │   ├── shops.ts                 # 商店資料（鐵匠鋪／木匠鋪／藥鋪）
│   │   ├── enemies.ts               # 敵人與練武區域資料
│   │   ├── objectives.ts            # 主線「當前目標」提示資料
│   │   ├── chapters/chapter01.ts    # 第一章劇情節點
│   │   └── scenes/                  # 場景（每場景一檔，index.ts 彙整）
│   ├── systems/
│   │   ├── leveling.ts              # 升級與屬性成長
│   │   ├── combat.ts                # 回合制戰鬥流程（終端 UI 版）
│   │   ├── combat-core.ts           # 戰鬥純規則（傷害／治療公式、狀態、退避、擋格；無 UI，供兩版共用）
│   │   ├── explore.ts               # 旗標、出口、互動可見性、野外探索
│   │   ├── story.ts                 # 劇情推進引擎
│   │   ├── objectives.ts            # 依旗標推算當前目標
│   │   ├── inventory.ts             # 物品增減
│   │   ├── shop.ts                  # 商店買賣（買入／收購）
│   │   ├── treasure.ts              # 寶物開啟（包袱、手卷）
│   │   └── rest.ts                  # 客棧投宿休息（回滿生命與真氣）
│   ├── ui/
│   │   ├── display.ts               # 顯示與排版（含 CJK 對齊）
│   │   └── input.ts                 # 輸入與選單
│   └── engine/
│       ├── game.ts                  # 遊戲主流程與各選單
│       └── save.ts                  # 存讀檔
├── docs/                            # 開發文檔（本目錄）
└── tests/
    └── leveling.test.ts             # 單元測試
```

## 場景一覽

客棧：`inn-room`、`inn-corridor`、`guest-room-1`、`guest-room`、`inn-hall`、`inn-kitchen`、`inn-shed`、`aunt-room`；
村鎮：`market`、`shili-po`、`shan-shen-miao`；
仙靈島：`island-shore`、`island-rock`、`lotus-pond`、`peach-forest`、`moon-palace-out`、`moon-palace`。

## 主要檔案連結

- 入口：[src/index.ts](../src/index.ts)
- 戰鬥：[src/systems/combat.ts](../src/systems/combat.ts)（純規則：[src/systems/combat-core.ts](../src/systems/combat-core.ts)）
- 升級：[src/systems/leveling.ts](../src/systems/leveling.ts)
- 劇情引擎：[src/systems/story.ts](../src/systems/story.ts)
- 探索系統：[src/systems/explore.ts](../src/systems/explore.ts)
- 物品增減：[src/systems/inventory.ts](../src/systems/inventory.ts)
- 商店買賣：[src/systems/shop.ts](../src/systems/shop.ts)
- 客棧投宿：[src/systems/rest.ts](../src/systems/rest.ts)
- 場景資料：[src/data/scenes/](../src/data/scenes/)（每場景一檔，`index.ts` 彙整）
- 商店資料：[src/data/shops.ts](../src/data/shops.ts)
- 劇情資料：[src/data/chapters/chapter01.ts](../src/data/chapters/chapter01.ts)
- 主流程：[src/engine/game.ts](../src/engine/game.ts)
- 存讀檔：[src/engine/save.ts](../src/engine/save.ts)
- 網頁版引擎：[web/src/main.ts](../web/src/main.ts)（流程與 DOM，共用 src/ 的 systems 與 data）
- 網頁版打包：[scripts/build-web.ts](../scripts/build-web.ts)
