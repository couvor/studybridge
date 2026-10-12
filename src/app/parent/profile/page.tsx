import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateAccountAction } from "@/app/actions/account";

export const metadata = { title: "个人信息 · 学桥" };

export default async function ParentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const s = await requireRole("PARENT");
  const { saved, error } = await searchParams;

  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-8">
      {error === "name" && (
        <div className="card-2 border-l-2 !border-l-[#e0666a] px-5 py-4">
          <p className="text-[13.5px]">保存失败：姓名不能为空。</p>
        </div>
      )}
      {error === "phone" && (
        <div className="card-2 border-l-2 !border-l-[#e0666a] px-5 py-4">
          <p className="text-[13.5px]">保存失败：手机号格式不正确（6–20 位数字，可含 +、-、空格）。</p>
        </div>
      )}
      {saved && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px]">个人信息已保存。</p>
        </div>
      )}

      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Profile / 个人信息</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">我的资料</h1>
        <p className="text-[13px] leading-[1.9] text-mute mt-3">
          管理你在学桥的账户资料。邮箱为登录账号、且与明旸账号（SSO）绑定，如需更改请前往明旸账号中心。
        </p>
      </div>

      <form action={updateAccountAction} className="card p-7 lg:p-9 space-y-6">
        <div>
          <label className="label" htmlFor="name">姓名 / Name</label>
          <input id="name" name="name" className="input" defaultValue={user.name} placeholder="你的称呼" />
        </div>

        <div>
          <label className="label" htmlFor="phone">联系电话 / Phone</label>
          <input id="phone" name="phone" className="input" defaultValue={user.phone} placeholder="便于教员成单后联系你" />
        </div>

        <div>
          <label className="label" htmlFor="email">邮箱 / Email（登录账号，不可在此修改）</label>
          <input id="email" name="email" className="input opacity-70" defaultValue={user.email} disabled readOnly />
        </div>

        <button className="btn btn-primary">保存修改</button>
      </form>
    </div>
  );
}
