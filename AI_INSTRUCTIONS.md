# 專案視覺與設計規範 (日系清新 / 無印風格)

## 1. 核心視覺風格 (Vibe & Aesthetic)
- 風格定位：日系自然、溫潤極簡、高留白感、注重視線舒緩與閱讀舒適度。
- 視覺氛圍：柔和、輕盈、無壓迫感，避免強烈的對比與刺眼的純黑/純白。

## 2. 色彩系統 (Color Palette - Tailwind Class)
- 主背景色 (Main Background)：`bg-[#FBF9F5]` 或 `bg-[#F7F5F0]`（暖米白/燕麥色，絕對不要用 `#FFFFFF` 當大面積背景）。
- 卡片/區塊背景 (Surface)：`bg-white`（純白做為卡片襯底，與暖米背景拉出極微小的質感層次）。
- 主要文字 (Primary Text)：`text-[#333333]` 或 `text-[#2D2B2A]`（深炭灰/暖黑，切勿使用純黑 `#000000`）。
- 次要文字 (Secondary Text)：`text-[#78746D]` 或 `text-[#8C857B]`（柔和灰褐）。
- 點綴/強調色 (Accent)：`bg-[#8A9A86]`（沉穩苔綠）或 `bg-[#C8B195]`（木質原色）或 `bg-[#D9826C]`（日系暖陶紅）。
- 邊框顏色 (Border)：`border-[#EAE5D9]` 或 `border-black/5`（極淡的溫暖線條，避免高對比線條）。

## 3. 字體與排版 (Typography)
- 字體搭配：極簡無襯線體，行高與字距要拉開（`tracking-wide` 或 `tracking-wider`）。
- 標題層次：字級適中，不使用粗暴的大粗體，優先選用 `font-medium` 或 `font-normal`。
- 內文體驗：行高放鬆（`leading-relaxed` 或 `leading-loose`），確保極佳閱讀性。

## 4. 圓角與陰影 (Radius & Shadow)
- 圓角規範：微圓角 `rounded-lg` 或 `rounded-md`（自然乾淨，避免過度圓潤像卡通感）。
- 陰影規範：儘量不使用傳統陰影。若需要，僅使用極淡的擴散陰影 `shadow-[0_4px_20px_rgba(0,0,0,0.03)]`。

## 5. 留白與間距 (Spacing & Breathability)
- 頁面邊距：極大的 Padding 與 Margin（例如容器內縮 `px-8 py-12` 或 `space-y-8`），打造空氣感。



---

> 以下技術規範與 `.cursor/rules/*.mdc` 內容相同（去掉 Cursor 專用檔頭）；修改時請兩邊一起更新。
> 用 ChatGPT / Claude 網頁版時，把本檔全文貼在提示詞最前面。

## 專案：比價小幫手

台灣購物比價網站。輸入商品名稱後，顯示 PChome、momo、Yahoo 與蝦皮（經飛比價格收錄）的商品圖片與價格預覽，預設以嚴格比對濾掉配件與不同型號，並提供露天、BigGo、Google 購物等平台的搜尋入口。

### 技術棧
- Next.js（App Router）+ React + TypeScript（strict）
- Tailwind CSS v4（`app/globals.css`，以 `@theme inline` 定義設計變數）
- shadcn/ui 元件模式（`components/ui/`，用 `@/lib/utils` 的 `cn()` 合併 class）
- 圖示：`lucide-react`
- 商品資料後端：`backend/worker.mjs`（Worker ESM），前端在 `components/product-results.tsx` 的 `API` 常數呼叫它

### 目錄
- `app/`：`layout.tsx`、`page.tsx`、`globals.css`
- `components/`：頁面元件；`components/ui/`：shadcn 基礎元件
- `lib/utils.ts`：`cn()`
- `backend/worker.mjs`：抓取公開商品資料的 API
- 根目錄的 `index.html`、`404.html`、`_next/`、`_not-found/`、`404/`、`*.txt` 是 **`npm run build` 產生的檔案**（從 `out/` 複製），**不可手動修改**

### 部署（GitHub Pages）
- `next.config.ts`：`output: "export"`、`basePath: "/search"`、`trailingSlash: true`、`images.unoptimized: true`
- 發佈流程：`npm run build` → 把 `out/` 內容複製到專案根目錄（保留 `.nojekyll`）→ 提交。只改原始碼而不更新產物，網站不會變。

### 硬性限制
- 必須維持可靜態匯出：不可使用 Server Actions、Route Handlers（`app/api`）、`cookies()`/`headers()` 等動態伺服器功能、需要伺服器的 `next/image` 最佳化。
- **不可**把任何 API 金鑰、token 寫進程式碼或提交（`.env*` 已在 `.gitignore`）。
- 不可捏造商品、價格或連結；所有外部資料視為不可信。
- 修改後執行 `npm run typecheck` 與 `npm run build` 確認通過。

### 規則優先順序
`.cursor/rules/acr-*.mdc` 是從 awesome-cursorrules 原文照錄的通用規則，只作為一般寫法參考。**與本專案規則衝突時，一律以本檔與其他非 `acr-` 規則為準**。已知衝突：
- 「優先使用 Server Components / SSR、在伺服器端抓資料、Server Actions、伺服器端驗證」→ 本專案是靜態匯出，**沒有伺服器**。互動頁面用 `"use client"`，資料由前端 `fetch` 呼叫 `backend/worker.mjs`。
- 「用 `next/image` 最佳化、WebP」→ 靜態匯出關閉了最佳化；商品圖來自外部商家，用一般 `<img>`。
- 「Zod、Suspense 包 client component、dynamic import」→ Zod 目前未安裝，除非使用者要求，不要為此新增套件或重構。
- 「tailwind.config.js、purge 設定」→ 本專案用 Tailwind v4，設定寫在 `app/globals.css` 的 `@theme`，沒有 config 檔。
- 「檔案放在 `src/`」→ 本專案沒有 `src/`，直接用 `app/`、`components/`、`lib/`。
- 「Builder / Repository / Factory / 依賴注入、`types/` 目錄、barrel exports」→ 專案很小，不要為此重構；型別就近定義。
- 「撰寫單元測試（React Testing Library）」→ 目前沒有測試框架；新增前先徵求使用者同意。
- 「先寫詳細虛擬碼並等待確認」→ 小改動直接做；大改動先簡述計畫即可。
- 視覺（顏色、圓角、陰影、字重）一律依 `design.mdc`，不採用通用規則的預設風格。

### 溝通
- 介面文字、程式註解與回覆使用者一律使用**繁體中文（台灣用語）**。
- 修改前先閱讀相關檔案；改動保持精簡，不做與需求無關的重構。

## Next.js / React 規範

### 元件
- 有狀態、事件、`useEffect`、`window`/`localStorage` 的元件，檔案開頭加 `"use client"`。
- 匯入一律用 `@/` 別名（例如 `@/components/ui/button`）。
- 基礎元件（Button、Input、Badge、Card…）放 `components/ui/`，沿用 shadcn 寫法：`cva` 定義 variants、`cn()` 合併 class、支援 `asChild`（`@radix-ui/react-slot`）。新增元件前先看 `components/ui/` 是否已有。
- 圖示用 `lucide-react`，不要再引入其他圖示庫。

### TypeScript
- strict 模式；不要用 `any`，外部 API 回應要先定義型別（參考 `components/product-results.tsx` 的 `Product`、`Source`、`Result`；選填欄位如 `seller`、`via` 要處理不存在的情況）並驗證欄位（例如 `Array.isArray(data.items)`）。

### 資料請求
- 在 client 端用 `fetch` + `AbortController`，設定逾時，`useEffect` cleanup 中 abort，避免卸載後 setState。
- `credentials: "omit"`；錯誤顯示友善的繁體中文訊息並提供「重新搜尋」。
- 不可在前端放任何金鑰。

### 外部連結與圖片
- 外部連結：`target="_blank" rel="noopener noreferrer"`。
- 商品圖片：用一般 `<img>`（靜態匯出），加 `loading="lazy"`、`referrerPolicy="no-referrer"`、`onError` 時顯示佔位（`ImageOff` 圖示 + 文字）。

### 無障礙
- 互動元素用 `<button>` / `<a>`；只有圖示的按鈕要 `aria-label`。
- 篩選按鈕用 `aria-pressed`；載入用 `role="status"`、錯誤用 `role="alert"`、結果數用 `aria-live="polite"`。
- 尊重 `prefers-reduced-motion`。
- 網址參數 `?q=` 與 Ctrl/Cmd + K 聚焦搜尋要保留。

## 後端 Worker 規範

### 介面
- `GET /api/search?q=商品名稱&page=1`；`q` 1～100 字、`page` 1～5，否則回 400。
- 回應格式必須與前端 `components/product-results.tsx` 的型別一致：
  `{ query, page, items: Product[], sources: { name, status: "ok" | "empty" | "unavailable", count }[], fetchedAt, disclaimer }`
  `Product = { id, title, price, image, url, platform, note, matchesQuery, seller?, via? }`。改欄位時前後端一起改。
- 只允許 `GET`、`OPTIONS`；CORS 只開放 `ORIGIN`（`https://limerence0527.github.io`）。

### 抓取來源
- 每個來源各自一個 job，用 `Promise.allSettled`；單一來源失敗只標記 `unavailable`，不影響其他來源。全部失敗才回 502。
- `fetch` 一律加 `AbortSignal.timeout(...)` 並限制回應大小。
- momo / Yahoo 從頁面的 JSON-LD（`schemaProducts()`）取資料；PChome 用其搜尋 JSON。只收價格 > 0、幣別 TWD、有名稱與網址的商品。
- 蝦皮：不直接抓蝦皮，而是解析飛比價格搜尋頁中收錄的蝦皮商品（`shopeeProducts()`）；連結必須是 `https://feebee.com.tw/rd/` 開頭，`via: "飛比價格"`，並在 `note`／免責聲明說明非蝦皮即時報價。缺貨（`stockout`）不收。
- HTML 屬性與文字先經 `decodeHtml()` 解碼。

### 商品比對
- 每筆商品附 `matchesQuery = matchesProduct(q, title)`；前端預設「嚴格比對」只顯示 `matchesQuery === true`，使用者可切換顯示全部。
- `normalizeProductText()` 統一全半形、大小寫、中英品牌名（戴森→dyson 等）與中文數字；新增品牌別名加在這裡。
- 除非查詢本身就是配件，否則排除配件、副廠／相容品、組合包；指定型號時（例如 AirPods Pro 2、iPhone 17 Pro）不可混入不同世代或不同變體（Pro / Max / Plus / mini / Air）。
- 修改比對規則時，用實際商品標題舉例驗證「該留的有留、該濾的有濾」，避免誤刪正品。
- 所有網址、圖片網址都經 `safeUrl()`（只允許 https）；文字去除 HTML 標籤並截斷長度。
- 結果依來源交錯排列，避免單一商城佔滿版面。

### 快取與限制
- 記憶體快取 10 分鐘、最多 100 筆；全部來源失敗時不快取並回 `Cache-Control: no-store`。
- 不需要也不可加入任何模型或搜尋 API 金鑰；若未來需要密鑰，使用部署平台的環境變數，不可寫進程式碼。
- 尊重來源網站的使用條款與流量；不要加大量平行請求或繞過防護。
