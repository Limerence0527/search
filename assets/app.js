/* 比價小幫手 — 純前端，可直接部署到 GitHub Pages */
(() => {
  'use strict';

  // ---------- 平台 ----------
  const PLATFORMS = [
    { id: 'shopee', name: '蝦皮購物',      logo: '蝦', color: '#ee4d2d', match: /蝦皮|shopee/i, url: q => `https://shopee.tw/search?keyword=${q}` },
    { id: 'momo',   name: 'momo購物網',    logo: 'mo', color: '#d6006f', match: /momo/i,        url: q => `https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${q}` },
    { id: 'pchome', name: 'PChome 24h',    logo: 'PC', color: '#e3002b', match: /pchome/i,      url: q => `https://24h.pchome.com.tw/search/?q=${q}` },
    { id: 'yahoo',  name: 'Yahoo購物中心', logo: 'Y!', color: '#6001d2', match: /yahoo|雅虎/i,  url: q => `https://tw.buy.yahoo.com/search/product?p=${q}` },
    { id: 'ruten',  name: '露天拍賣',      logo: '露', color: '#f08a00', match: /露天|ruten/i,  url: q => `https://www.ruten.com.tw/find/?q=${q}` },
    { id: 'biggo',  name: 'BigGo 比價',    logo: 'BG', color: '#1f6feb', match: /biggo/i,       url: q => `https://biggo.com.tw/s/?q=${q}` },
    { id: 'feebee', name: '飛比價格',      logo: '飛', color: '#f5b400', match: /飛比|feebee/i, url: q => `https://feebee.com.tw/s/?q=${q}` },
    { id: 'google', name: 'Google 購物',   logo: 'G',  color: '#4285f4', match: /google/i,      url: q => `https://www.google.com/search?tbm=shop&q=${q}` },
  ];
  const platformColor = name => (PLATFORMS.find(p => p.match.test(name)) || { color: '#8a90a5' }).color;

  // ---------- 設定 ----------
  const store = {
    get(k, d = '') { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 無痕模式等情況忽略 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const getKey = () => store.get('cp.apiKey');
  const getModel = () => store.get('cp.model', 'claude-opus-5-5');
  const getMaxUses = () => Math.min(15, Math.max(1, parseInt(store.get('cp.maxUses', '6'), 10) || 6));

  // ---------- DOM ----------
  const $ = s => document.querySelector(s);
  const form = $('#searchForm'), qInput = $('#q'), btn = $('#searchBtn'), fileInput = $('#fileInput');
  const statusEl = $('#status'), loadingEl = $('#loading'), aiResult = $('#aiResult'), cardsEl = $('#cards');
  const sortSel = $('#sortSel'), filterEl = $('#platformFilter');
  const settingsDlg = $('#settingsDlg'), lightbox = $('#lightbox');

  const state = {
    image: null,      // { dataUrl, base64, mediaType }
    queryImage: null, // 這次搜尋使用的照片
    offers: [],
    visible: [],
    platform: 'all',
    lbIndex: 0,
    lbMode: 'offer',  // 'offer' | 'query'
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const fmtPrice = n => 'NT$ ' + Number(n).toLocaleString('zh-TW');
  const hasPrice = o => typeof o.price === 'number' && isFinite(o.price);

  // ---------- 提示 ----------
  function updateHint() {
    const on = !!getKey();
    const badge = $('#aiBadge');
    badge.textContent = on ? 'AI 已啟用' : 'AI 未啟用';
    badge.classList.toggle('on', on);
    const hint = $('#keyHint');
    hint.hidden = on;
    if (!on) hint.innerHTML = '目前只提供各平台搜尋連結。<button type="button" data-open-settings>設定 AI 金鑰</button> 即可自動比價、以圖搜圖。';
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-open-settings]')) openSettings(); });

  function showStatus(html, isError = false) {
    statusEl.hidden = !html;
    statusEl.classList.toggle('error', isError);
    statusEl.innerHTML = html || '';
  }

  function renderPlatformLinks(q) {
    if (!q) { $('#quickLinks').hidden = true; return; }
    const enc = encodeURIComponent(q);
    $('#platformLinks').innerHTML = PLATFORMS.map(p =>
      `<a class="plat" href="${esc(p.url(enc))}" target="_blank" rel="noopener noreferrer">
        <span class="plat-logo" style="background:${p.color}">${esc(p.logo)}</span>${esc(p.name)}<span class="arrow">↗</span>
      </a>`).join('');
    $('#quickLinks').hidden = false;
  }

  // ---------- 以圖搜圖：讀取、壓縮照片 ----------
  async function setImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const dataUrl = await resizeImage(file, 1280);
      state.image = { dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
      $('#imgChipThumb').src = dataUrl;
      $('#imgChip').hidden = false;
      qInput.placeholder = '可加上補充說明（選填），例如：要 256G';
      qInput.focus();
    } catch {
      showStatus('⚠️ 無法讀取這張照片，請換一張試試。', true);
    }
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  function clearImage() {
    state.image = null;
    $('#imgChip').hidden = true;
    fileInput.value = '';
    qInput.placeholder = '例如：AirPods Pro 2、Dyson V12、iPhone 17 256G';
  }

  fileInput.addEventListener('change', () => setImageFromFile(fileInput.files[0]));
  $('#imgRemove').addEventListener('click', clearImage);

  // 拖曳
  let dragDepth = 0;
  const overlay = $('#dropOverlay');
  const isFileDrag = e => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', e => { if (!isFileDrag(e)) return; e.preventDefault(); dragDepth++; overlay.hidden = false; });
  window.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; overlay.hidden = true; } });
  window.addEventListener('drop', e => {
    if (!isFileDrag(e)) return;
    e.preventDefault(); dragDepth = 0; overlay.hidden = true;
    setImageFromFile(e.dataTransfer.files[0]);
  });
  // 貼上
  window.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); setImageFromFile(item.getAsFile()); }
  });

  // ---------- Claude API ----------
  const API_URL = 'https://api.anthropic.com/v1/messages';

  function buildPrompt(q, withImage) {
    const target = withImage
      ? `使用者上傳了一張商品照片${q ? `，補充說明：「${q}」` : ''}。
請先仔細辨識照片中的商品（品牌、型號、顏色、容量/尺寸等），把辨識結果寫進 "identified"，再用辨識出的名稱去比價。若無法確定型號，就找最接近的款式並在 summary 說明。`
      : `請幫我比價這個商品：「${q}」`;
    return `你是台灣的購物比價助理。${target}

步驟：
1. 用網路搜尋在台灣的購物平台找這個商品（優先：蝦皮購物 shopee.tw、momo購物網 momoshop.com.tw、PChome 24h、Yahoo購物中心、露天拍賣，也可參考 BigGo、飛比等比價網）。
2. 盡量找到「同一款、同規格」的商品頁面，記下目前售價（新台幣）。規格不同（容量、顏色、版本）請在 note 說明。
3. 盡量用 web_fetch 打開商品頁，取得商品圖片網址（例如 og:image 或主圖）與主要規格；抓不到就留空字串，不要編造。
4. 只放你實際在搜尋結果或頁面中看到的連結與價格，不可捏造 URL 或價格。找不到價格時 price 設為 null。

最後只輸出一個 \`\`\`json 程式碼區塊，格式如下（不要其他多餘文字）：
\`\`\`json
{
  "identified": ${withImage ? '"從照片辨識出的商品（品牌 型號 規格）"' : 'null'},
  "product": "標準化的商品名稱",
  "image": "代表此商品的圖片網址，或空字串",
  "specs": ["共通主要規格1", "規格2"],
  "summary": "2~4 句中文結論：哪裡最便宜、價差多少、購買建議（例如注意運費、官方/平行輸入、二手）",
  "offers": [
    {
      "platform": "蝦皮購物",
      "title": "商品頁標題",
      "seller": "賣家或商店名稱；查不到留空字串",
      "shipping": "運費或免運條件；查不到留空字串",
      "availability": "庫存或出貨狀態；查不到留空字串",
      "price": 1234,
      "original_price": null,
      "url": "https://...",
      "image": "https://...圖片網址 或空字串",
      "specs": ["此賣場的規格重點"],
      "note": "例如：含運/不含運、官方旗艦店、平行輸入、限時特價"
    }
  ]
}
\`\`\`
offers 請優先依商品符合程度排序，最多 24 筆，盡可能涵蓋不同平台與不同商家的個別商品頁。seller、shipping、availability 只能填頁面明確提供的資訊。圖片必須對應該筆商品，不要用平台 Logo。`;
  }

  async function callClaude(messages, { useFallback }) {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2026-10-21',
      // 允許瀏覽器直接呼叫（金鑰為使用者自己的，只存於本機）
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    const body = {
      model: getModel(),
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      tools: [
        {
          type: 'web_search_20260209', name: 'web_search', max_uses: getMaxUses(),
          user_location: { type: 'approximate', country: 'TW', timezone: 'Asia/Taipei' },
        },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 },
      ],
      messages,
    };
    if (useFallback) {
      headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
      body.fallbacks = 'default';
    }
    const res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function aiSearch(q, image) {
    const content = [];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } });
    content.push({ type: 'text', text: buildPrompt(q, !!image) });
    const messages = [{ role: 'user', content }];

    let useFallback = true;
    let rounds = 0;
    while (true) {
      let resp;
      try {
        resp = await callClaude(messages, { useFallback });
      } catch (e) {
        // 若帳號/模型不支援 fallbacks 參數，改用不帶 fallbacks 的請求重試
        if (useFallback && e.status === 400 && /fallback/i.test(e.message)) { useFallback = false; continue; }
        throw e;
      }
      if (resp.stop_reason === 'refusal') throw new Error('AI 拒絕了這次請求，請換個關鍵字或照片再試。');
      // 伺服器端工具執行較久會回 pause_turn，把內容接回去繼續
      if (resp.stop_reason === 'pause_turn' && rounds++ < 4) {
        messages.push({ role: 'assistant', content: resp.content });
        continue;
      }
      const text = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      return parseResult(text);
    }
  }

  function parseResult(text) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    let raw = fenced ? fenced[1] : text;
    if (!fenced) {
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
    }
    try {
      const obj = JSON.parse(raw);
      if (!Array.isArray(obj.offers)) obj.offers = [];
      return obj;
    } catch {
      throw new Error('AI 回傳格式無法解析，請再試一次。');
    }
  }

  // ---------- 載入動畫 ----------
  let timer = null;
  function startLoading(withImage) {
    const t0 = Date.now();
    const steps = withImage
      ? ['正在辨識照片中的商品…', '搜尋各平台價格中…', '整理價格、照片與規格…']
      : ['搜尋各平台價格中…', '比對商品規格…', '整理價格、照片與規格…'];
    loadingEl.hidden = false;
    const tick = () => {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('#loadingText').textContent = steps[Math.min(steps.length - 1, Math.floor(s / 20))];
      $('#elapsed').textContent = `已經過 ${s} 秒（通常 30 秒～2 分鐘）`;
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  function stopLoading() { clearInterval(timer); loadingEl.hidden = true; }

  // ---------- 顯示結果 ----------
  function normalizeOffer(o) {
    const n = v => (v === null || v === undefined || v === '') ? null : Number(String(v).replace(/[^\d.]/g, '')) || null;
    return {
      seller: String(o.seller || ''),
      shipping: String(o.shipping || ''),
      availability: String(o.availability || ''),
      platform: String(o.platform || '其他'),
      title: String(o.title || ''),
      price: n(o.price),
      original_price: n(o.original_price),
      url: safeUrl(o.url),
      image: safeUrl(o.image),
      specs: Array.isArray(o.specs) ? o.specs.slice(0, 6).map(String) : [],
      note: String(o.note || ''),
    };
  }

  function renderResult(r, query) {
    state.offers = r.offers.map(normalizeOffer).filter(o => o.url);
    state.platform = 'all';
    const fallbackImg = safeUrl(r.image);
    // 各賣場圖片獨立顯示，避免將代表圖當成賣場實拍。
    state.offers.forEach(o => { o._sharedImg = !!fallbackImg && o.image === fallbackImg; });

    // 你的照片
    const qp = $('#queryPhoto');
    qp.hidden = !state.queryImage;
    if (state.queryImage) $('#queryPhotoImg').src = state.queryImage.dataUrl;

    const idEl = $('#identified');
    idEl.hidden = !(state.queryImage && r.identified);
    idEl.textContent = r.identified ? '📷 AI 辨識：' + r.identified : '';

    $('#productName').textContent = r.product || query || '搜尋結果';
    $('#productSpecs').innerHTML = (Array.isArray(r.specs) ? r.specs : []).slice(0, 8).map(s => `<span class="tag">${esc(s)}</span>`).join('');
    $('#summary').textContent = r.summary || '';

    // 最低價
    const priced = state.offers.filter(hasPrice).sort((a, b) => a.price - b.price);
    const bestBox = $('#bestBox');
    if (priced.length) {
      const best = priced[0], worst = priced[priced.length - 1];
      const save = worst.price - best.price;
      bestBox.innerHTML = `
        <span class="lbl">🏆 最低價</span>
        <span class="p">${esc(fmtPrice(best.price))}</span>
        <span class="where">${esc(best.platform)}</span>
        ${save > 0 ? `<span class="save">比最高價省 ${esc(fmtPrice(save))}</span>` : ''}
        <a href="${esc(best.url)}" target="_blank" rel="noopener noreferrer">前往購買 →</a>`;
      bestBox.hidden = false;
    } else {
      bestBox.hidden = true;
    }

    // 平台篩選
    const counts = {};
    state.offers.forEach(o => { counts[o.platform] = (counts[o.platform] || 0) + 1; });
    filterEl.innerHTML = [['all', '全部', state.offers.length], ...Object.entries(counts).map(([k, v]) => [k, k, v])]
      .map(([k, label, n]) => `<button type="button" class="filter${k === 'all' ? ' on' : ''}" data-p="${esc(k)}">${esc(label)}<span class="n">${n}</span></button>`)
      .join('');

    aiResult.hidden = false;
    renderCards();
    aiResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCards() {
    const dir = sortSel.value === 'price-desc' ? -1 : 1;
    state.visible = state.offers
      .filter(o => state.platform === 'all' || o.platform === state.platform)
      .sort((a, b) => {
        if (sortSel.value === 'relevance') return 0;
        if (!hasPrice(a) && !hasPrice(b)) return 0;
        if (!hasPrice(a)) return 1;
        if (!hasPrice(b)) return -1;
        return (a.price - b.price) * dir;
      });
    const resultCount = $('#resultCount');
    if (resultCount) resultCount.textContent = `商品預覽 · ${state.visible.length} 筆`;
    const priced = state.offers.filter(hasPrice);
    const min = priced.length ? Math.min(...priced.map(o => o.price)) : null;

    if (!state.visible.length) {
      cardsEl.innerHTML = '<p class="empty">沒有找到可用的商品連結，請試試上方「到各平台查看」。</p>';
      return;
    }
    cardsEl.innerHTML = state.visible.map((o, i) => {
      const best = min !== null && o.price === min;
      const off = o.original_price && hasPrice(o) && o.original_price > o.price
        ? Math.round((1 - o.price / o.original_price) * 100) : 0;
      return `<article class="card${best ? ' best' : ''}">
        ${best ? '<span class="ribbon">🏆 最便宜</span>' : ''}
        ${off >= 5 ? `<span class="discount">-${off}%</span>` : ''}
        <button type="button" class="thumb" data-i="${i}" aria-label="預覽 ${esc(o.title || o.platform)} 的商品照片">
          ${thumbHtml(o)}
          ${o._sharedImg ? '<span class="image-label">商品代表圖</span>' : ''}
          <span class="zoom" aria-hidden="true">⤢</span>
        </button>
        <div class="body">
          <span class="pf"><span class="dot" style="background:${platformColor(o.platform)}"></span>${esc(o.platform)}</span>
          <a class="name" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer" title="${esc(o.title)}">${esc(o.title || '查看商品詳情')}</a>
          ${hasPrice(o)
            ? `<div class="price">${esc(fmtPrice(o.price))}${off ? `<s>${esc(fmtPrice(o.original_price))}</s>` : ''}</div>`
            : '<div class="price na">價格請見連結</div>'}
          ${o.seller ? `<div class="seller">店家 · ${esc(o.seller)}</div>` : ''}
          ${o.shipping || o.availability ? `<div class="offer-meta">${[o.shipping, o.availability].filter(Boolean).map(v => `<span>${esc(v)}</span>`).join('')}</div>` : ''}
          ${o.specs.length ? `<div class="specs">${o.specs.slice(0, 3).map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
          ${o.note ? `<div class="note">💡 ${esc(o.note)}</div>` : ''}
          <a class="go" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">前往 ${esc(o.platform)} →</a>
        </div>
      </article>`;
    }).join('');
  }

  const NOIMG = '<span class="noimg"><b>▧</b>商家未提供可用圖片<span>可點擊查看商品資訊</span></span>';
  const thumbHtml = o => o.image
    ? `<img class="offer-img" src="${esc(o.image)}" alt="${esc(o.title)}" loading="lazy" referrerpolicy="no-referrer">`
    : NOIMG;

  // 圖片載入失敗（防盜連等）時改顯示預設圖
  document.addEventListener('error', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.classList.contains('offer-img')) {
      const span = document.createElement('span');
      span.innerHTML = NOIMG;
      img.replaceWith(span.firstChild);
    }
  }, true);

  // ---------- 照片預覽 ----------
  function openLightbox(index) {
    state.lbMode = 'offer';
    state.lbIndex = index;
    renderLightbox();
    if (!lightbox.open) lightbox.showModal();
  }
  function openQueryPhoto() {
    state.lbMode = 'query';
    renderLightbox();
    if (!lightbox.open) lightbox.showModal();
  }

  function renderLightbox() {
    const media = $('#lbMedia'), info = $('#lbInfo');
    const many = state.lbMode === 'offer' && state.visible.length > 1;
    $('#lbPrev').hidden = $('#lbNext').hidden = !many;

    if (state.lbMode === 'query') {
      media.innerHTML = `<div class="lb-pane"><img src="${esc(state.queryImage.dataUrl)}" alt="你上傳的照片"></div>`;
      const ident = $('#identified').textContent;
      info.innerHTML = `<span class="counter">你上傳的照片</span>
        <h3>${esc($('#productName').textContent)}</h3>
        ${ident ? `<p class="muted">${esc(ident)}</p>` : ''}
        <p class="muted small">點商品卡片的照片，可以和找到的商品並排比對是否為同一款。</p>`;
      return;
    }

    const o = state.visible[state.lbIndex];
    if (!o) return;
    const offerPane = `<div class="lb-pane">${state.queryImage ? '<span class="cap">平台商品</span>' : ''}${
      o.image ? `<img class="offer-img" src="${esc(o.image)}" alt="${esc(o.title)}" referrerpolicy="no-referrer">` : NOIMG}</div>`;
    const queryPane = state.queryImage
      ? `<div class="lb-pane"><span class="cap">你的照片</span><img src="${esc(state.queryImage.dataUrl)}" alt="你上傳的照片"></div>` : '';
    media.innerHTML = offerPane + queryPane;

    info.innerHTML = `
      <span class="counter">${state.lbIndex + 1} / ${state.visible.length}</span>
      <span class="pf"><span class="dot" style="background:${platformColor(o.platform)}"></span>${esc(o.platform)}</span>
      <h3>${esc(o.title)}</h3>
      ${hasPrice(o)
        ? `<div class="price">${esc(fmtPrice(o.price))}${o.original_price > o.price ? `<s>${esc(fmtPrice(o.original_price))}</s>` : ''}</div>`
        : '<div class="price na">價格請見連結</div>'}
      ${o.seller ? `<p class="seller">店家 · ${esc(o.seller)}</p>` : ''}
      ${o.shipping || o.availability ? `<p class="note">${esc([o.shipping, o.availability].filter(Boolean).join(' · '))}</p>` : ''}
      ${o.specs.length ? `<ul>${o.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${o.note ? `<p class="note">💡 ${esc(o.note)}</p>` : ''}
      ${o._sharedImg ? '<p class="muted small">※ 此為商品代表圖，實際以賣場頁面為準</p>' : ''}
      <a class="go" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">前往 ${esc(o.platform)} 購買 →</a>`;
  }

  function lbStep(d) {
    if (state.lbMode !== 'offer' || !state.visible.length) return;
    state.lbIndex = (state.lbIndex + d + state.visible.length) % state.visible.length;
    renderLightbox();
  }

  cardsEl.addEventListener('click', e => {
    const t = e.target.closest('.thumb[data-i]');
    if (t) openLightbox(Number(t.dataset.i));
  });
  $('#queryPhoto').addEventListener('click', openQueryPhoto);
  $('#lbClose').addEventListener('click', () => lightbox.close());
  $('#lbPrev').addEventListener('click', () => lbStep(-1));
  $('#lbNext').addEventListener('click', () => lbStep(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  });
  // 手機左右滑動切換
  let touchX = null;
  lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    touchX = null;
  });

  // ---------- 搜尋 ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = qInput.value.trim();
    const image = state.image;
    if (!q && !image) { qInput.focus(); return; }

    renderPlatformLinks(q);
    aiResult.hidden = true;
    showStatus('');

    if (!getKey()) {
      showStatus(image
        ? '📷 以圖搜圖需要 AI 辨識照片。請先 <a href="#" data-open-settings>設定 Claude API 金鑰</a>，或手動用 <a href="https://lens.google.com/" target="_blank" rel="noopener">Google 智慧鏡頭</a> 上傳照片查詢。'
        : '已列出各平台搜尋連結。想要 AI 自動整理價格、照片與規格，請 <a href="#" data-open-settings>設定 Claude API 金鑰</a>。');
      return;
    }

    state.queryImage = image;
    btn.disabled = true;
    startLoading(!!image);
    try {
      const r = await aiSearch(q, image);
      stopLoading();
      if (!q && r.product) renderPlatformLinks(r.product);
      renderResult(r, q);
    } catch (err) {
      stopLoading();
      const m = err.status === 401 ? 'API 金鑰無效，請到「AI 設定」重新輸入。'
        : err.status === 429 ? '請求太頻繁或額度不足，請稍後再試。'
        : (err.message || '發生錯誤');
      showStatus('⚠️ ' + esc(m) + (q ? '　你仍可使用上方的平台搜尋連結。' : ''), true);
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelectorAll('.ex').forEach(b => b.addEventListener('click', () => {
    qInput.value = b.textContent;
    form.requestSubmit();
  }));

  sortSel.addEventListener('change', renderCards);
  filterEl.addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    state.platform = b.dataset.p;
    filterEl.querySelectorAll('.filter').forEach(c => c.classList.toggle('on', c === b));
    renderCards();
  });

  // ---------- 設定 ----------
  function openSettings() {
    $('#apiKey').value = getKey();
    $('#modelSel').value = getModel();
    $('#maxUses').value = getMaxUses();
    settingsDlg.showModal();
  }
  document.addEventListener('click', e => { if (e.target.closest('a[data-open-settings]')) e.preventDefault(); });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#saveSettings').addEventListener('click', () => {
    const k = $('#apiKey').value.trim();
    k ? store.set('cp.apiKey', k) : store.del('cp.apiKey');
    store.set('cp.model', $('#modelSel').value);
    store.set('cp.maxUses', String($('#maxUses').value));
    updateHint();
  });
  $('#clearKey').addEventListener('click', () => {
    store.del('cp.apiKey');
    $('#apiKey').value = '';
    updateHint();
  });

  // 支援網址參數 ?q=商品
  updateHint();
  const initQ = new URLSearchParams(location.search).get('q');
  if (initQ) { qInput.value = initQ; renderPlatformLinks(initQ); }
})();

