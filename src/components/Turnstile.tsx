"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("turnstile load failed"));
      document.head.appendChild(s);
    });
  }
  return loader;
}

/**
 * Turnstile 小组件（显式渲染，兼容 App Router 客户端导航）。
 * 提交后 token 会被消费；父级用 key（错误重定向携带时间戳）强制重挂载以获得新 token。
 */
export default function Turnstile({ siteKey, action }: { siteKey: string; action: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadTurnstile()
      .then(() => {
        if (!alive || !hostRef.current || !window.turnstile || widgetId.current) return;
        const light =
          typeof document !== "undefined" && document.documentElement.classList.contains("light");
        widgetId.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          action,
          theme: light ? "light" : "dark",
          language: "zh-cn",
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {}
        widgetId.current = null;
      }
    };
  }, [siteKey, action]);

  return <div ref={hostRef} className="ct-turnstile" />;
}
