import { redirect } from "next/navigation";
import { getSession, homeByRole } from "@/lib/auth";
import { chooseRoleAction } from "@/app/actions/auth";

export const metadata = { title: "选择身份 · 学桥" };

// SSO 首次登录：选择进入学桥的身份（家长 / 大学生教员）
export default async function WelcomePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.rp) redirect(homeByRole(s.role));

  return (
    <main className="container-x flex-1 py-16 lg:py-24">
      <div className="max-w-2xl mx-auto rise-1">
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-4">
          One more step / 最后一步
        </p>
        <h1 className="font-serifcn font-black text-4xl mb-4">选择你的身份</h1>
        <p className="text-[13.5px] leading-[1.9] text-mute mb-10">
          欢迎，{s.name}。你的明旸账号已连接成功，请选择进入学桥的身份。
          身份决定你看到的功能（发布求教需求 / 认证接单），如需变更请联系平台运营。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form action={chooseRoleAction}>
            <input type="hidden" name="role" value="PARENT" />
            <button className="card-2 card-btn p-6 w-full">
              <span className="card-btn-arrow" aria-hidden="true">↗</span>
              <p className="font-serifcn font-black text-xl">我是家长</p>
              <p className="text-[12.5px] text-dim mt-2">发布求教需求，挑选教员</p>
            </button>
          </form>
          <form action={chooseRoleAction}>
            <input type="hidden" name="role" value="TUTOR" />
            <button className="card-2 card-btn p-6 w-full">
              <span className="card-btn-arrow" aria-hidden="true">↗</span>
              <p className="font-serifcn font-black text-xl">我是大学生</p>
              <p className="text-[12.5px] text-dim mt-2">认证后接单，开始带教</p>
            </button>
          </form>
        </div>

        <p className="mono text-[10px] tracking-[0.2em] text-dim mt-10">
          ACCOUNT LINKED VIA MINGYANG SSO · 陕ICP备2026028201号
        </p>
      </div>
    </main>
  );
}
