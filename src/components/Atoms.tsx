export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`mono ${size === "sm" ? "text-[11px]" : "text-[13px]"} tracking-[0.15em] text-accent-soft whitespace-nowrap`}>
      {"★".repeat(full)}
      <span className="text-dim">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-grid place-content-center rounded-full border border-line-strong bg-surface2 font-serifcn text-fg shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0) || "·"}
    </span>
  );
}
