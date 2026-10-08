"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { logoutAction } from "@/app/actions/auth";

type NavSession = { name: string; role: "PARENT" | "TUTOR" | "ADMIN" } | null;

export default function Navbar({ session, unread = 0 }: { session: NavSession; unread?: number }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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
      <div className="container-x">
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
                <Link href={home} className="hidden sm:inline-flex btn btn-sm">
                  {consoleLabel}
                </Link>
                <form action={logoutAction} className="hidden sm:block">
                  <button className="btn btn-sm btn-ghost" title={`已登录：${session.name}`}>退出</button>
                </form>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
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
          <div className="md:hidden glass rounded-2xl mt-2 p-6 rise-1">
            <div className="flex flex-col gap-5 text-[15px]">
              <Link href="/tutors" onClick={() => setOpen(false)} className="link-slide w-fit">教员库</Link>
              <Link href="/#process" onClick={() => setOpen(false)} className="link-slide w-fit">撮合流程</Link>
              <Link href="/#trust" onClick={() => setOpen(false)} className="link-slide w-fit">互信机制</Link>
              <div className="h-px bg-line my-1" />
              {session ? (
                <>
                  <Link href={home} onClick={() => setOpen(false)} className="btn w-full">{consoleLabel}</Link>
                  <Link href="/notifications" onClick={() => setOpen(false)} className="btn btn-ghost w-full">通知中心</Link>
                  <form action={logoutAction}>
                    <button className="btn btn-ghost w-full">退出登录</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="btn w-full">登录</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary w-full">注册</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
