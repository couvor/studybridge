import Link from "next/link";
import { registerAction } from "@/app/actions/auth";

export const metadata = { title: "注册 · 学桥" };

const ERRORS: Record<string, string> = {
  empty: "请填写完整信息",
  short: "密码至少 6 位",
  exists: "该邮箱已注册，请直接登录",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const { role, error } = await searchParams;
  const asTutor = role === "TUTOR";

  return (
    <main className="container-x flex-1 py-16 lg:py-24">
      <div className="max-w-xl mx-auto rise-1">
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-4">Join / 加入学桥</p>
        <h1 className="font-serifcn font-black text-4xl mb-4">注册</h1>
        <p className="text-[13.5px] leading-[1.9] text-mute mb-10">
          选择你的身份开始。教员注册后需提交学生证与成绩单完成认证，认证通过后档案才会进入公开教员库。
        </p>

        <form action={registerAction} className="card p-8 lg:p-10 flex flex-col gap-6">
          {/* 角色选择 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer">
              <input type="radio" name="role" value="PARENT" defaultChecked={!asTutor} className="peer sr-only" />
              <div className="card-2 p-4 peer-checked:border-accent transition-colors">
                <p className="font-serifcn font-black text-lg">我是家长</p>
                <p className="text-[12px] text-dim mt-1">发布求教需求，挑选教员</p>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="role" value="TUTOR" defaultChecked={asTutor} className="peer sr-only" />
              <div className="card-2 p-4 peer-checked:border-accent transition-colors">
                <p className="font-serifcn font-black text-lg">我是大学生</p>
                <p className="text-[12px] text-dim mt-1">认证后接单，开始带教</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="name">姓名 / Name</label>
              <input id="name" name="name" required className="input" placeholder="真实姓名" />
            </div>
            <div>
              <label className="label" htmlFor="phone">手机 / Phone</label>
              <input id="phone" name="phone" className="input" placeholder="选填" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="email">邮箱 / Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">密码 / Password</label>
            <input id="password" name="password" type="password" required minLength={6} className="input" placeholder="至少 6 位" />
          </div>

          {error && (
            <p className="mono text-[11px] tracking-[0.1em] text-[#e0666a]">{ERRORS[error] ?? "注册失败，请重试"}</p>
          )}

          <button className="btn btn-primary w-full">创建账号</button>
          <p className="text-[13px] text-mute text-center">
            已有账号？<Link href="/login" className="link-slide text-fg">直接登录</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
