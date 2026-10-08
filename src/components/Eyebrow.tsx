export default function Eyebrow({ num, en, zh }: { num: string; en: string; zh?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="mono text-[11px] tracking-[0.1em] text-accent-soft">{num}</span>
      <span className="h-px w-12 bg-line-strong" />
      <span className="mono text-[11px] tracking-[0.32em] text-dim uppercase">{en}</span>
      {zh && <span className="font-serifcn text-xs text-dim tracking-[0.3em]">{zh}</span>}
    </div>
  );
}
