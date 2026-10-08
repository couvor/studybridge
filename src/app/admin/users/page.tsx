import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/constants";

export const metadata = { title: "用户管理 · 学桥" };

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  PARENT: { label: "家长", cls: "badge" },
  TUTOR: { label: "教员", cls: "badge badge-accent" },
  ADMIN: { label: "运营", cls: "badge badge-warn" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireRole("ADMIN");
  const { role } = await searchParams;
  const filter = role && ["PARENT", "TUTOR", "ADMIN"].includes(role) ? role : undefined;

  const users = await db.user.findMany({
    where: filter ? { role: filter } : undefined,
    include: { tutorProfile: { include: { subjects: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Users / 用户管理</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">注册用户</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/users" className={`btn btn-sm ${!filter ? "btn-primary" : ""}`}>全部</Link>
        <Link href="/admin/users?role=PARENT" className={`btn btn-sm ${filter === "PARENT" ? "btn-primary" : ""}`}>家长</Link>
        <Link href="/admin/users?role=TUTOR" className={`btn btn-sm ${filter === "TUTOR" ? "btn-primary" : ""}`}>教员</Link>
        <Link href="/admin/users?role=ADMIN" className={`btn btn-sm ${filter === "ADMIN" ? "btn-primary" : ""}`}>运营</Link>
      </div>

      <div className="overflow-x-auto card">
        <table className="tbl">
          <thead>
            <tr><th>姓名</th><th>角色</th><th>邮箱</th><th>电话</th><th>教员信息</th><th>注册时间</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.name}</td>
                <td><span className={ROLE_BADGE[u.role]?.cls}>{ROLE_BADGE[u.role]?.label}</span></td>
                <td className="mono text-[12px] text-dim">{u.email}</td>
                <td className="mono text-[12px] text-dim">{u.phone || "—"}</td>
                <td className="text-[12.5px] text-mute">
                  {u.tutorProfile
                    ? `${u.tutorProfile.university || "—"} · ${u.tutorProfile.grade || "—"} · ${u.tutorProfile.subjects.map((x) => x.name).slice(0, 3).join(" / ")}`
                    : "—"}
                </td>
                <td className="mono text-[11px] text-dim">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
