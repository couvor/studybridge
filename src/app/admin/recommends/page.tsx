import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { adminMatchAction } from "@/app/actions/admin";
import { fmtDate, MODE_LABEL } from "@/lib/constants";

export const metadata = { title: "人工撮合 · 学桥" };

export default async function AdminRecommendsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; done?: string }>;
}) {
  await requireRole("ADMIN");
  const { subject, done } = await searchParams;

  const [openDemands, tutors, recentOrders] = await Promise.all([
    db.demand.findMany({
      where: {
        status: "OPEN",
        reviewStatus: "APPROVED",
        ...(subject ? { subject: { name: { contains: subject } } } : {}),
      },
      include: { subject: true, parent: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.tutorProfile.findMany({
      where: { auditStatus: "APPROVED" },
      include: { user: true, subjects: true },
      orderBy: { ratingAvg: "desc" },
    }),
    db.order.findMany({
      where: { matchSource: "ADMIN_RECOMMEND" },
      include: { parent: true, tutor: { include: { user: true } }, demand: { include: { subject: true } } },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Match / 人工撮合</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">为需求推荐教员</h1>
        <p className="text-[13px] text-mute mt-2">
          撮合质量即产品。直接把合适的认证教员派给需求，撮合单立即建立，双方都会收到通知。
        </p>
      </div>

      {done && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px]">撮合成功，撮合单已建立并通知双方。</p>
        </div>
      )}

      <div className="space-y-4">
        <form className="flex gap-3 items-end">
          <div>
            <label className="label" htmlFor="subject">按科目搜索需求</label>
            <input id="subject" name="subject" defaultValue={subject ?? ""} className="input !w-56" placeholder="如：数学 / 钢琴" />
          </div>
          <button className="btn btn-sm">搜索</button>
        </form>

        {openDemands.length === 0 && <div className="card py-12 text-center text-[13.5px] text-dim">当前没有撮合中的需求</div>}

        {openDemands.map((d) => {
          const matching = tutors.filter(
            (t) => t.subjects.some((s) => s.category === d.subject.category) || t.subjects.some((s) => s.id === d.subjectId)
          );
          const sorted = [...(matching.length ? matching : tutors)].slice(0, 60);
          return (
            <div key={d.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="mono text-[11px] text-dim">{d.code}</span>
                <h3 className="font-serifcn text-[16px] font-semibold">{d.subject.name} · {d.learnerGrade}</h3>
                <span className="badge">{MODE_LABEL[d.mode]}</span>
                {d._count.applications > 0 && <span className="badge badge-accent">{d._count.applications} 份报名待处理</span>}
              </div>
              <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
                {d.parent.name} · {fmtDate(d.createdAt)}{d.region && ` · ${d.region}`}{d.frequency && ` · ${d.frequency}`}
              </p>
              {d.description && <p className="text-[13px] leading-[1.9] text-mute mt-2.5 max-w-2xl line-clamp-2">{d.description}</p>}

              <form action={adminMatchAction} className="mt-5 pt-5 border-t border-line flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <input type="hidden" name="demandId" value={d.id} />
                <div className="flex-1">
                  <label className="label" htmlFor={`tutor-${d.id}`}>推荐教员</label>
                  <select id={`tutor-${d.id}`} name="tutorId" required defaultValue="" className="select">
                    <option value="" disabled>选择认证教员</option>
                    {sorted.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.name} · {t.university} · {t.subjects.map((x) => x.name).join(" / ")} · {t.ratingAvg.toFixed(1)}分
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-sm btn-primary sm:w-32">撮合</button>
              </form>
            </div>
          );
        })}
      </div>

      {recentOrders.length > 0 && (
        <section>
          <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Recommended / 平台推荐记录</p>
          <div className="overflow-x-auto card">
            <table className="tbl">
              <thead>
                <tr><th>单号</th><th>需求</th><th>家长</th><th>教员</th><th>时间</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono text-[12px]">{o.code}</td>
                    <td>{o.demand.subject.name} · {o.demand.learnerGrade}</td>
                    <td className="text-mute">{o.parent.name}</td>
                    <td className="text-mute">{o.tutor.user.name}</td>
                    <td className="mono text-[11px] text-dim">{fmtDate(o.startedAt)}</td>
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
