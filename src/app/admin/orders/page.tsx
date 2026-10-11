import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ORDER_STATUS, fmtDate } from "@/lib/constants";

export const metadata = { title: "订单总览 · 学桥" };

export default async function AdminOrdersPage() {
  await requireRole("ADMIN");
  const orders = await db.order.findMany({
    include: {
      parent: true,
      tutor: { include: { user: true } },
      demand: { include: { subject: true } },
      _count: { select: { lessonLogs: true, reviews: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Orders / 订单总览</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">全部撮合单</h1>
      </div>

      <div className="overflow-x-auto card">
        <table className="tbl">
          <thead>
            <tr><th>单号</th><th>科目 / 学员</th><th>家长</th><th>教员</th><th>来源</th><th>服务费</th><th>课时</th><th>评价</th><th>状态</th><th>开始</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono text-[12px]">{o.code}</td>
                <td>{o.demand.subject.name}<span className="text-dim"> · {o.demand.learnerGrade}</span></td>
                <td className="text-mute">{o.parent.name}</td>
                <td className="text-mute">{o.tutor.user.name}</td>
                <td className="text-dim text-[12px]">{o.matchSource === "ADMIN_RECOMMEND" ? "平台推荐" : "家长接受"}</td>
                <td className="mono text-[12px] text-dim">¥{o.feeAmount.toFixed(0)}</td>
                <td className="mono text-[12px]">{o._count.lessonLogs} 次</td>
                <td className="mono text-[12px]">{o._count.reviews}/2</td>
                <td><span className={ORDER_STATUS[o.status]?.cls}>{ORDER_STATUS[o.status]?.label}</span></td>
                <td className="mono text-[11px] text-dim">{fmtDate(o.startedAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={10} className="text-center text-dim py-10">还没有撮合单</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
