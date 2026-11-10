# AnyRead MD Privacy Policy

Last updated: 2026-11-10

AnyRead MD is a browser extension that displays, browses and edits Markdown
files. It is free, has no accounts and does not collect any data.

## What the extension does with your data

- **No data collection.** The extension does not collect, store, sell or
  share any personal information, browsing history, file contents or usage
  statistics. There is no analytics, tracking or crash reporting.
- **No servers.** The extension does not send anything to the developer or to
  any third-party server. It has no backend.
- **Files stay on your computer.** Markdown files you open (local `file://`
  files or web pages ending in `.md` and similar) are rendered inside your
  browser. Folder listings are read from the browser's own `file://` page.
  Auto refresh re-reads the same file you are viewing to detect changes.
- **Editing.** In edit mode, files are saved only to the location you choose
  in the browser's save dialog.
- **Settings.** Your preferences (theme, plugins, layout and similar) are
  saved with `chrome.storage.local` on your own device and never leave it.
- **Recent files.** The toolbar popup can list the files you opened recently
  (address and title). This list is stored only on your device, is never
  sent anywhere, and can be cleared or turned off in the settings.
- **Linked files and export.** When you click a link to another Markdown
  file, that file is read and shown next to the current one. Export builds a
  PDF or HTML file on your device. Neither sends anything to a server.

## Content inside your documents

If a Markdown document you open contains links or images that point to
websites (for example `![logo](https://example.com/logo.png)`), your browser
loads those images from that website, exactly as it would for a normal web
page. The extension does not add any requests of its own.

## Permissions

- `storage`: save your settings on your device.
- `scripting`: show the extra file types you choose in settings (for example
  `.c` or `.py`) as highlighted code.
- `activeTab`: when you click the toolbar icon, check whether the current
  tab is a Markdown file so the popup can offer to turn the extension on for
  that site.
- Access to file URLs: detect and render local Markdown files and folders
  you open. It must be turned on by you in the extension's details page.
- Access to websites (optional, off after install): render Markdown files
  on web sites. You grant it yourself, for one site or for all sites, and
  can remove it at any time in the settings.

## Changes

If this policy changes, the new version will be published at this address
with a new "Last updated" date.

## Contact

Questions: open an issue at <https://github.com/kuotungtsai/AnyRead-MD/issues>.

---

# AnyRead MD 隱私權政策

最後更新：2026-11-10

AnyRead MD 是用來顯示、瀏覽和編輯 Markdown 檔案的瀏覽器擴充功能。完全免費、
不需要帳號，也**不收集任何資料**。

- **不收集資料**：不收集、儲存、販售或分享任何個人資料、瀏覽紀錄、檔案內容或
  使用統計，也沒有任何分析、追蹤或錯誤回報。
- **不連到伺服器**：擴充不會把任何東西傳給開發者或第三方伺服器，也沒有後端。
- **檔案留在你的電腦**：你開啟的 Markdown 檔（本機 `file://` 或網址結尾是 `.md`
  等的網頁）都在瀏覽器裡排版顯示。資料夾列表是讀取瀏覽器本身的 `file://` 頁面。
  自動刷新只會重新讀取你正在看的同一個檔案。
- **編輯**：編輯模式只會存到你在存檔對話框選擇的位置。
- **設定**：主題、插件等偏好用 `chrome.storage.local` 存在你的裝置上，不會離開你的電腦。
- **最近開過的檔案**：工具列小視窗可以列出最近開過的檔案（網址和標題）。清單只存在
  你的裝置上，不會傳到任何地方，可以在設定頁清除或關閉。
- **連結的檔案與匯出**：點連到另一個 Markdown 檔的連結時，會讀取那個檔案並顯示在
  旁邊；匯出是在你的裝置上產生 PDF 或 HTML 檔。兩者都不會把資料傳到伺服器。
- **網站存取**：安裝後只處理本機檔案。網站上的 Markdown 檔要由你自己開啟（單一網站
  或所有網站），之後可以隨時在設定頁移除。
- **文件裡的外部圖片**：如果文件引用了網路上的圖片，瀏覽器會像開一般網頁一樣去載入
  那張圖片；擴充本身不會額外發出任何連線。

有問題請到 <https://github.com/kuotungtsai/AnyRead-MD/issues> 回報。
