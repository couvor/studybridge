import Link from "next/link";

export const metadata = { title: "注册 · 学桥" };

// 学桥账号统一由明旸登录服务（login.mingyanginfo.com）承担，本页为引导说明页。
// 首页 CTA 会带 ?role=TUTOR 等来源参数：这里按来源提示首次登录时的身份选择。
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const issuer = process.env.SSO_ISSUER ?? "https://login.mingyanginfo.com";
  const { role } = await searchParams;
  const asTutor = role === "TUTOR";

  return (
    <main className="container-x flex-1 py-16 lg:py-24">
      <div className="max-w-xl mx-auto rise-1">
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-4">Join / 加入学桥</p>
        <h1 className="font-serifcn font-black text-4xl mb-4">注册</h1>
        {asTutor && (
          <p className="text-[13.5px] leading-[1.9] text-mute mb-4 border-l-2 border-line-strong pl-3.5">
            你是以「大学生教员」身份来的：注册完成后回到学桥登录，在首次登录时选择「教员」身份，
            即可进入认证流程（学生证 + 成绩单）。
          </p>
        )}
        <p className="text-[13.5px] leading-[1.9] text-mute mb-8">
          学桥的账号已统一由「明旸账号」提供：注册一次，即可登录学桥与明旸的其他服务，
          并统一以动态口令（TOTP 两步验证）保护账号安全。
        </p>

        <ol className="text-[13.5px] leading-[2.1] text-mute mb-10 list-decimal pl-5 flex flex-col gap-1">
          <li>前往明旸账号完成注册（用户名 + 密码，含人机验证）</li>
          <li>按提示用验证器 App（Google/Microsoft Authenticator 等）扫描二维码绑定动态令牌</li>
          <li>回到学桥点击「使用明旸账号登录」，首次登录时选择身份（家长 / 大学生教员）</li>
        </ol>

        <a className="btn btn-primary w-full" href={`${issuer}/register`}>
          去明旸账号注册
        </a>

        <p className="text-[13px] text-mute mt-6 text-center">
          已有明旸账号？{" "}
          <Link href="/login" className="link-slide text-fg">直接登录</Link>
        </p>

        <p className="mono text-[10px] tracking-[0.2em] text-dim mt-12 text-center">
          MINGYANG ACCOUNT · 陕ICP备2026028201号
        </p>
      </div>
    </main>
  );
}
