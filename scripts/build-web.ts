import * as fs from "node:fs";
import * as path from "node:path";
import * as esbuild from "esbuild";

// 將遊戲資料與網頁引擎打包成單一 HTML（免安裝、瀏覽器直接開啟）。
// 網頁引擎（web/src/main.ts）直接 import src/ 的 systems 與 data 共用實作，
// 由 esbuild 一併打包，不再需要內嵌 window.__PALADIN__ 資料。
const root = process.cwd();
const css = fs.readFileSync(path.join(root, "web/style.css"), "utf-8");

const result = esbuild.buildSync({
  entryPoints: [path.join(root, "web/src/main.ts")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["es2021"],
  charset: "utf8",
  legalComments: "none",
  logLevel: "silent",
});
// 避免字串中的 </script> 提早關閉 script 區塊。
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>仙劍奇俠傳 · 終端文字版</title>
<style>
${css}</style>
</head>
<body>
<div id="app">
  <header id="bar">
    <div class="title"></div>
    <div class="status"></div>
    <div class="place"></div>
    <div class="objective"></div>
  </header>
  <main id="log"></main>
  <footer id="actions"></footer>
</div>
<script>
${js}</script>
</body>
</html>
`;

// 只輸出 index.html（遊戲本體）。paladin.html 為相容別名，內容固定轉往
// index.html（靜態檔，不由此腳本產生）。
const out = path.join(root, "index.html");
fs.writeFileSync(out, html, "utf-8");
console.log(`已輸出 ${out}（${(html.length / 1024).toFixed(1)} KB）`);
