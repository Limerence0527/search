# 比價小幫手

日系清新風格的台灣購物搜尋入口，以 Next.js App Router、Tailwind CSS 與 shadcn/ui 組件模式建置。共用 UI 元件放在 `components/ui/`，透過 `@/components/ui/` 引用。

## 功能

- 輸入商品名稱後，取得蝦皮、momo、PChome、Yahoo、露天、BigGo、飛比及 Google 購物搜尋入口。
- 依商城／比價平台篩選，熱門關鍵字快速搜尋。
- 支援 `?q=商品名稱`，Ctrl/Cmd + K 聚焦搜尋。
- 手機版、鍵盤操作與減少動態效果設定。

AI 呼叫、API 金鑰設定、圖片辨識與照片上傳功能已移除。開啟新版時會清除舊版存於瀏覽器的 `cp.apiKey`、`cp.model`、`cp.maxUses`。

商品預覽透過公開後端讀取 PChome 搜尋資料與 momo、Yahoo 公開頁面的 JSON-LD 商品資料。每筆顯示商家原有圖片、價格與商品連結，不使用 AI 或付費搜尋 API。支援來源篩選、價格排序與圖片失敗提示。

結果快取 10 分鐘；不同規格、配件與組合商品可能混在搜尋結果中。售價不是成交價保證，運費、庫存及優惠以商家頁面為準。公開頁面格式與存取限制可能改變；失敗來源會獨立標示，不影響其他來源。蝦皮商品透過飛比公開收錄的蝦皮賣場結果取得，價格可能延遲，連結先經飛比再前往蝦皮，並非蝦皮官方 API 或完整即時搜尋。沒有資料時顯示空結果，不捏造商品。

「只看本商品」預設開啟：排除常見配件、維修零件、單耳、組合包與不符查詢世代、型號、容量的標題。使用者若明確搜尋配件則保留對應配件。可關閉篩選，檢查可能被誤排的商品。此為標題規則比對，無法證明賣場所有選項均符合，不是 AI 真偽鑑定。

後端來源位於 `backend/worker.mjs`，入口為 `/api/search?q=商品名稱&page=1`；公開服務網址由 `components/product-results.tsx` 的 API 常數設定。可部署到支援標準 Worker ESM 的服務，無需模型或搜尋 API 金鑰。免費使用受託管服務的額度與來源網站可用性限制。

## 開發

```sh
npm ci
npm run dev
```

開啟 `http://localhost:3000/search/`。

```sh
npm run build
npm run typecheck
```

建置會輸出 `out/`。此專案以 `/search` 作為 basePath。部署其他路徑時，修改 `next.config.ts`。

## GitHub Pages

目前保留從分支根目錄部署的方式。提交發佈版本時，將 `out/` 的內容複製到專案根目錄（包含 `index.html`、`_next/`、`404.html` 等）並保留 `.nojekyll`；不要只更新來源碼。

舊有 `.github/workflows/pages.yml` 只監聽 main 分支，並非目前預設分支的部署來源。

## AI 開發工具

專案規範在 `AI_INSTRUCTIONS.md`（設計 + 技術），各工具會自動讀取：

| 工具 | 設定檔 | 內容 |
|---|---|---|
| Claude Code | `CLAUDE.md`、`.mcp.json` | 讀取規範；啟用 Playwright MCP |
| Cursor | `.cursor/rules/`、`.cursor/mcp.json` | 分檔規則；啟用 Playwright MCP |
| OpenCode | `opencode.json` | 讀取規範；啟用 Playwright MCP |
| Aider | `.aider.conf.yml` | 每次啟動以唯讀載入規範（Aider 預設會自動 commit） |
| ChatGPT / Claude 網頁版 | `AI_INSTRUCTIONS.md` | 全文貼在提示詞最前面 |

**Playwright MCP**：讓 AI 改完畫面後自己開瀏覽器、截圖檢查排版（需要 Node.js；預設使用本機 Chrome）。第一次啟用時，Claude Code／Cursor 會詢問是否信任專案的 MCP 設定。

**GitHub MCP**（讀 Issue、PR、分支）需要個人存取權杖（PAT），**不要放進專案**，請設定在自己的全域設定：

```bash
claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer 你的_GITHUB_PAT"}}' --scope user
```

Cursor 則寫在 `~/.cursor/mcp.json`（全域，不是專案內的 `.cursor/mcp.json`）：

```json
{ "mcpServers": { "github": { "url": "https://api.githubcopilot.com/mcp/", "headers": { "Authorization": "Bearer 你的_GITHUB_PAT" } } } }
```

**screenshot-to-code**：截圖喜歡的版面產生 HTML + Tailwind 後，只當參考，請 AI 依 `AI_INSTRUCTIONS.md`「AI 工具與畫面檢查」改寫成本專案的 TSX 元件與設計規範，不要直接貼上。


### 型號篩選修正

完整型號須與品名連續對應（例如 AirPods Pro 2），不再從其他裝置的適用清單借用數字。充電座、充電盤與耳機殼會排除；中文「第 2 代」、Pro2 等寫法統一比對。多型號賣場附上待確認原因，預設不視為精準符合；附贈配件不會把本體一起誤排。

同一份飛比公開索引也納入 iOPEN Mall，逐筆標示來源，不額外增加抓取請求。二手／福利品依標題標示，價格及完整規格以商家頁面為準。來源只回配件時會顯示明確說明，不用錯誤商品填補結果。
