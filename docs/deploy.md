# 網頁版打包與部署

> 上層索引見 [README](../README.md)。

## 網頁版（單一 HTML，免安裝）

若要把遊戲直接分享給不熟終端機的人，可打包成**單一 HTML**：

```bash
npm run build:web        # 產生 index.html（約 126 KB，已內嵌全部資料與程式）
```

把產生的 `index.html` 單獨傳給對方，用瀏覽器（Safari / Chrome）雙擊開啟即可玩，**不需要安裝 Node.js、不需要終端機，也不會有 macOS 的開發者警告**。進度存在瀏覽器 localStorage（主選單可「存檔」，標題畫面可「讀取存檔」）。

- 網頁版與終端機版**共用 src/ 的遊戲規則與資料**（`src/systems`、`src/data`），避免雙份實作；網頁端僅保留流程與 DOM 呈現。網頁引擎（[web/src/main.ts](../web/src/main.ts)）直接 import 這些共用模組，由 [scripts/build-web.ts](../scripts/build-web.ts) 以 esbuild 打包 [web/style.css](../web/style.css) 產生；改完資料重新執行 `npm run build:web` 即可更新。
- `index.html` 為產物，可自由複製分享；`paladin.html` 為相容別名，內容固定轉往 `index.html`。

## 部署到 GitHub Pages（線上遊玩）

`index.html` 是**單一自帶檔**（CSS／JS／資料全內嵌，無任何外部資源）。本專案以 **GitHub Actions 自動建置並部署** Pages：push 到 `main` 後，會自動執行 `npm run typecheck`、`npm test`、`npm run build:web`，再把 `index.html`（遊戲本體）與 `paladin.html`、`404.html`（別名／404 導轉頁）部署上線。因此 Pages 的**根網址即為遊戲本體**。

一次性設定：

1. repo 需為 **public**（Pages 在 public repo 免費）。若現有 repo 是 private，先到 **Settings → General → 頁面最下方 Danger Zone → Change repository visibility → Make public** 改成公開。
2. 確認 [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml) 已推送（若尚未提交：`git add .github && git commit -m "Add Pages workflow" && git push`）。
3. 到 repo 的 **Settings → Pages**，**Source 選 `GitHub Actions`**（不是 "Deploy from a branch"）。

之後的流程：

- 直接 `git push` 到 `main` 即可；Actions 會自動建置與部署，**不需手動執行 `npm run build:web`，也不必手動更新 `index.html`**。
- 可在 repo 的 **Actions** 分頁查看 `Deploy web to GitHub Pages` 的執行結果；完成後網址為：

  ```
  https://<你的帳號>.github.io/<repo>/
  ```

  （根網址 `.../<repo>/` 即為遊戲本體；`.../<repo>/paladin` 與 `.../<repo>/paladin.html` 皆會轉回根網址。）

注意事項：

- Pages 僅在 **public repo 免費**；private repo 需 GitHub Pro 以上（本專案採 public）。
- 站台根目錄附 [`404.html`](../404.html)：GitHub Pages 對不存在的路徑會回傳它；若網址結尾為 `/paladin`（少打了 `.html`），會自動導回根目錄（即 `index.html`）。
- workflow 內建 `npm test` 關卡：測試未過即不會部署；若只想部署，可自 [deploy-pages.yml](../.github/workflows/deploy-pages.yml) 移除該步驟。
- 若改回分支部署（Source 選 "Deploy from a branch"），則改動 `src/` 後須先在本機 `npm run build:web` 並將 `index.html` 一起 commit，否則線上仍是舊版。
- 存檔存於瀏覽器 `localStorage`，各裝置各自保存、不會同步。
