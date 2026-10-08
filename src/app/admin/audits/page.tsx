import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { auditTutorAction } from "@/app/actions/admin";
import { fmtDate, MODE_LABEL } from "@/lib/constants";

export const metadata = { title: "认证审核 · 学桥" };

export default async function AdminAuditsPage() {
  await requireRole("ADMIN");

  const queue = await db.tutorProfile.findMany({
    where: { auditStatus: "PENDING" },
    include: { user: true, subjects: true },
    orderBy: { createdAt: "asc" },
  });
  const recent = await db.tutorProfile.findMany({
    where: { auditStatus: { in: ["APPROVED", "REJECTED"] } },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Audits / 认证审核</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">教员认证队列</h1>
        <p className="text-[13px] text-mute mt-2">核对学生证姓名与注册姓名是否一致、材料是否清晰可辨。</p>
      </div>

      <div className="space-y-4">
        {queue.length === 0 && <div className="card py-12 text-center text-[13.5px] text-dim">队列为空，所有材料都已处理 ✔</div>}
        {queue.map((t) => (
          <div key={t.id} className="card p-6 lg:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3">
                  <h3 className="font-serifcn font-black text-xl">{t.user.name}</h3>
                  <span className="badge badge-warn">待审核</span>
                </div>
                <p className="text-[13px] text-dim mt-1.5">
                  {t.university || "—"} · {t.major || "—"} · {t.grade || "—"} · {MODE_LABEL[t.mode]}
                  {t.region && ` · ${t.region}`}
                </p>
                <p className="mono text-[10px] tracking-[0.15em] text-dim mt-1.5">
                  {t.user.email} · 注册于 {fmtDate(t.createdAt)}
                </p>
                {t.bio && <p className="text-[13px] leading-[1.9] text-mute mt-3 border-l-2 border-line-strong pl-3.5">{t.bio}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.subjects.map((s) => <span key={s.id} className="badge">{s.name}</span>)}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <p className="mono text-[9px] tracking-[0.22em] text-dim uppercase">Materials / 认证材料</p>
                <div className="flex gap-2 flex-wrap">
                  {t.studentCardUrl ? (
                    <a href={`/api/uploads/${t.studentCardUrl}`} target="_blank" className="btn btn-sm">查看学生证 ↗</a>
                  ) : (
                    <span className="badge badge-bad">未上传学生证</span>
                  )}
                  {t.transcriptUrl ? (
                    <a href={`/api/uploads/${t.transcriptUrl}`} target="_blank" className="btn btn-sm">查看成绩单 ↗</a>
                  ) : (
                    <span className="badge badge-bad">未上传成绩单</span>
                  )}
                </div>

                <form action={auditTutorAction} className="card-2 p-4 space-y-3">
                  <input type="hidden" name="tutorId" value={t.id} />
                  <input name="note" className="input !text-[13px]" placeholder="驳回理由（驳回时填写）" />
                  <div className="flex gap-2">
                    <button name="decision" value="APPROVE" className="btn btn-sm btn-primary flex-1">通过认证</button>
                    <button name="decision" value="REJECT" className="btn btn-sm btn-danger flex-1">驳回</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <section>
          <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Recent / 最近处理</p>
          <div className="overflow-x-auto card">
            <table className="tbl">
              <thead>
                <tr><th>姓名</th><th>学校</th><th>状态</th><th>邮箱</th></tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.user.name}</td>
                    <td className="text-mute">{t.university}</td>
                    <td>
                      <span className={t.auditStatus === "APPROVED" ? "badge badge-ok" : "badge badge-bad"}>
                        {t.auditStatus === "APPROVED" ? "已通过" : "已驳回"}
                      </span>
                    </td>
                    <td className="mono text-[12px] text-dim">{t.user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
