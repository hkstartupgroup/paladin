# 仙劍奇俠傳 · 終端文字版

純文字（Terminal）仙俠 RPG，以「升級練武」與「劇情體驗」為核心。改編自經典《仙劍奇俠傳一》，
以回合制戰鬥、武學成長與章節式劇情推進，重現餘杭小鎮、仙靈島、蘇州、蜀山、苗疆的江湖旅程。

> 目前進度：**第一章「仙島求藥」與第二章「姑蘇招親」全篇完成**（盛漁村序幕 → 仙靈島 → 回村失憶 → 十里坡山神廟習御劍術 → 蘇州城外 → 悅來客棧 → 林家堡比武招親 → 隱龍窟；趙靈兒、林月如先後入隊參戰），並加入盛漁村／蘇州商店買賣與客棧投宿休息。對應藍圖階段 1、1.5～1.9、6、7、10。

## 快速開始

```bash
npm install
npm start                # 開始遊戲（終端版）
npm run dev              # 開發模式（熱重載）
npm test                 # 執行單元測試
npm run build            # 編譯並型別檢查
npm run build:web        # 打包單一 HTML 網頁版（輸出 index.html，約 126 KB）
```

需求：Node.js >= 20.6。網頁版為單一自帶檔，雙擊即可玩；線上分享與部署見 [docs/deploy.md](docs/deploy.md)。

## 架構原則（核心）

採 **Config / Constant → Model → Data → System → Information (UI)** 單向依賴：

- **Config / Constant**（`src/config/`）：不改邏輯即可調整的數值，如經驗曲線、成長率、爆擊率、存檔位置。
- **Model**（`src/models/types.ts`）：所有實體與資料結構的型別定義。
- **Data**（`src/data/`）：角色、武功、物品、敵人、劇情、場景等純資料。
- **System**（`src/systems/`）：戰鬥、升級、劇情、探索、物品等規則運算。
- **Information / UI**（`src/ui/`、`src/engine/`、`web/`）：只負責呈現與流程驅動，**不含業務邏輯**。

核心原則：

- 新增內容先補 `data/`，必要時調 `config/`，盡量不動 `systems/`。
- 終端版與網頁版**共用** `src/systems` 與 `src/data`（單一來源），僅「流程與呈現」各寫一份。
- View 只負責顯示；遊戲規則一律落在 `systems/`。

細節（檔案樹、場景一覽、主要檔案連結）見 [docs/architecture.md](docs/architecture.md)。

## 開發規範（每階段完成後必做）

1. **文檔維護**：更新本 README（進度與索引）與 [docs/](docs/) 對應文件；連結一律使用**相對路徑**。
2. **單元測試**：於 `tests/` 補齊或調整對應測試，執行 `npm test` 須全數通過。
3. **忠實度查核**：涉及原著設定的內容（招式歸屬、傳功地點、劇情順序）須先查證再落筆，不得憑印象硬掰；來源見 [docs/sources.md](docs/sources.md)。

## 文檔索引

| 文件                                               | 內容                           |
| -------------------------------------------------- | ------------------------------ |
| [docs/features.md](docs/features.md)               | 遊戲特色（完整功能清單）       |
| [docs/gameplay.md](docs/gameplay.md)               | 操作方式、測試模式與場景直跳   |
| [docs/faithfulness.md](docs/faithfulness.md)       | 原著忠實度（考據與改編取捨）   |
| [docs/sources.md](docs/sources.md)                 | 原著考據來源                   |
| [docs/architecture.md](docs/architecture.md)       | 專案結構、場景一覽與主要檔案   |
| [docs/roadmap.md](docs/roadmap.md)                 | 開發藍圖                       |
| [docs/deploy.md](docs/deploy.md)                   | 網頁版打包與 GitHub Pages 部署 |
| [docs/story/main/ch01.md](docs/story/main/ch01.md) | 第一章劇情對話原文             |
| [docs/story/main/ch02.md](docs/story/main/ch02.md) | 第二章劇情對話原文             |
