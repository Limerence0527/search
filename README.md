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
