import { gateAction } from "@/app/actions/auth";

export const metadata = { title: "私有访问 · 学桥" };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="relative min-h-svh flex items-center justify-center overflow-hidden px-6">
      <div className="ghost absolute text-[26vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60">
        ACCESS
      </div>

      <div className="relative w-full max-w-sm rise-1">
        <div className="flex items-center gap-3.5 mb-8">
          <span className="mono text-[11px] tracking-[0.1em] text-accent-soft">00</span>
          <span className="h-px w-12 bg-line-strong" />
          <span className="mono text-[11px] tracking-[0.32em] text-dim uppercase">Private Access</span>
        </div>

        <h1 className="font-serifcn font-black text-4xl mb-3">学桥</h1>
        <p className="text-[13px] leading-[1.9] text-mute mb-10">
          站点处于备案闭站期，仅限受邀访问。请输入访问口令。
        </p>

        <form action={gateAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label className="label" htmlFor="password">Passphrase / 口令</label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              required
              className="input"
              placeholder="· · · · · · · ·"
            />
          </div>
          {error && (
            <p className="mono text-[11px] tracking-[0.15em] text-[#e0666a]">口令不正确，请重试</p>
          )}
          <button className="btn btn-primary w-full mt-2">验证进入</button>
        </form>

        <p className="mono text-[9px] tracking-[0.25em] text-dim mt-10">
          STUDYBRIDGE · ICP FILING IN PROGRESS
        </p>
      </div>
    </main>
  );
}
