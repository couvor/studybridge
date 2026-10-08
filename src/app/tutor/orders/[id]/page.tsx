import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { submitTutorReviewAction } from "@/app/actions/tutor";
import { ORDER_STATUS, MODE_LABEL, fmtDate } from "@/lib/constants";
import { Avatar, Stars } from "@/components/Atoms";

export default async function TutorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("TUTOR");
  const { id } = await params;
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return null;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      parent: true,
      demand: { include: { subject: true } },
      lessonLogs: { orderBy: { date: "desc" } },
      reviews: true,
    },
  });
  if (!order || order.tutorId !== profile.id) notFound();

  const myReview = order.reviews.find((r) => r.authorRole === "TUTOR");
  const parentReview = order.reviews.find((r) => r.authorRole === "PARENT");
  const totalHours = order.lessonLogs.reduce((sum, l) => sum + l.hours, 0);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Order / 撮合单</p>
          <div className="flex items-center gap-3 mt-3">
            <h1 className="font-serifcn font-black text-3xl">{order.code}</h1>
            <span className={ORDER_STATUS[order.status]?.cls}>{ORDER_STATUS[order.status]?.label}</span>
          </div>
          <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
            {fmtDate(order.startedAt)} 开始{order.finishedAt ? ` · ${fmtDate(order.finishedAt)} 完结` : ""} · 累计 {totalHours.toFixed(1)} 课时
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-6">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-5">Family / 家长</p>
            <div className="flex items-start gap-4">
              <Avatar name={order.parent.name} size={52} />
              <div>
                <p className="font-serifcn font-black text-lg">{order.parent.name}</p>
                {order.parent.phone && <p className="mono text-[12px] text-mute mt-1">☎ {order.parent.phone}</p>}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-5">Demand / 需求摘要</p>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-4"><dt className="text-dim">科目</dt><dd>{order.demand.subject.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">学员</dt><dd>{order.demand.learnerGrade}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">方式</dt><dd>{MODE_LABEL[order.demand.mode]}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">频次</dt><dd>{order.demand.frequency || "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">预算备注</dt><dd>{order.demand.budgetNote || "—"}</dd></div>
            </dl>
            {order.demand.description && (
              <p className="text-[12.5px] leading-[1.9] text-mute mt-4 pt-4 border-t border-line whitespace-pre-line">{order.demand.description}</p>
            )}
            <p className="help mt-4">课时费由双方直接结算，平台不收取任何费用。</p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section>
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Lesson logs / 课时记录（家长记录）</p>
            <div className="border-t border-line-strong">
              {order.lessonLogs.length === 0 && (
                <p className="text-[13px] text-dim py-8 border-b border-line">家长还没有记录课时。</p>
              )}
              {order.lessonLogs.map((l, i) => (
                <div key={l.id} className="row-item">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono text-[11px] text-dim">{String(order.lessonLogs.length - i).padStart(2, "0")} · {fmtDate(l.date)}</span>
                    <span className="mono text-[11px] text-accent-soft">{l.hours}h</span>
                  </div>
                  {l.feedback && <p className="text-[13.5px] leading-[1.9] text-mute mt-2">{l.feedback}</p>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Reviews / 双向评价</p>

            {order.status === "FINISHED" && !myReview && (
              <form action={submitTutorReviewAction} className="card p-6 mb-4 space-y-4">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label" htmlFor="rating">给这位家长打分 / Rating</label>
                  <select id="rating" name="rating" className="select !w-40" defaultValue="5">
                    <option value="5">★★★★★ 非常愉快</option>
                    <option value="4">★★★★ 愉快</option>
                    <option value="3">★★★ 一般</option>
                    <option value="2">★★ 不太愉快</option>
                    <option value="1">★ 不愉快</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="comment">评价内容 / Comment</label>
                  <textarea id="comment" name="comment" className="textarea !min-h-24" placeholder="沟通配合度、学员表现…" />
                </div>
                <button className="btn btn-primary btn-sm">提交评价</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="mono text-[9px] tracking-[0.22em] text-dim uppercase mb-3">家长 → 我</p>
                {parentReview ? (
                  <>
                    <Stars value={parentReview.rating} />
                    {parentReview.comment && <p className="text-[13px] leading-[1.9] text-mute mt-2">{parentReview.comment}</p>}
                    <p className="mono text-[9px] text-dim mt-2">{fmtDate(parentReview.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-[13px] text-dim">{order.status === "FINISHED" ? "家长还没有评价" : "待撮合结束"}</p>
                )}
              </div>
              <div className="card p-5">
                <p className="mono text-[9px] tracking-[0.22em] text-dim uppercase mb-3">我 → 家长</p>
                {myReview ? (
                  <>
                    <Stars value={myReview.rating} />
                    {myReview.comment && <p className="text-[13px] leading-[1.9] text-mute mt-2">{myReview.comment}</p>}
                    <p className="mono text-[9px] text-dim mt-2">{fmtDate(myReview.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-[13px] text-dim">{order.status === "FINISHED" ? "你还没有评价" : "待撮合结束"}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
