const ORIGIN = 'https://limerence0527.github.io';
const memoryCache = new Map();
const SOURCES = ['PChome 24h', 'momo 購物網', 'Yahoo 購物中心', '蝦皮購物'];
const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
export function schemaProducts(html, platform) {
  const found = [];
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if ([node['@type']].flat().includes('Product')) {
      const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      const price = Number(offer?.price);
      const url = safeUrl(node.url || offer?.url);
      const image = safeUrl(Array.isArray(node.image) ? node.image[0] : typeof node.image === 'object' ? node.image?.url : node.image);
      if (url && node.name && offer?.price !== undefined && Number.isFinite(price) && price > 0 && (!offer.priceCurrency || offer.priceCurrency === 'TWD')) found.push({ id: platform + ':' + (node.sku || url), title: String(node.name).slice(0,300), price, image, url, platform, note: String(node.description || '').replace(/<[^>]*>/g,'').slice(0,160) });
      return;
    }
    Object.values(node).forEach(walk);
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1])); } catch { /* malformed source metadata is ignored */ }
  }
  return [...new Map(found.map(p=>[p.url,p])).values()].slice(0,24);
}
const decodeHtml = value => String(value || '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)));
export function shopeeProducts(html) {
  const blocks=[...html.matchAll(/<li\b[^>]*class=["'][^"']*\bjs-item-container\b[^"']*["'][^>]*>/gi)];
  const found=[];
  for(let i=0;i<blocks.length;i++) {
    const tag=blocks[i][0], block=html.slice(blocks[i].index,blocks[i+1]?.index||html.length);
    const attr=name=>decodeHtml(tag.match(new RegExp('\\b'+name+'=["\x27]([^"\x27]*)["\x27]','i'))?.[1]||'');
    if(!/^(spstore|shopee)$/.test(attr('data-provider')) || !/蝦皮/.test(attr('data-store')))continue;
    if(/class=["'][^"']*\bstockout\b/i.test(block))continue;
    const title=attr('data-title'),price=Number(attr('data-price')),url=safeUrl(attr('data-url'));
    const imgTags=[...block.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
    const img=imgTags.find(t=>/\bimgd4\b/.test(t));
    const image=safeUrl(decodeHtml(img?.match(/\bsrc=["']([^"']+)["']/i)?.[1]||''));
    const seller=decodeHtml(block.match(/data-qa-id=["']item-store-\d+["'][^>]*>([^<]+)/)?.[1]||'').trim();
    if(!title||!url.startsWith('https://feebee.com.tw/rd/')||!Number.isFinite(price)||price<=0)continue;
    found.push({id:'shopee:'+attr('data-id'),title:title.slice(0,300),price,image,url,platform:'蝦皮購物',seller,via:'飛比價格',note:'飛比收錄價格；點擊經飛比前往蝦皮，售價與庫存以賣場為準。'});
  }
  return [...new Map(found.map(p=>[p.id,p])).values()].slice(0,24);
}
const numbers={'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
export function normalizeProductText(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/air\s*pods?/g,' airpods ').replace(/i\s*phone/g,' iphone ').replace(/戴森/g,'dyson').replace(/象印/g,'zojirushi').replace(/任天堂/g,'nintendo').replace(/第?([一二三四五六七八九十]|\d+)代/g,(_,n)=>' '+(numbers[n]||n)+' ').replace(/(\d+)\s*g\b/g,'$1gb').replace(/[^\p{L}\p{N}.]+/gu,' ').replace(/\s+/g,' ').trim();
}
const accessories=/保護套|保護殼|耳機套|耳塞|耳帽|耳塞套|防塵貼|貼膜|保護貼|充電線|傳輸線|轉接頭|轉接器|掛繩|掛鉤|收納包|收納盒|支架|充電器|清潔|替換|零件|維修|空盒|包裝盒|收購|單耳|左耳|右耳|單邊|case\b|cover\b|ear\s*tips|cable\b|replacement/i;
export function matchesProduct(query,title) {
 const q=normalizeProductText(query), t=normalizeProductText(title), qc=q.replace(/\s/g,''),tc=t.replace(/\s/g,'');
 const wantsAccessory=accessories.test(query)||/充電盒|充電倉|充電艙/.test(query);
 if(!wantsAccessory && accessories.test(title))return false;
 if(!wantsAccessory && /適用於|適配|兼容|副廠|平替|高仿|仿製/.test(title))return false;
 if(!wantsAccessory && /組合包|搭售|加購|贈品|掛鉤組|清潔組|保護套\s*[+＋]|[+＋].*(保護套|清潔|充電線)/.test(title))return false;
 if(!wantsAccessory && /airpods/.test(q) && /充電盒|充電倉|充電艙/.test(title) && !/配備|搭配|附|含|充電盒版|with|藍牙耳機|藍芽耳機|無線耳機|降噪耳機/.test(title))return false;
 const tokens=q.match(/[a-z]+|\d+(?:\.\d+)?|[\u4e00-\u9fff]+/g)||[];
 for(const token of tokens) {
   if(/^\d/.test(token)) { if(!new RegExp('(?:^|[^0-9])'+token.replace(/\./g,'\\.')+'(?![0-9])').test(t)) return false; }
   else if(token==='apple' && /airpods|iphone|ipad|macbook/.test(qc) && /airpods|iphone|ipad|macbook/.test(tc))continue;
   else if(!tc.includes(token))return false;
 }
 const family=qc.includes('airpods')?'airpods':qc.includes('iphone')?'iphone':null;
 if(family) {
   const qAfter=qc.slice(qc.indexOf(family)+family.length);
   const gen=qAfter.match(/^(?:promax|pro|plus|mini|air|max)?(\d+)/)?.[1];
   const altGen=qAfter.match(/^(\d+)/)?.[1];
   if(gen||altGen) {
     const qVariants=['pro','max','plus','mini','air'].filter(v=>new RegExp(family+'.*'+v).test(qc));
     const tAfter=tc.slice(tc.indexOf(family)+family.length);
     const actual=tAfter.match(/^(?:(?:pro|max|plus|mini|air))*(\d+)/)?.[1];
     if(actual && actual!==(gen||altGen))return false;
     if(/\d+/.test(tAfter)&&!actual)return false;
     // Reject different variants of an explicitly requested model.
     for(const variant of ['pro','max','plus','mini','air']) {
       if(qVariants.includes(variant)!==new RegExp('^(?:pro|max|plus|mini|air|[0-9])*'+variant).test(tAfter))return false;
     }
   }
 }
 return tokens.length>0;
}

async function fetchSource(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(11000), headers: { 'Accept': 'text/html,application/json', 'User-Agent': 'ShoppingPreview/1.0' }, redirect:'follow' });
  if (!response.ok) throw new Error('upstream ' + response.status);
  const body = await response.text();
  if (body.length > 3000000) throw new Error('source too large');
  return body;
}
export async function searchProducts(q, page) {
  const encoded = encodeURIComponent(q);
  const jobs = [
    async () => {
      const data = JSON.parse(await fetchSource('https://ecshweb.pchome.com.tw/search/v3.3/all/results?q='+encoded+'&page='+page+'&sort=rnk/dc'));
      if(!Array.isArray(data.prods)) throw new Error('invalid product data');
      return data.prods.slice(0,20).filter(p=>p.Id && /^[A-Z0-9-]+$/.test(p.Id) && Number(p.price)>0).map(p=>({id:'pchome:'+p.Id,title:String(p.name),price:Number(p.price),image:p.picB?safeUrl('https://cs-a.ecimg.tw'+p.picB):'',url:'https://24h.pchome.com.tw/prod/'+p.Id,platform:SOURCES[0],note:String(p.describe||'').replace(/<[^>]*>/g,'').replace(/\\r|\\n/g,' ').slice(0,160)}));
    },
    async () => schemaProducts(await fetchSource('https://www.momoshop.com.tw/search/searchShop.jsp?keyword='+encoded+'&curPage='+page),SOURCES[1]),
    async () => schemaProducts(await fetchSource('https://tw.buy.yahoo.com/search/product?p='+encoded+'&pg='+page),SOURCES[2]),
    async () => shopeeProducts(await fetchSource('https://feebee.com.tw/s/'+encoded+'/?page='+page))
  ];
  const results = await Promise.allSettled(jobs.map(run=>run()));
  const items = [], sources = [];
  results.forEach((result,i)=>{const ok=result.status==='fulfilled';const products=ok?result.value:[];items.push(...products);sources.push({name:SOURCES[i],status:ok?(products.length?'ok':'empty'):'unavailable',count:products.length});});
  // Interleave sources so one retailer does not dominate the default grid.
  const groups=SOURCES.map(s=>items.filter(p=>p.platform===s));const mixed=[];
  for(let i=0;i<24;i++)groups.forEach(g=>{if(g[i])mixed.push({...g[i],matchesQuery:matchesProduct(q,g[i].title)})});
  return { query:q, page, items:mixed, sources, fetchedAt:new Date().toISOString(), disclaimer:'蝦皮商品由飛比公開收錄，連結經飛比轉往蝦皮；非蝦皮即時報價。其他價格取自公開搜尋頁，可能有延遲；不同規格、配件與組合商品請自行確認，實際售價以賣場為準。' };
}
function headers(request) {
  const origin=request.headers.get('Origin');
  return { 'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':origin===ORIGIN?origin:ORIGIN, 'Access-Control-Allow-Methods':'GET, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type', 'Vary':'Origin', 'X-Content-Type-Options':'nosniff' };
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);const h=headers(request);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:h});
    if(request.method!=='GET') return Response.json({error:'Method not allowed'},{status:405,headers:h});
    if(url.pathname==='/') return Response.json({service:'比價小幫手商品資料服務',sources:SOURCES,endpoint:'/api/search?q=商品名稱',cacheSeconds:600},{headers:h});
    if(url.pathname!=='/api/search') return Response.json({error:'Not found'},{status:404,headers:h});
    const q=(url.searchParams.get('q')||'').trim(); const page=Number(url.searchParams.get('page')||1);
    if(!q||q.length>100||!Number.isInteger(page)||page<1||page>5)return Response.json({error:'請輸入 1～100 字的商品名稱；頁碼須介於 1～5。'},{status:400,headers:h});
    const key=q.toLocaleLowerCase()+':'+page;
    const cached=memoryCache.get(key);
    if(cached && Date.now()-cached.time<600000) return Response.json(cached.data,{headers:{...h,'Cache-Control':'public, max-age=600','X-Result-Cache':'HIT'}});
    const data=await searchProducts(q,page);const allFailed=data.sources.every(s=>s.status==='unavailable');
    if(!allFailed) { if(memoryCache.size>=100)memoryCache.delete(memoryCache.keys().next().value);memoryCache.set(key,{time:Date.now(),data}); }
    const response=Response.json(data,{status:allFailed?502:200,headers:{...h,'Cache-Control':allFailed?'no-store':'public, max-age=600','X-Result-Cache':'MISS'}});
    return response;
  }
};
