"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { logoutAction } from "@/app/actions/auth";

type NavSession = { name: string; role: "PARENT" | "TUTOR" | "ADMIN" } | null;

// 移动端菜单卡片：图标 + 双语标题 + 一行说明。
// 只放公开入口，账户操作放在下面的 Account 区，避免菜单变成一列纯文字。
const NAV_CARDS = [
  {
    href: "/tutors",
    en: "Tutor library",
    zh: "教员库",
    desc: "已认证的大学生教员档案",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5h6.5a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H4z" />
        <path d="M20 5.5h-6.5a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2H20z" />
      </svg>
    ),
  },
  {
    href: "/#process",
    en: "Process",
    zh: "撮合流程",
    desc: "发布 · 报名 · 成单 · 互评",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6h6M5 12h10M5 18h4" />
        <circle cx="18" cy="6" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    href: "/#trust",
    en: "Trust",
    zh: "互信机制",
    desc: "认证、试听与双向互评",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5 19 6v6.2c0 4-3 6.6-7 8.3-4-1.7-7-4.3-7-8.3V6z" />
        <path d="m9.2 12 2 2 3.6-3.8" />
      </svg>
    ),
  },
];

export default function Navbar({ session, unread = 0 }: { session: NavSession; unread?: number }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 移动端菜单展开时：点击页面其它区域或按 ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const home = session
    ? session.role === "ADMIN"
      ? "/admin"
      : session.role === "TUTOR"
        ? "/tutor"
        : "/parent"
    : "/";
  const consoleLabel =
    session?.role === "ADMIN" ? "运营后台" : session?.role === "TUTOR" ? "教员中心" : "家长中心";

  function onMove(e: React.MouseEvent) {
    const el = navRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  }

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <div className="container-x" ref={wrapRef}>
        <nav
          ref={navRef}
          onMouseMove={onMove}
          className="glass rounded-2xl h-14 flex items-center justify-between gap-3 px-4 lg:px-5"
        >
          <Link href={home} className="flex items-baseline gap-2.5 group" onClick={() => setOpen(false)}>
            <span className="font-serifcn font-black text-[17px] tracking-wide">学桥</span>
            <span className="mono text-[9px] tracking-[0.3em] text-dim group-hover:text-accent-soft transition-colors">
              STUDYBRIDGE
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13.5px]">
            <Link href="/tutors" className="link-slide">教员库</Link>
            <Link href="/#process" className="link-slide">撮合流程</Link>
            <Link href="/#trust" className="link-slide">互信机制</Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <>
                <Link
                  href="/notifications"
                  aria-label="通知"
                  className="relative h-9 w-9 grid place-content-center rounded-lg border border-line text-mute hover:text-fg hover:border-line-strong transition-colors duration-300"
                >
                  <span className="text-[13px] leading-none">✉</span>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-soft shadow-[0_0_8px_var(--accent-soft)]" />
                  )}
                </Link>
                <Link href={home} className="hidden md:inline-flex btn btn-sm">
                  {consoleLabel}
                </Link>
                <form action={logoutAction} className="hidden md:block">
                  <button className="btn btn-sm btn-ghost" title={`已登录：${session.name}`}>退出</button>
                </form>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="btn btn-sm btn-ghost">登录</Link>
                <Link href="/register" className="btn btn-sm btn-primary">注册</Link>
              </div>
            )}
            <button
              onClick={() => setOpen(!open)}
              aria-label="菜单"
              className="md:hidden h-9 w-9 grid place-content-center rounded-lg border border-line text-mute hover:text-fg transition-colors"
            >
              <span className="text-sm leading-none">{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </nav>

        {open && (
          <div className="md:hidden menu-panel rounded-2xl mt-2 p-3 rise-1">
            <div className="flex flex-col gap-2">
              {NAV_CARDS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="nav-card group"
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="mono block text-[9px] uppercase tracking-[0.26em] text-dim">
                      {item.en}
                    </span>
                    <span className="mt-0.5 block font-serifcn text-[15px] font-black leading-tight">
                      {item.zh}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-mute">{item.desc}</span>
                  </span>
                  <span className="mono text-[11px] text-dim transition-colors duration-300 group-hover:text-accent-soft">
                    ↗
                  </span>
                </Link>
              ))}

              <p className="mono px-1 pt-2 pb-0.5 text-[9px] uppercase tracking-[0.3em] text-dim">
                Account / 账户
              </p>
              {session ? (
                <div className="flex flex-col gap-2">
                  <Link href={home} onClick={() => setOpen(false)} className="btn w-full">{consoleLabel}</Link>
                  <Link href="/notifications" onClick={() => setOpen(false)} className="btn btn-ghost w-full">通知中心</Link>
                  <form action={logoutAction}>
                    <button className="btn btn-ghost w-full">退出登录</button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login" onClick={() => setOpen(false)} className="btn w-full">登录</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary w-full">注册</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
