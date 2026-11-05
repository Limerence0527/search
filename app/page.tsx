"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Command, ExternalLink, Layers3, Search, ShoppingBag, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductResults } from "@/components/product-results";

const platforms = [
 {id:"shopee", name:"蝦皮購物", en:"SHOPEE", mark:"蝦", color:"#fb775e", bg:"#fb775e12", kind:"商城", desc:"從日常小物到人氣好物", url:(q:string)=>"https://shopee.tw/search?keyword="+q},
 {id:"momo", name:"momo 購物網", en:"MOMO", mark:"mo", color:"#ed85b4", bg:"#ed85b412", kind:"商城", desc:"品牌家電・生活選物", url:(q:string)=>"https://www.momoshop.com.tw/search/searchShop.jsp?keyword="+q},
 {id:"pchome", name:"PChome 24h", en:"PCHOME", mark:"P", color:"#f9a078", bg:"#f9a07812", kind:"商城", desc:"3C 科技・日常補給", url:(q:string)=>"https://24h.pchome.com.tw/search/?q="+q},
 {id:"yahoo", name:"Yahoo 購物中心", en:"YAHOO", mark:"Y!", color:"#b59afa", bg:"#b59afa12", kind:"商城", desc:"品牌購物・風格生活", url:(q:string)=>"https://tw.buy.yahoo.com/search/product?p="+q},
 {id:"ruten", name:"露天市集", en:"RUTEN", mark:"露", color:"#f5c477", bg:"#f5c47712", kind:"商城", desc:"挖掘收藏與特色商品", url:(q:string)=>"https://www.ruten.com.tw/find/?q="+q},
 {id:"biggo", name:"BigGo 比價", en:"BIGGO", mark:"B", color:"#83adef", bg:"#83adef12", kind:"比價", desc:"跨平台探索商品價格", url:(q:string)=>"https://biggo.com.tw/s/?q="+q},
 {id:"feebee", name:"飛比價格", en:"FEEBEE", mark:"飛", color:"#eed789", bg:"#eed78912", kind:"比價", desc:"多一個價格比較的角度", url:(q:string)=>"https://feebee.com.tw/s/?q="+q},
 {id:"google", name:"Google 購物", en:"GOOGLE SHOPPING", mark:"G", color:"#8fc9bb", bg:"#8fc9bb12", kind:"比價", desc:"探索更多商家的選擇", url:(q:string)=>"https://www.google.com/search?tbm=shop&q="+q}
];
const examples=["AirPods Pro 2","Dyson V12","Switch 2","象印 保溫瓶 480ml"];
export default function Home() {
 const [input,setInput]=useState(""); const [query,setQuery]=useState(""); const [filter,setFilter]=useState("全部"); const [error,setError]=useState(""); const inputRef=useRef<HTMLInputElement>(null); const resultsRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{ const q=new URLSearchParams(location.search).get("q")?.trim(); if(q){setInput(q);setQuery(q);} ["cp.apiKey","cp.model","cp.maxUses"].forEach(k=>{try{localStorage.removeItem(k)}catch{}}); const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();inputRef.current?.focus()}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key); },[]);
 function search(value:string){const q=value.trim();if(!q){setError("先輸入想找的商品名稱");inputRef.current?.focus();return;}setError("");setInput(q);setQuery(q);setFilter("全部");const u=new URL(location.href);u.searchParams.set("q",q);history.replaceState(null,"",u);requestAnimationFrame(()=>resultsRef.current?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));}
 const visible=platforms.filter(p=>filter==="全部"||p.kind===filter);
 return <div className="min-h-screen">
  <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-3">跳到主要內容</a>
  <header className="border-b border-border bg-background/85">
   <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
    <a href="./" className="flex items-center gap-3 font-semibold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-400/10 text-violet-300"><Layers3 size={19}/></span>比價小幫手<span className="hidden text-xs font-normal text-muted-foreground sm:inline">/ find your next favorite</span></a>
    <Button asChild variant="ghost" size="sm"><a href="#platforms">探索平台 <ArrowDown size={13}/></a></Button>
   </div>
  </header>
  <main id="main">
   <section className="ambient relative overflow-hidden border-b border-border">
    <div aria-hidden className="grid-lines pointer-events-none absolute inset-0"/>
    <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pb-20 sm:pt-22">
     <Badge className="mb-7 border-violet-300/15 bg-violet-400/5 text-violet-200"><span className="size-1.5 rounded-full bg-violet-300"/>少一點切換，多一點選擇 <ArrowRight size={12}/></Badge>
     <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">好東西，值得<br className="sm:hidden"/><span className="bg-gradient-to-r from-violet-200 to-violet-400 bg-clip-text text-transparent">好價格。</span></h1>
     <p className="mx-auto mb-9 mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">從一個商品名稱開始，探索各大購物平台。<br/>把選擇放在一起，比較商品圖片與售價，找到理想入手方式。</p>
     <form onSubmit={e=>{e.preventDefault();search(input)}} className="search-glow mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-white/15 bg-[#15141c] p-2 pl-4 shadow-2xl transition-shadow">
      <Search size={21} className="shrink-0 text-muted-foreground" aria-hidden/>
      <Input ref={inputRef} aria-label="搜尋商品名稱" aria-invalid={!!error} aria-describedby={error?"search-error":undefined} type="search" value={input} onChange={e=>{setInput(e.target.value);setError("")}} placeholder="搜尋品牌、商品或型號…" className="h-12 border-0 px-1 text-sm shadow-none focus-visible:ring-0 sm:text-base"/>
      <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-1 text-xs text-muted-foreground sm:flex"><Command size={12}/>K</kbd>
      <Button type="submit" className="h-12 shrink-0 rounded-xl px-4 sm:px-5">搜尋 <ArrowRight size={16}/></Button>
     </form>
     {error&&<p role="alert" id="search-error" className="mt-3 text-sm text-rose-300">{error}</p>}
     <div className="mt-5 flex flex-wrap items-center justify-center gap-2"><span className="mr-1 text-xs text-muted-foreground">試試搜尋</span>{examples.map(q=><Button key={q} variant="ghost" size="sm" className="h-7 text-xs" onClick={()=>search(q)}>{q}<ArrowUpRight size={11}/></Button>)}</div>
     <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-muted-foreground">{["8 個搜尋入口","無需註冊","直接前往原始賣場"].map(s=><span key={s} className="flex items-center gap-1.5"><Check size={13} className="text-violet-300/75"/>{s}</span>)}</div>
    </div>
   </section>
   <div ref={resultsRef} className="scroll-mt-6"><ProductResults query={query}/></div>
   <section id="platforms" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="platform-title">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
     <div><p className="mb-2 text-[10px] font-medium tracking-[.24em] text-violet-300">EXPLORE THE POSSIBILITIES</p><h2 id="platform-title" className="text-xl font-semibold tracking-tight sm:text-2xl">{query?<><span className="text-muted-foreground">搜尋 </span>「{query}」</>:"你的購物探索，從這裡開始"}</h2><p className="mt-2 text-sm text-muted-foreground">{query?"選擇平台，在新分頁查看實際商品、圖片與售價。":"選好商品，再到熟悉的平台看看。每個入口都有不同的發現。"}</p></div>
     <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1" role="group" aria-label="平台類型"><SlidersHorizontal size={13} className="mx-2 text-muted-foreground"/>{["全部","商城","比價"].map(f=><Button key={f} size="sm" variant="ghost" aria-pressed={filter===f} onClick={()=>setFilter(f)} className={filter===f?"bg-white/10 text-foreground hover:bg-white/10":""}>{f}</Button>)}</div>
    </div>
    {query&&<div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-violet-300/15 bg-violet-400/5 px-4 py-3 text-xs leading-6 text-violet-100/75"><ExternalLink size={15} className="mt-1 shrink-0"/>上方顯示可取得的商品圖片與售價；你也可以直接到下方各平台查看完整搜尋結果。</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visible.map(p=><Card key={p.id} className="merchant group overflow-hidden"><CardContent className="p-5">
     <div className="mb-6 flex items-start justify-between"><span style={{color:p.color,background:p.bg,borderColor:p.color+"25"}} className="flex size-12 items-center justify-center rounded-xl border text-lg font-bold">{p.mark}</span><Badge className="border-0 bg-white/4 text-[10px] text-muted-foreground">{p.kind==="商城"?"購物平台":"跨站比價"}</Badge></div>
     <p className="mb-1 text-[9px] tracking-[.18em] text-muted-foreground">{p.en}</p><h3 className="text-base font-semibold">{p.name}</h3><p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
     <div className="mt-6 border-t border-border pt-3">{query?<Button asChild variant="ghost" className="h-8 w-full justify-between px-0 text-xs text-foreground hover:bg-transparent"><a href={p.url(encodeURIComponent(query))} target="_blank" rel="noopener noreferrer" aria-label={`前往${p.name}搜尋 ${query}（開新分頁）`}>搜尋這個商品<ArrowUpRight size={16} className="merchant-arrow text-muted-foreground"/></a></Button>:<Button variant="ghost" className="h-8 w-full justify-between px-0 text-xs hover:bg-transparent" onClick={()=>{inputRef.current?.focus();window.scrollTo({top:0,behavior:"smooth"})}}>輸入商品開始<ArrowUpRight size={16} className="merchant-arrow"/></Button>}</div>
    </CardContent></Card>)}</div>
    <div className="mt-6 flex justify-between gap-4 text-[11px] text-muted-foreground"><span aria-live="polite">顯示 {visible.length} 個平台</span><span>實際價格、運費與庫存以各賣場為準</span></div>
    {!query&&<div className="mt-14 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">{[{icon:Search,title:"01 / 找到想要的",text:"輸入完整型號、容量或尺寸，讓搜尋更貼近你的需求。"},{icon:Layers3,title:"02 / 多看幾個選擇",text:"前往不同商城與比價網，查看商品圖片與實際價格。"},{icon:ShoppingBag,title:"03 / 確認再入手",text:"比較運費、保固與賣家評價，選擇適合自己的購買方式。"}].map(({icon:Icon,title,text})=><div key={title} className="flex gap-3"><Icon size={17} className="mt-1 shrink-0 text-violet-300/70"/><div><h3 className="mb-2 text-sm font-medium">{title}</h3><p className="text-xs leading-6 text-muted-foreground">{text}</p></div></div>)}</div>}
   </section>
  </main>
  <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted-foreground sm:px-8"><span className="flex items-center gap-2"><Layers3 size={14}/>比價小幫手 <span className="text-white/15">/</span> 更從容地做選擇</span><span>本站不販售商品 · 所有連結導向外部平台</span></div></footer>
 </div>;
}
