const ORIGIN = 'https://limerence0527.github.io';
const memoryCache = new Map();
const SOURCES = ['PChome 24h', 'momo 購物網', 'Yahoo 購物中心'];
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
    async () => schemaProducts(await fetchSource('https://tw.buy.yahoo.com/search/product?p='+encoded+'&pg='+page),SOURCES[2])
  ];
  const results = await Promise.allSettled(jobs.map(run=>run()));
  const items = [], sources = [];
  results.forEach((result,i)=>{const ok=result.status==='fulfilled';const products=ok?result.value:[];items.push(...products);sources.push({name:SOURCES[i],status:ok?(products.length?'ok':'empty'):'unavailable',count:products.length});});
  // Interleave sources so one retailer does not dominate the default grid.
  const groups=SOURCES.map(s=>items.filter(p=>p.platform===s));const mixed=[];
  for(let i=0;i<24;i++)groups.forEach(g=>{if(g[i])mixed.push(g[i])});
  return { query:q, page, items:mixed, sources, fetchedAt:new Date().toISOString(), disclaimer:'價格取自公開搜尋頁，可能有延遲；不同規格、配件與組合商品請自行確認，實際售價以賣場為準。' };
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
