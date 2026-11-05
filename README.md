# 🔍 比價小幫手

輸入商品名稱或**上傳商品照片（以圖搜圖）**，AI 自動到 **蝦皮、momo、PChome、Yahoo購物中心、露天** 等台灣購物平台搜尋，列出各平台價格、商品照片、規格與購買連結，並標示「最便宜」的管道。



## 功能

- 🛒 **平台快速搜尋**：不需任何設定，一鍵開啟各平台/比價網的搜尋結果
- 🤖 **AI 比價**（選用）：使用 Claude API + 網路搜尋，整理出
  - 各平台售價（新台幣）、原價
  - 商品照片、規格重點、備註（運費、旗艦店、平行輸入等）
  - 「最便宜」標示與 AI 購買建議
- 📷 **以圖搜圖**（需 AI）：點相機按鈕上傳/拍照，或直接拖曳、Ctrl+V 貼上截圖；AI 先辨識商品型號再比價
- 🖼️ **照片預覽**：點商品照片可放大檢視，左右切換（手機可滑動），並與你上傳的照片並排比對是否同款
- 🏆 最低價摘要、折扣標示、比最高價省多少
- ↕️ 依價格排序、依平台篩選
- 🔗 支援網址參數：`https://<帳號>.github.io/search/?q=AirPods`
- 📱 手機版排版、深色模式

## 部署到 GitHub Pages

1. 把程式碼推到 `main` 分支
2. 到 GitHub repo → **Settings → Pages**
3. **Source** 選 **GitHub Actions**（已內建 `.github/workflows/pages.yml`）
4. 等 Actions 跑完，網址會是 `https://<你的帳號>.github.io/<repo名稱>/`

> 也可以 Source 選「Deploy from a branch」→ `main` / `(root)`，效果一樣。

## 啟用 AI 比價

1. 到 [console.anthropic.com](https://console.anthropic.com/) 申請 API Key
2. 打開網站 → 右上角「⚙️ AI 設定」→ 貼上金鑰 → 儲存

金鑰 **只存在你自己瀏覽器的 localStorage**，由瀏覽器直接送到 `api.anthropic.com`，不會寫進程式碼、也不會上傳到 GitHub。
⚠️ 請不要把金鑰寫死在程式碼裡 —— GitHub Pages 是公開的，任何人都看得到。

費用：每次搜尋會呼叫數次網路搜尋，依 Anthropic 計價收費。可在設定中調低「每次最多搜尋次數」或改用 Sonnet 以節省費用。

## 限制

- 蝦皮等平台不開放公開 API，瀏覽器也無法跨網域直接抓取頁面，所以價格是由 AI 透過網路搜尋取得，**可能有延遲或誤差**，下單前請點進連結確認。
- 部分平台圖片有防盜連，抓不到時會顯示 🛒 預設圖。

## 檔案結構

```
index.html            主頁面
assets/style.css      樣式
assets/app.js         搜尋、AI 呼叫、結果顯示
.github/workflows/    GitHub Pages 自動部署
```
