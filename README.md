# 比價小幫手

深色科技風格的台灣購物搜尋入口，以 Next.js App Router、Tailwind CSS 與 shadcn/ui 組件模式建置。共用 UI 元件放在 `components/ui/`，透過 `@/components/ui/` 引用。

## 功能

- 輸入商品名稱後，取得蝦皮、momo、PChome、Yahoo、露天、BigGo、飛比及 Google 購物搜尋入口。
- 依商城／比價平台篩選，熱門關鍵字快速搜尋。
- 支援 `?q=商品名稱`，Ctrl/Cmd + K 聚焦搜尋。
- 手機版、鍵盤操作與減少動態效果設定。

AI 呼叫、API 金鑰設定、圖片辨識與照片上傳功能已移除。開啟新版時會清除舊版存於瀏覽器的 `cp.apiKey`、`cp.model`、`cp.maxUses`。

目前沒有即時商品資料來源，因此不提供站內商品圖片、價格或庫存；必須前往各平台查看。

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
