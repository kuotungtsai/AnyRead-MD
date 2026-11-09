# MD Reader Pro

<img alt="MD Reader Pro" src="./src/images/logo-pro.svg" align="right" width="110">

在 Chrome 裡閱讀、瀏覽、編輯 Markdown 檔案的瀏覽器擴充功能。
所有內容都只在你的電腦上處理：**沒有帳號、沒有追蹤，也不會連到任何外部伺服器。**

> A Chrome extension to read, browse and edit Markdown files locally. No account, no tracking, no remote server.
> Fork of the open-source [md-reader](https://github.com/md-reader/md-reader) 2.x (MIT).

## 功能

- **閱讀**：開啟 `file://`、`http://`、`https://` 的 `.md` / `.mkd` / `.mdx` / `.markdown` 檔，淺色 / 深色主題、程式碼高亮、圖片放大檢視。
- **側邊欄「大綱 / 檔案」**：大綱可跳到標題；檔案分頁列出同資料夾的其他 Markdown 檔與子資料夾，點一下就切換。
- **資料夾檢視**：把整個資料夾拖進 Chrome（或開 `file:///C:/docs/` 這類網址），會看到可搜尋的 Markdown 檔列表，打字篩選、`↑` `↓` 選擇、`Enter` 開啟。
- **編輯模式**：`Alt+Shift+E` 開啟左右分割的編輯器，右邊即時預覽；`Ctrl+S` 存檔（第一次會跳出「另存新檔」，選同一個檔案覆蓋）。
- **插件與參數設定**：Emoji、上下標、目錄 TOC、數學公式 KaTeX、Mermaid、腳註、任務列表、提示框、表格擴展、元數據 frontmatter 等，可個別開關，並用 ⚙ 以 JSON 調整參數；也能一鍵全開 / 全關。
- **自動刷新**：檔案在其他編輯器存檔後，頁面自動更新。
- **快速教學**：安裝後有歡迎頁，第一次開 Markdown 時有導覽，之後可從 popup 重看。

### 快捷鍵

| 快捷鍵                    | 功能                          |
| ------------------------- | ----------------------------- |
| `Alt+Shift+E`             | 開關編輯模式                  |
| `Ctrl+S` / `Ctrl+Shift+S` | 存檔 / 另存新檔（編輯模式中） |
| `Alt+Shift+B`             | 顯示 / 隱藏側邊欄             |
| `Alt+Shift+C`             | 內容置中                      |
| `Alt+Shift+R`             | 自動刷新                      |
| `Alt+Shift+T`             | 切換主題                      |

## 安裝

### 用打包好的 zip（給同事）

1. 把 `md-reader-pro-<版本>.zip` 解壓縮到固定位置，例如 `D:\tools\md-reader-pro`（之後不要刪除或搬動）。
2. 到 `chrome://extensions`，打開右上角「開發人員模式」。
3. 按「載入未封裝項目」，選解壓縮出來、裡面有 `manifest.json` 的資料夾。
4. 安裝後會自動開啟歡迎頁，照著開啟「**允許存取檔案網址**」，本機的 `.md` 才會被渲染。

更新時解壓縮新版覆蓋原資料夾，再到 `chrome://extensions` 按「重新載入」↻ 即可，設定會保留。
zip 內附的 `安裝說明.txt` 有更完整的說明與常見問題。

### 從原始碼建置

需要 Node.js 16 以上。

```bash
# 安裝相依套件：照 pnpm-lock.yaml 鎖定的版本安裝，不會抓新版
npx pnpm@9 install --frozen-lockfile

# 建置到 extension/ 資料夾，之後用「載入未封裝項目」選 extension/
npx webpack --config ./build/webpack.prod.js

# 開發模式（存檔自動重建）
npx pnpm@9 run dev

# 建置並打包成要分享的 zip：dist/md-reader-pro-<版本>.zip
npx pnpm@9 run pack:share
```

出新版前，記得把 `src/manifest.json` 的 `version` 往上加，才分得出是哪一版。

## 專案結構

| 路徑                     | 內容                                                  |
| ------------------------ | ----------------------------------------------------- |
| `src/main.ts`            | Markdown 頁面的主程式（渲染、側邊欄、按鈕、自動刷新） |
| `src/core/markdown.ts`   | markdown-it 設定、插件與參數、frontmatter             |
| `src/core/files.ts`      | 側邊欄「檔案」分頁的資料夾樹                          |
| `src/dir-frame.ts`       | 讀取 Chrome 的 `file://` 資料夾列表；資料夾檢視頁     |
| `src/core/editor.ts`     | 編輯模式與存檔                                        |
| `src/core/tour.ts`       | 第一次開啟時的導覽                                    |
| `src/core/runtime.ts`    | 擴充更新後，已開分頁的斷線處理                        |
| `src/options/`           | 進階設定頁、歡迎頁                                    |
| `src/popup/`             | 工具列 popup                                          |
| `scripts/pack-share.mjs` | 打包分享用 zip                                        |
| `share/安裝說明.txt`     | 放進 zip 的中文安裝說明                               |

## 隱私

- 不收集、不上傳任何資料；沒有分析、追蹤或帳號系統。
- 唯一的網路請求是：重新讀取你正在看的那個 Markdown 網址（自動刷新用），以及文件裡引用的遠端圖片 / 連結（由瀏覽器直接載入）。
- 本機檔案只在瀏覽器裡渲染。資料夾列表是讀取 Chrome 內建的 `file://` 列表頁，結果只傳回同一個分頁。

## 授權與致謝

本專案修改自 [md-reader](https://github.com/md-reader/md-reader) 2.x 的開源版本（Copyright (c) 2018-present Bener），依 MIT License 發布，條款見 [LICENSE](./LICENSE)。

本專案為獨立維護的修改版，與原作者無關；相關問題請勿回報給原專案。
