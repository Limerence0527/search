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
