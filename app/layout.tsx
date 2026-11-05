import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "比價小幫手 | 找到值得入手的價格", description: "一個搜尋入口，探索蝦皮、momo、PChome 等台灣購物平台。", robots: { index: true, follow: true } };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="zh-Hant" className="light"><body>{children}</body></html>; }
