const ORIGIN = 'https://limerence0527.github.io';
const memoryCache = new Map();
const SOURCES = ['PChome 24h', 'momo 購物網', 'Yahoo 購物中心', '蝦皮購物', 'iOPEN Mall'];
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
export function indexedProducts(html) {
  const blocks=[...html.matchAll(/<li\b[^>]*class=["'][^"']*\bjs-item-container\b[^"']*["'][^>]*>/gi)];
  const found=[];
  for(let i=0;i<blocks.length;i++) {
    const tag=blocks[i][0], block=html.slice(blocks[i].index,blocks[i+1]?.index||html.length);
    const attr=name=>decodeHtml(tag.match(new RegExp('\\b'+name+'=["\x27]([^"\x27]*)["\x27]','i'))?.[1]||'');
    const provider=attr('data-provider');
    const isShopee=/^(spstore|spstorevip|shopee)$/.test(provider)&&/蝦皮/.test(attr('data-store'));
    const isIopen=provider==='iopenmall'&&/iOPEN/i.test(attr('data-store'));
    if(!isShopee&&!isIopen)continue;
    if(/class=["'][^"']*\bstockout\b/i.test(block))continue;
    const title=attr('data-title'),price=Number(attr('data-price')),url=safeUrl(attr('data-url'));
    const imgTags=[...block.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
    const img=imgTags.find(t=>/\bimgd4\b/.test(t));
    const image=safeUrl(decodeHtml(img?.match(/\bsrc=["']([^"']+)["']/i)?.[1]||''));
    const seller=decodeHtml(block.match(/data-qa-id=["']item-store-\d+["'][^>]*>([^<]+)/)?.[1]||'').trim();
    if(!title||!url.startsWith('https://feebee.com.tw/rd/')||!Number.isFinite(price)||price<=0)continue;
    found.push({id:'indexed:'+attr('data-id'),title:title.slice(0,300),price,image,url,platform:isShopee?'蝦皮購物':'iOPEN Mall',seller,via:'飛比價格',note:'飛比收錄價格；點擊經飛比前往賣場，售價與庫存以賣場為準。'});
  }
  return [...new Map(found.map(p=>[p.id,p])).values()].slice(0,48);
}
export function shopeeProducts(html) {return indexedProducts(html).filter(p=>p.platform==='蝦皮購物');}
const numbers={'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
export function normalizeProductText(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/air\s*pods?/g,' airpods ').replace(/i\s*phone/g,' iphone ').replace(/戴森/g,'dyson').replace(/象印/g,'zojirushi').replace(/任天堂/g,'nintendo').replace(/第?\s*([一二三四五六七八九十]|\d+)\s*代/g,(_,n)=>' '+(numbers[n]||n)+' ').replace(/(\d+)\s*g\b/g,'$1gb').replace(/[^\p{L}\p{N}./]+/gu,' ').replace(/\s+/g,' ').trim();
}
const accessories=/保護套|保護殼|耳機殼|耳機套|耳塞|耳帽|防塵貼|貼膜|保護貼|充電線|傳輸線|轉接頭|轉接器|掛繩|掛鉤|掛勾|收納包|收納盒|收納套|支架|充電器|充電座|充電盤|充電板|充電架|充電底座|清潔|替換|零件|維修|空盒|包裝盒|收購|單耳|左耳|右耳|單邊|(?:^|\W)(?:case|cover|cable|charger|replacement)\b|ear\s*tips/i;
function productModels(text,family) {
 const normalized=normalizeProductText(text), found=[];
 const pattern=family==='airpods'?/airpods\s*(pro|max)?\s*(\d{1,2})?(?!\d)/g:/iphone\s*(\d{1,2})?(?!\d)\s*(pro\s*max|pro|max|plus|mini|air)?/g;
 const hits=[...normalized.matchAll(pattern)];
 hits.forEach((m,i)=>{
   const variant=(family==='airpods'?m[1]:m[2]||'')?.replace(/\s/g,'')||'base';
   const gen=(family==='airpods'?m[2]:m[1])||null;
   found.push({variant,gen});
   // 只解析同一個商品型號後的縮寫，不從其他裝置的適用清單借用數字。
   const tail=normalized.slice(m.index+m[0].length,hits[i+1]?.index||normalized.length).slice(0,65);
   for(const extra of tail.matchAll(/(?:\/\s*(pro|max|plus|mini|air)?\s*(\d{1,2})(?!\d))|(?:\b(pro|max|plus|mini|air)\s*(\d{1,2})(?!\d))/g)) {
     found.push({variant:(extra[1]||extra[3]||variant),gen:extra[2]||extra[4]});
   }
 });
 return [...new Map(found.map(m=>[m.variant+':'+m.gen,m])).values()];
}
export function classifyProduct(query,title) {
 const no=(reason,type='different')=>({matchesQuery:false,matchType:type,matchNote:reason});
 const q=normalizeProductText(query),qc=q.replace(/\s/g,''), family=qc.includes('airpods')?'airpods':qc.includes('iphone')?'iphone':null;
 // 贈送的小配件不是賣場主商品；保留本體，單獨販售的配件仍排除。
 const mainTitle=String(title).split(/(?:附贈|加贈|贈送|再贈|送好禮)/)[0];
 const t=normalizeProductText(mainTitle),tc=t.replace(/\s/g,'');
 const wantsAccessory=accessories.test(query)||/充電盒|充電倉|充電艙/.test(query);
 if(!wantsAccessory&&accessories.test(mainTitle))return no('配件或零件','accessory');
 if(!wantsAccessory&&/適用於|適配|兼容|副廠|平替|高仿|仿製/.test(mainTitle))return no('相容配件或非原商品','accessory');
 if(!wantsAccessory&&/組合包|搭售|加購|掛鉤組|清潔組|保護套\s*[+＋]|[+＋].*(保護套|清潔|充電線)/.test(mainTitle))return no('配件組合','accessory');
 if(!wantsAccessory&&family==='airpods'&&/充電盒|充電倉|充電艙/.test(mainTitle)&&!/配備|搭配|附|含|充電盒版|藍[牙芽]耳機|無線耳機|降噪耳機/.test(mainTitle))return no('標題未確認包含耳機本體','uncertain');
 const target=family?productModels(query,family)[0]:null;
 const models=family?productModels(mainTitle,family):[];
 if(target) {
   const matching=models.filter(m=>(!target.gen&&target.variant==='base'||m.variant===target.variant)&&(!target.gen||m.gen===target.gen));
   if(!matching.length)return no('完整型號或世代不符');
   if(target.gen&&!wantsAccessory&&models.some(m=>m.gen?(m.variant!==target.variant||m.gen!==target.gen):(m.variant!=='base'&&m.variant!==target.variant)))return no('同一賣場有多型號，請確認所選款式與對應價格','variant');
 }
 // 型號已用完整組合確認；其餘查詢條件（品牌、容量等）仍須吻合。
 const modelFree=family?q.replace(family==='airpods'?/airpods\s*(?:pro|max)?\s*\d*/g:/iphone\s*\d*\s*(?:pro\s*max|pro|max|plus|mini|air)?/g,''):q;
 const tokens=modelFree.match(/[a-z]+|\d+(?:\.\d+)?|[\u4e00-\u9fff]+/g)||[];
 for(const token of tokens) {
   if(token==='apple'&&family)continue;
   if(/^\d/.test(token)) {if(!new RegExp('(?:^|[^0-9])'+token.replace(/\./g,'\\.')+'(?![0-9])').test(t))return no('查詢規格不符');}
   else if(!tc.includes(token))return no('查詢名稱不符');
 }
 for(const m of modelFree.matchAll(/([a-z]+)\s*(\d+)/g))if(!new RegExp('(?:^|[^a-z0-9])'+m[1]+'\\s*'+m[2]+'(?![0-9])').test(t))return no('型號不符');
 return {matchesQuery:!!(family||tokens.length),matchType:'exact',matchNote:''};
}
export function matchesProduct(query,title) { return classifyProduct(query,title).matchesQuery; }

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
    async () => indexedProducts(await fetchSource('https://feebee.com.tw/s/'+encoded+'/?page='+page))
  ];
  const results = await Promise.allSettled(jobs.map(run=>run()));
  const items = [];
  results.forEach(result=>{if(result.status==='fulfilled')items.push(...result.value);});
  const sources=SOURCES.map((name,i)=>{const products=items.filter(p=>p.platform===name),ok=results[Math.min(i,3)].status==='fulfilled';return {name,status:ok?(products.length?'ok':'empty'):'unavailable',count:products.length};});
  // Interleave sources so one retailer does not dominate the default grid.
  const groups=SOURCES.map(s=>items.filter(p=>p.platform===s));const mixed=[];
  for(let i=0;i<48;i++)groups.forEach(g=>{if(g[i])mixed.push({...g[i],...classifyProduct(q,g[i].title)})});
  return { query:q, page, items:mixed, sources, fetchedAt:new Date().toISOString(), disclaimer:'蝦皮與 iOPEN Mall 商品由飛比公開收錄，連結經飛比前往賣場；非賣場即時報價。其他價格取自公開搜尋頁，可能有延遲；不同規格、配件與組合商品請自行確認，實際售價以賣場為準。' };
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
    const key='match-v2:'+q.toLocaleLowerCase()+':'+page;
    const cached=memoryCache.get(key);
    if(cached && Date.now()-cached.time<600000) return Response.json(cached.data,{headers:{...h,'Cache-Control':'public, max-age=600','X-Result-Cache':'HIT'}});
    const data=await searchProducts(q,page);const allFailed=data.sources.every(s=>s.status==='unavailable');
    if(!allFailed) { if(memoryCache.size>=100)memoryCache.delete(memoryCache.keys().next().value);memoryCache.set(key,{time:Date.now(),data}); }
    const response=Response.json(data,{status:allFailed?502:200,headers:{...h,'Cache-Control':allFailed?'no-store':'public, max-age=600','X-Result-Cache':'MISS'}});
    return response;
  }
};
