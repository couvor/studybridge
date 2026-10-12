import { redirect } from "next/navigation";
import { getSession, homeByRole } from "@/lib/auth";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";

export const metadata = { title: "修改密码 · 学桥" };

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.mcp) redirect(homeByRole(s.role));
  const { error } = await searchParams;

  return (
    <div className="max-w-md mx-auto card p-8 space-y-4">
      <p className="mono text-[10px] tracking-[0.3em] text-dim uppercase">Security</p>
      <h1 className="font-serifcn font-black text-2xl">请先设置新密码</h1>
      <p className="text-[13px] text-mute">
        你的密码已被管理员重置，为保障账号安全，请先设置一个新密码再继续使用。
      </p>
      {error && (
        <p className="text-[13px]" style={{ color: "#e0666a" }}>
          密码至少 8 位，且两次输入需一致。
        </p>
      )}
      <ChangePasswordForm />
    </div>
  );
}
