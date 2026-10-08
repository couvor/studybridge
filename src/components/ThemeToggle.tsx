"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("sb-theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="切换明暗主题"
      title="切换明暗主题"
      className="h-9 w-9 grid place-content-center rounded-lg border border-line text-mute hover:text-fg hover:border-line-strong transition-colors duration-300"
    >
      <span className="text-[13px] leading-none">{light ? "☾" : "☀"}</span>
    </button>
  );
}
