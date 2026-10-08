import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export const metadata = { title: "登录 · 学桥" };

const ERRORS: Record<string, string> = {
  "1": "邮箱或密码不正确",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="container-x flex-1 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* 左：品牌叙事 */}
        <div className="lg:col-span-6 relative rise-1">
          <div className="ghost absolute -top-10 -left-2 text-[9rem] hidden lg:block opacity-70">桥</div>
          <div className="relative pt-24 hidden lg:block">
            <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-5">Welcome back / 欢迎回来</p>
            <h1 className="font-serifcn font-black text-4xl leading-snug">
              学问在桥上相遇，
              <br />
              信任在课时里生长。
            </h1>
            <p className="mt-6 text-[13.5px] leading-[1.9] text-mute max-w-md">
              登录后继续你的撮合之旅：家长管理求教单与课时反馈，教员维护认证档案与报名记录。
            </p>
          </div>
        </div>

        {/* 右：表单 */}
        <div className="lg:col-span-5 lg:col-start-8 rise-2">
          <div className="card p-8 lg:p-10">
            <h2 className="font-serifcn font-black text-2xl mb-1">登录</h2>
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-8">Sign in</p>

            <form action={loginAction} className="flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="email">邮箱 / Email</label>
                <input id="email" name="email" type="email" required autoFocus className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label" htmlFor="password">密码 / Password</label>
                <input id="password" name="password" type="password" required className="input" placeholder="••••••••" />
              </div>
              {error && (
                <p className="mono text-[11px] tracking-[0.1em] text-[#e0666a]">
                  {ERRORS[error] ?? "登录失败，请重试"}
                </p>
              )}
              <button className="btn btn-primary w-full mt-1">进入学桥</button>
            </form>

            <p className="text-[13px] text-mute mt-6">
              还没有账号？{" "}
              <Link href="/register" className="link-slide text-fg">注册一个</Link>
            </p>
          </div>

          <div className="card-2 mt-4 p-5">
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-3">Demo accounts / 体验账号</p>
            <div className="text-[12px] leading-[2] text-mute mono">
              <p>家长 parent@demo.cn　教员 tutor@demo.cn</p>
              <p>运营 admin@studybridge.cn　密码 demo1234</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
