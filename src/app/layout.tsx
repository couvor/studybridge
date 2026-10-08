import type { Metadata } from "next";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/900.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "学桥 · 大学生家教撮合平台",
  description:
    "学桥是一座桥：一端是经过认证的大学生教员，一端是正在寻找陪伴式辅导的家庭。平台仅提供信息撮合服务。",
};

const themeScript = `(function(){try{var t=localStorage.getItem('sb-theme');if(t==='light'){document.documentElement.classList.add('light')}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-serifcn bg-bg text-fg antialiased min-h-svh flex flex-col">
        <div className="bg-grid" aria-hidden />
        <div className="ambient" aria-hidden />
        <div className="grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
