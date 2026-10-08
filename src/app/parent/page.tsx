import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEMAND_STATUS, REVIEW_STATUS, ORDER_STATUS, fmtDate } from "@/lib/constants";

export default async function ParentHome() {
  const s = await requireRole("PARENT");

  const [demands, activeOrders, finishedOrders, pendingApps, notes] = await Promise.all([
    db.demand.count({ where: { parentId: s.uid } }),
    db.order.count({ where: { parentId: s.uid, status: "ACTIVE" } }),
    db.order.count({ where: { parentId: s.uid, status: "FINISHED" } }),
    db.application.count({ where: { demand: { parentId: s.uid }, status: "PENDING" } }),
    db.notification.findMany({ where: { userId: s.uid }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    { label: "发布需求", en: "DEMANDS", num: demands },
    { label: "进行中撮合", en: "ACTIVE", num: activeOrders },
    { label: "已完成撮合", en: "FINISHED", num: finishedOrders },
    { label: "待确认报名", en: "PENDING", num: pendingApps, hot: pendingApps > 0 },
  ];

  const recentDemands = await db.demand.findMany({
    where: { parentId: s.uid },
    include: { subject: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-10">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Overview / 总览</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
          <h1 className="font-serifcn font-black text-3xl">你好，{s.name}</h1>
          <Link href="/parent/demands/new" className="btn btn-primary btn-sm">＋ 发布新需求</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-x border-t border-line divide-x divide-line">
        {stats.map((st) => (
          <div key={st.en} className="p-6 lg:p-8 border-b border-line">
            <p className={`stat-num !text-[clamp(2rem,3.5vw,3rem)] ${st.hot ? "text-accent-soft" : ""}`}>{st.num}</p>
            <p className="mono text-[9px] tracking-[0.22em] text-dim mt-3">{st.label} / {st.en}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase">Recent demands / 最近需求</p>
            <Link href="/parent/demands" className="mono text-[10px] tracking-[0.15em] text-dim hover:text-accent-soft transition-colors">全部 →</Link>
          </div>
          <div className="border-t border-line-strong">
            {recentDemands.length === 0 && (
              <div className="py-14 text-center border-b border-line">
                <p className="text-[13.5px] text-dim mb-4">还没有发布过需求</p>
                <Link href="/parent/demands/new" className="btn btn-sm">发布第一条需求</Link>
              </div>
            )}
            {recentDemands.map((d) => (
              <Link key={d.id} href={`/parent/demands/${d.id}`} className="row-item group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="mono text-[11px] text-dim">{d.code}</span>
                    <span className="font-serifcn text-[15px] font-semibold group-hover:text-accent-soft transition-colors truncate">
                      {d.subject.name} · {d.learnerGrade}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={REVIEW_STATUS[d.reviewStatus]?.cls}>{REVIEW_STATUS[d.reviewStatus]?.label}</span>
                    <span className={DEMAND_STATUS[d.status]?.cls}>{DEMAND_STATUS[d.status]?.label}</span>
                  </div>
                </div>
                <p className="mono text-[10px] tracking-[0.15em] text-dim mt-1.5">
                  {fmtDate(d.createdAt)} · {d._count.applications} 份报名
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase">Latest / 最新动态</p>
            <Link href="/notifications" className="mono text-[10px] tracking-[0.15em] text-dim hover:text-accent-soft transition-colors">通知中心 →</Link>
          </div>
          <div className="card divide-y divide-line">
            {notes.length === 0 && <p className="p-6 text-[13px] text-dim">暂无动态</p>}
            {notes.map((n) => (
              <div key={n.id} className="p-4.5 px-5 py-4">
                <p className="text-[13px] leading-[1.8] text-mute">{n.content}</p>
                <p className="mono text-[9px] tracking-[0.15em] text-dim mt-1.5">{fmtDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
