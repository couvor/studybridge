"use client";

// 明暗切换按钮。显隐不依赖 React 状态：layout 内联脚本在首帧前就给 <html> 加好
// light 类，这里用 CSS 按 html.light 显隐两个 glyph，首帧即正确、无 hydration 闪烁。
// 点击时直接读写 documentElement 类与 localStorage。
export default function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("light");
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
      <span className="theme-sun text-[13px] leading-none">☀</span>
      <span className="theme-moon text-[13px] leading-none">☾</span>
    </button>
  );
}
