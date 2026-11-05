/* 比價小幫手 — 純前端，可直接部署到 GitHub Pages */
(() => {
  'use strict';

  // ---------- 平台搜尋連結（不需 AI 也能用） ----------
  const PLATFORMS = [
    { id: 'shopee',  name: '蝦皮購物',     icon: '🛍️', url: q => `https://shopee.tw/search?keyword=${q}` },
    { id: 'momo',    name: 'momo購物網',   icon: '🟣', url: q => `https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${q}` },
    { id: 'pchome',  name: 'PChome 24h',   icon: '🔴', url: q => `https://24h.pchome.com.tw/search/?q=${q}` },
    { id: 'yahoo',   name: 'Yahoo購物中心', icon: '🟪', url: q => `https://tw.buy.yahoo.com/search/product?p=${q}` },
    { id: 'ruten',   name: '露天拍賣',     icon: '🟠', url: q => `https://www.ruten.com.tw/find/?q=${q}` },
    { id: 'biggo',   name: 'BigGo 比價',   icon: '📊', url: q => `https://biggo.com.tw/s/?q=${q}` },
    { id: 'feebee',  name: '飛比價格',     icon: '🐝', url: q => `https://feebee.com.tw/s/?q=${q}` },
    { id: 'google',  name: 'Google 購物',  icon: '🔎', url: q => `https://www.google.com/search?tbm=shop&q=${q}` },
  ];

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
  const form = $('#searchForm'), qInput = $('#q'), btn = $('#searchBtn');
  const statusEl = $('#status'), aiResult = $('#aiResult'), cardsEl = $('#cards');
  const summaryEl = $('#summary'), sortSel = $('#sortSel'), filterEl = $('#platformFilter');
  const dlg = $('#settingsDlg');

  let offers = [];
  let activePlatform = 'all';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const fmtPrice = n => (typeof n === 'number' && isFinite(n)) ? 'NT$ ' + n.toLocaleString('zh-TW') : '價格請見連結';

  function updateHint() {
    $('#keyHint').innerHTML = getKey()
      ? `AI 比價已啟用（${esc(getModel())}）。搜尋約需 30 秒～2 分鐘。`
      : '尚未設定 AI 金鑰：目前只提供各平台搜尋連結。點右上角「AI 設定」啟用自動比價。';
  }

  function renderPlatformLinks(q) {
    const enc = encodeURIComponent(q);
    $('#platformLinks').innerHTML = PLATFORMS.map(p =>
      `<a class="chip" href="${esc(p.url(enc))}" target="_blank" rel="noopener noreferrer">${p.icon} ${esc(p.name)}</a>`
    ).join('');
    $('#quickLinks').hidden = false;
  }

  function setStatus(html, isError = false) {
    statusEl.hidden = !html;
    statusEl.classList.toggle('error', isError);
    statusEl.innerHTML = html || '';
  }

  // ---------- Claude API ----------
  const API_URL = 'https://api.anthropic.com/v1/messages';

  function buildPrompt(q) {
    return `你是台灣的購物比價助理。請幫我比價這個商品：「${q}」

步驟：
1. 用網路搜尋在台灣的購物平台找這個商品（優先：蝦皮購物 shopee.tw、momo購物網 momoshop.com.tw、PChome 24h、Yahoo購物中心、露天拍賣，也可參考 BigGo、飛比等比價網）。
2. 盡量找到「同一款、同規格」的商品頁面，記下目前售價（新台幣）。規格不同（容量、顏色、版本）請在 note 說明。
3. 可以用 web_fetch 打開商品頁取得商品圖片網址（如 og:image）與主要規格；抓不到就留空字串，不要編造。
4. 只放你實際在搜尋結果或頁面中看到的連結與價格，不可捏造 URL 或價格。找不到價格時 price 設為 null。

最後只輸出一個 \`\`\`json 程式碼區塊，格式如下（不要其他多餘文字）：
\`\`\`json
{
  "product": "標準化的商品名稱",
  "specs": ["共通主要規格1", "規格2"],
  "summary": "2~4 句中文結論：哪裡最便宜、價差多少、購買建議（例如注意運費、官方/平行輸入、二手）",
  "offers": [
    {
      "platform": "蝦皮購物",
      "title": "商品頁標題",
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
offers 請依 price 由低到高排序，最多 12 筆。`;
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
      const msg = data?.error?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function aiSearch(q) {
    const messages = [{ role: 'user', content: buildPrompt(q) }];
    let useFallback = true;
    let steps = 0;
    while (true) {
      let resp;
      try {
        resp = await callClaude(messages, { useFallback });
      } catch (e) {
        // 若帳號/模型不支援 fallbacks 參數，改用不帶 fallbacks 的請求重試一次
        if (useFallback && e.status === 400 && /fallback/i.test(e.message)) {
          useFallback = false;
          continue;
        }
        throw e;
      }
      if (resp.stop_reason === 'refusal') throw new Error('AI 拒絕了這次請求，請換個關鍵字再試。');
      // 伺服器端工具執行太久會回 pause_turn，把內容接回去繼續
      if (resp.stop_reason === 'pause_turn' && steps++ < 4) {
        messages.push({ role: 'assistant', content: resp.content });
        setStatus(`<span class="spinner"></span>AI 仍在搜尋中…（第 ${steps + 1} 輪）`);
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

  // ---------- 顯示結果 ----------
  function normalizeOffer(o) {
    const n = v => (v === null || v === undefined || v === '') ? null : Number(String(v).replace(/[^\d.]/g, '')) || null;
    return {
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

  function renderResult(r) {
    offers = r.offers.map(normalizeOffer).filter(o => o.url);
    activePlatform = 'all';

    const specs = Array.isArray(r.specs) && r.specs.length ? `\n規格：${r.specs.map(String).join('、')}` : '';
    summaryEl.textContent = `${r.product ? '📦 ' + r.product + '\n' : ''}${r.summary || ''}${specs}`;

    const platforms = [...new Set(offers.map(o => o.platform))];
    filterEl.innerHTML = ['all', ...platforms].map(p =>
      `<button type="button" class="chip${p === 'all' ? ' on' : ''}" data-p="${esc(p)}">${p === 'all' ? '全部' : esc(p)}</button>`
    ).join('');

    aiResult.hidden = false;
    renderCards();
  }

  function renderCards() {
    const dir = sortSel.value === 'price-desc' ? -1 : 1;
    const list = offers
      .filter(o => activePlatform === 'all' || o.platform === activePlatform)
      .sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return (a.price - b.price) * dir;
      });
    const priced = offers.filter(o => o.price !== null);
    const min = priced.length ? Math.min(...priced.map(o => o.price)) : null;

    if (!list.length) {
      cardsEl.innerHTML = '<p class="muted">沒有找到可用的商品連結，請試試上方的平台搜尋連結。</p>';
      return;
    }
    cardsEl.innerHTML = list.map(o => {
      const best = min !== null && o.price === min;
      const img = o.image
        ? `<img src="${esc(o.image)}" alt="${esc(o.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'noimg',textContent:'🛒'}))">`
        : '<span class="noimg">🛒</span>';
      const orig = o.original_price && o.price && o.original_price > o.price
        ? `<small><s>${esc(fmtPrice(o.original_price))}</s></small>` : '';
      return `<article class="card${best ? ' best' : ''}">
        ${best ? '<span class="badge-best">最便宜</span>' : ''}
        <div class="thumb">${img}</div>
        <div class="body">
          <div class="platform">${esc(o.platform)}</div>
          <div class="name" title="${esc(o.title)}">${esc(o.title)}</div>
          <div class="price">${esc(fmtPrice(o.price))}${orig}</div>
          ${o.specs.length ? `<ul class="specs">${o.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
          ${o.note ? `<div class="note">💡 ${esc(o.note)}</div>` : ''}
          <a class="go" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">前往購買 →</a>
        </div>
      </article>`;
    }).join('');
  }

  // ---------- 事件 ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = qInput.value.trim();
    if (!q) return;
    renderPlatformLinks(q);
    aiResult.hidden = true;

    if (!getKey()) {
      setStatus('已列出各平台搜尋連結。想要 AI 自動整理價格、照片與規格，請到「AI 設定」輸入 Claude API Key。');
      return;
    }
    btn.disabled = true;
    setStatus('<span class="spinner"></span>AI 正在搜尋各平台價格，約需 30 秒～2 分鐘…');
    try {
      const r = await aiSearch(q);
      setStatus('');
      renderResult(r);
    } catch (err) {
      const m = err.status === 401 ? 'API Key 無效，請到「AI 設定」重新輸入。'
        : err.status === 429 ? '請求太頻繁或額度不足，請稍後再試。'
        : (err.message || '發生錯誤');
      setStatus('⚠️ ' + esc(m) + '　你仍可使用上方的平台搜尋連結。', true);
    } finally {
      btn.disabled = false;
    }
  });

  sortSel.addEventListener('change', renderCards);
  filterEl.addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    activePlatform = b.dataset.p;
    filterEl.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    renderCards();
  });

  $('#settingsBtn').addEventListener('click', () => {
    $('#apiKey').value = getKey();
    $('#modelSel').value = getModel();
    $('#maxUses').value = getMaxUses();
    dlg.showModal();
  });
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
  const initQ = new URLSearchParams(location.search).get('q');
  updateHint();
  if (initQ) { qInput.value = initQ; renderPlatformLinks(initQ); }
})();
