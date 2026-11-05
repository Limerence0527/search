"use client";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, ImageOff, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const API = "https://shopping-preview-api-0527.v25569404.chatgpt.site/api/search";
type Product={id:string;title:string;price:number;image:string;url:string;platform:string;note:string;matchesQuery:boolean;seller?:string;via?:string};
type Source={name:string;status:string;count:number};
type Result={items:Product[];sources:Source[];fetchedAt:string;disclaimer:string};
function ProductImage({item}:{item:Product}) {
 const [failed,setFailed]=useState(false);
 return <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`前往 ${item.platform} 查看 ${item.title}`} className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-white focus-visible:outline-2 focus-visible:outline-[#8A9A86]">
 {failed||!item.image?<span className="flex flex-col items-center gap-2 text-xs text-zinc-500"><ImageOff size={27}/>圖片暫時無法載入</span>:<img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" onError={()=>setFailed(true)}/>}
 <span className="absolute bottom-2 right-2 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowUpRight size={14}/></span>
 </a>;
}
export function ProductResults({query}:{query:string}) {
 const [result,setResult]=useState<Result|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const [strict,setStrict]=useState(true);
 const [source,setSource]=useState("全部"),[sort,setSort]=useState("相關"),[retry,setRetry]=useState(0);
 useEffect(()=>{ if(!query)return; const controller=new AbortController(); let active=true; setLoading(true);setError("");setResult(null);setSource("全部");setSort("相關");
 const timer=setTimeout(()=>controller.abort(),25000);
 fetch(API+"?q="+encodeURIComponent(query),{signal:controller.signal,credentials:"omit"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error("資料來源暫時無法回應，請稍後重試。");if(!Array.isArray(data.items))throw new Error("商品資料格式無法讀取。");return data as Result;}).then(data=>{if(active&&!controller.signal.aborted)setResult(data)}).catch(e=>{if(active&&!controller.signal.aborted)setError(e.message||"搜尋失敗，請稍後重試。");else if(active)setError("搜尋逾時，請重試或使用下方平台入口。");}).finally(()=>{clearTimeout(timer);if(active)setLoading(false)});
 return()=>{active=false;clearTimeout(timer);controller.abort(new Error("unmounted"))};
 },[query,retry]);
 if(!query)return null;
 const relevant=(result?.items||[]).filter(p=>!strict||p.matchesQuery===true);
 const excluded=(result?.items.length||0)-relevant.length;
 const visible=relevant.filter(p=>source==="全部"||p.platform===source).slice().sort((a,b)=>sort==="價格低到高"?a.price-b.price:sort==="價格高到低"?b.price-a.price:0);
 return <section aria-labelledby="products-title" className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-12">
 <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-[10px] tracking-[.22em] text-[#65765F]">PRODUCT SEARCH</p><h2 id="products-title" className="text-xl font-medium sm:text-2xl">「{query}」商品預覽</h2><p className="mt-2 text-xs text-muted-foreground">從各平台公開搜尋頁整理，直接比較圖片、價格與商品資訊。</p></div>{result&&<span className="text-xs text-muted-foreground">資料取得：{new Date(result.fetchedAt).toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Taipei"})} · 約 10 分鐘快取</span>}</div>
 {loading&&!error&&<div role="status"><p className="mb-5 flex items-center gap-2 text-sm text-[#65765F]"><LoaderCircle size={16} className="animate-spin"/>正在搜尋 PChome、momo、Yahoo 與飛比收錄的蝦皮商品…</p><div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{Array.from({length:10},(_,i)=><div key={i} className="animate-pulse"><div className="aspect-square rounded-lg bg-[#EAE5D9]"/><div className="mt-3 h-3 w-3/4 rounded bg-[#EAE5D9]"/><div className="mt-3 h-4 w-1/2 rounded bg-[#EAE5D9]"/></div>)}</div></div>}
 {error&&<div role="alert" className="rounded-lg border border-[#D9826C]/30 bg-[#D9826C]/5 p-5"><p className="mb-3 flex items-center gap-2 text-sm text-[#A05243]"><AlertCircle size={17}/>{error}</p><Button variant="outline" size="sm" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={13}/>重新搜尋</Button></div>}
 {result&&<>
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" size="sm" aria-pressed={strict} onClick={()=>setStrict(v=>!v)} className={strict?"border-[#8A9A86] bg-[#E8EDE4] text-[#65765F]":""}>{strict?"✓ ":""}只看本商品</Button><span className="text-xs text-muted-foreground">{strict?`已排除 ${excluded} 件配件、組合包或不符型號的商品；可關閉查看` : "顯示所有來源結果，可能包含配件與其他規格"}</span></div>
 <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" role="group" aria-label="商品來源篩選">{["全部",...result.sources.filter(s=>s.count>0).map(s=>s.name)].map(s=><Button key={s} size="sm" variant="outline" aria-pressed={source===s} className={source===s?"border-[#8A9A86] bg-[#E8EDE4] text-[#65765F]":""} onClick={()=>setSource(s)}>{s}{s==="全部"?` ${relevant.length}`:` ${relevant.filter(p=>p.platform===s).length}`}</Button>)}</div><div className="flex flex-wrap gap-1" role="group" aria-label="商品排序">{["相關","價格低到高","價格高到低"].map(s=><Button key={s} size="sm" variant="ghost" aria-pressed={sort===s} className={sort===s?"bg-[#EAE5D9] text-foreground":""} onClick={()=>setSort(s)}>{s}</Button>)}</div></div>
 {result.sources.some(s=>s.status!=="ok")&&<p role="status" className="mb-4 text-xs leading-6 text-[#8D7050]">{result.sources.filter(s=>s.status!=="ok").map(s=>s.name+(s.status==="empty"?"：沒有可讀取的商品":"：暫時無法取得資料")).join("；")}。其他來源仍可正常瀏覽。</p>}
 <div aria-live="polite" className="mb-4 text-xs text-muted-foreground">顯示 {visible.length} 件商品 · 依商品名稱比對，仍請核對賣場規格</div>
 {visible.length?<div className="grid grid-cols-2 items-start gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{visible.map(item=><article key={item.id} className="min-w-0"><ProductImage item={item}/><div className="pt-3"><p className="mb-1.5 text-[11px] text-[#65765F]">{item.platform}{item.via&&<span className="text-muted-foreground"> · 來自{item.via}</span>}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm leading-6 text-foreground hover:underline" title={item.title}>{item.title}</a><p className="mt-1.5 text-base font-medium tracking-wide">NT$ {item.price.toLocaleString("zh-TW")}</p>{item.seller&&<p className="mt-1 text-[11px] text-muted-foreground">{item.seller}</p>}{item.note&&<p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{item.note}</p>}</div></article>)}</div>:<div className="rounded-lg border border-dashed border-border p-10 text-center"><Search size={24} className="mx-auto mb-3 text-muted-foreground"/><p className="text-sm">沒有找到可顯示的商品</p><p className="mt-2 text-xs text-muted-foreground">試著縮短關鍵字、使用品牌型號，或前往下方平台搜尋。</p></div>}
 <p className="mt-7 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">{result.disclaimer} 蝦皮為飛比收錄結果，非完整即時搜尋；商品連結會先經過飛比。</p>
 </>}
 </section>;
}
