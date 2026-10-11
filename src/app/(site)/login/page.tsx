import Link from "next/link";

export const metadata = { title: "登录 · 学桥" };

const ERRORS: Record<string, string> = {
  "1": "邮箱或密码不正确",
  "2": "人机验证未通过，请重试",
  "3": "该账号已接入明旸账号体系，请使用「使用明旸账号登录」",
  "4": "登录校验未通过（会话过期或票据无效），请重试",
  "5": "单点登录服务未配置，请联系管理员",
  "6": "账号标识冲突，请联系平台运营",
  "7": "尝试过于频繁，请稍后再试",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const issuer = process.env.SSO_ISSUER ?? "https://login.mingyanginfo.com";

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
              账号由「明旸账号」统一提供，一次注册、统一以动态口令（2FA）保护。
            </p>
          </div>
        </div>

        {/* 右：登录（统一走明旸账号 SSO） */}
        <div className="lg:col-span-5 lg:col-start-8 rise-2">
          <div className="card p-8 lg:p-10">
            <h2 className="font-serifcn font-black text-2xl mb-1">登录</h2>
            <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-8">
              Sign in with Mingyang ID
            </p>

            {error && (
              <p className="mono text-[11px] tracking-[0.1em] text-[#e0666a] mb-5">
                {ERRORS[error] ?? "登录失败，请重试"}
              </p>
            )}

            <a href="/api/auth/sso/start" className="btn btn-primary w-full">
              使用明旸账号登录
            </a>
            <p className="mono text-[10px] tracking-[0.18em] text-dim text-center mt-3">
              MINGYANG SSO · 一次注册，通行全部服务
            </p>

            <p className="text-[13px] text-mute mt-8">
              还没有明旸账号？{" "}
              <a href={`${issuer}/register`} className="link-slide text-fg">去注册</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
