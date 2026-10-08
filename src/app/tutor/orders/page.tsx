import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ORDER_STATUS, fmtDate } from "@/lib/constants";

export const metadata = { title: "撮合单 · 学桥" };

export default async function TutorOrdersPage() {
  const s = await requireRole("TUTOR");
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return null;

  const orders = await db.order.findMany({
    where: { tutorId: profile.id },
    include: {
      parent: true,
      demand: { include: { subject: true } },
      _count: { select: { lessonLogs: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Orders / 撮合单</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">我的撮合</h1>
      </div>

      <div className="border-t border-line-strong">
        {orders.length === 0 && (
          <div className="py-16 text-center border-b border-line">
            <p className="text-[13.5px] text-dim mb-4">还没有撮合单。报名被家长接受后会自动建立。</p>
            <Link href="/tutor/demands" className="btn btn-sm">去需求大厅报名</Link>
          </div>
        )}
        {orders.map((o) => (
          <Link key={o.id} href={`/tutor/orders/${o.id}`} className="row-item group">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="mono text-[11px] text-dim">{o.code}</span>
                <span className="font-serifcn text-[16px] font-semibold group-hover:text-accent-soft transition-colors">
                  {o.parent.name}家 · {o.demand.subject.name}
                </span>
                {o.matchSource === "ADMIN_RECOMMEND" && <span className="badge">平台推荐</span>}
              </div>
              <span className={ORDER_STATUS[o.status]?.cls}>{ORDER_STATUS[o.status]?.label}</span>
            </div>
            <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
              {fmtDate(o.startedAt)} 开始 · {o.demand.learnerGrade}
              {o.status === "ACTIVE" && o._count.lessonLogs > 0 && <span className="ml-3">已记录 {o._count.lessonLogs} 次课时</span>}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
