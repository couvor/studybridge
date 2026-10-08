import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ORDER_STATUS, fmtDate } from "@/lib/constants";

export const metadata = { title: "撮合单 · 学桥" };

export default async function ParentOrdersPage() {
  const s = await requireRole("PARENT");
  const orders = await db.order.findMany({
    where: { parentId: s.uid },
    include: {
      tutor: { include: { user: true } },
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
        <p className="text-[13px] text-mute mt-2">课时费由双方直接结算，平台不收取任何费用。</p>
      </div>

      <div className="border-t border-line-strong">
        {orders.length === 0 && (
          <div className="py-16 text-center border-b border-line">
            <p className="text-[13.5px] text-dim mb-4">还没有撮合单。接受一份报名后，撮合单会自动建立。</p>
            <Link href="/parent/demands" className="btn btn-sm">查看我的需求</Link>
          </div>
        )}
        {orders.map((o) => (
          <Link key={o.id} href={`/parent/orders/${o.id}`} className="row-item group">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="mono text-[11px] text-dim">{o.code}</span>
                <span className="font-serifcn text-[16px] font-semibold group-hover:text-accent-soft transition-colors">
                  {o.tutor.user.name} · {o.demand.subject.name}
                </span>
                {o.matchSource === "ADMIN_RECOMMEND" && <span className="badge">平台推荐</span>}
              </div>
              <span className={ORDER_STATUS[o.status]?.cls}>{ORDER_STATUS[o.status]?.label}</span>
            </div>
            <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
              {fmtDate(o.startedAt)} 开始
              {o.status === "ACTIVE" && o._count.lessonLogs > 0 && <span className="ml-3">已记录 {o._count.lessonLogs} 次课时</span>}
              {o.status === "FINISHED" && o.finishedAt && <span className="ml-3">{fmtDate(o.finishedAt)} 完结</span>}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
