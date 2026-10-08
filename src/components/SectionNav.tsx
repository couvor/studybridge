"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number };

export default function SectionNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      {/* 桌面侧栏 */}
      <nav className="hidden lg:flex flex-col gap-0.5 sticky top-28 w-full">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`side-link ${isActive(it.href) ? "active" : ""}`}>
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className="badge badge-accent !px-1.5 !py-0.5">{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
      {/* 移动端横滑 */}
      <nav className="lg:hidden flex gap-2 overflow-x-auto -mx-6 px-6 pb-2 mb-6 border-b border-line">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`whitespace-nowrap text-[13px] px-3 py-2 border-b-2 -mb-[9px] transition-colors ${
              isActive(it.href)
                ? "border-accent-soft text-fg"
                : "border-transparent text-mute hover:text-fg"
            }`}
          >
            {it.label}
            {it.badge ? <span className="mono text-[10px] text-accent-soft ml-1">{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
