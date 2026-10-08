import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { addLessonLogAction, finishOrderAction, cancelOrderAction, submitReviewAction } from "@/app/actions/order";
import { ORDER_STATUS, MODE_LABEL, fmtDate } from "@/lib/constants";
import { Avatar, Stars } from "@/components/Atoms";

export default async function ParentOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ matched?: string }>;
}) {
  const s = await requireRole("PARENT");
  const { id } = await params;
  const { matched } = await searchParams;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      tutor: { include: { user: true } },
      demand: { include: { subject: true } },
      lessonLogs: { orderBy: { date: "desc" } },
      reviews: true,
    },
  });
  if (!order || order.parentId !== s.uid) notFound();

  const myReview = order.reviews.find((r) => r.authorRole === "PARENT");
  const tutorReview = order.reviews.find((r) => r.authorRole === "TUTOR");
  const totalHours = order.lessonLogs.reduce((sum, l) => sum + l.hours, 0);

  return (
    <div className="space-y-8 max-w-4xl">
      {matched && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px] leading-[1.8]">
            撮合成功！课时费与排课请与教员直接沟通；每次课后别忘了记录课时反馈，撮合结束后可以互相评价。
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Order / 撮合单</p>
          <div className="flex items-center gap-3 mt-3">
            <h1 className="font-serifcn font-black text-3xl">{order.code}</h1>
            <span className={ORDER_STATUS[order.status]?.cls}>{ORDER_STATUS[order.status]?.label}</span>
            {order.matchSource === "ADMIN_RECOMMEND" && <span className="badge">平台推荐</span>}
          </div>
          <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">
            {fmtDate(order.startedAt)} 开始{order.finishedAt ? ` · ${fmtDate(order.finishedAt)} 完结` : ""} · 累计 {totalHours.toFixed(1)} 课时
          </p>
        </div>
        {order.status === "ACTIVE" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <form action={finishOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="btn btn-sm btn-primary w-full sm:w-auto">结束撮合</button>
            </form>
            <form action={cancelOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="btn btn-sm btn-danger">取消撮合</button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左：教员 + 需求摘要 */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-6">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-5">Tutor / 教员</p>
            <div className="flex items-start gap-4">
              <Avatar name={order.tutor.user.name} size={52} />
              <div>
                <Link href={`/tutors/${order.tutor.id}`} className="font-serifcn font-black text-lg link-slide">
                  {order.tutor.user.name}
                </Link>
                <p className="text-[12px] text-dim mt-1">
                  {order.tutor.university} · {order.tutor.grade}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Stars value={order.tutor.ratingAvg} size="sm" />
                  <span className="mono text-[11px] text-dim">{order.tutor.ratingAvg.toFixed(1)}</span>
                </div>
              </div>
            </div>
            {order.tutor.user.phone && (
              <p className="mono text-[12px] text-mute mt-4 pt-4 border-t border-line">☎ {order.tutor.user.phone}</p>
            )}
          </div>

          <div className="card p-6">
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-5">Demand / 需求摘要</p>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-4"><dt className="text-dim">科目</dt><dd>{order.demand.subject.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">学员</dt><dd>{order.demand.learnerGrade}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">方式</dt><dd>{MODE_LABEL[order.demand.mode]}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">频次</dt><dd>{order.demand.frequency || "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-dim">需求单号</dt><dd className="mono text-[12px]">{order.demand.code}</dd></div>
            </dl>
            <p className="help mt-5 pt-4 border-t border-line">
              服务费 ¥0 —— 现阶段为免费体验期，平台不收取撮合费用，课时费由你与教员直接结算。
            </p>
          </div>
        </div>

        {/* 右：课时反馈 + 互评 */}
        <div className="lg:col-span-8 space-y-8">
          <section>
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Lesson logs / 课时反馈</p>
            {order.status === "ACTIVE" && (
              <form action={addLessonLogAction} className="card p-5 mb-4 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-3 items-end">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label" htmlFor="date">日期</label>
                  <input id="date" name="date" type="date" required className="input !w-auto" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="label" htmlFor="hours">时长（小时）</label>
                  <input id="hours" name="hours" type="number" step="0.5" min="0.5" max="24" required defaultValue="2" className="input !w-24" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="feedback">本次课反馈</label>
                  <input id="feedback" name="feedback" className="input" placeholder="上了什么、状态如何、下次安排…" />
                </div>
                <button className="btn btn-sm sm:col-span-4 sm:w-fit">记录一次课时</button>
              </form>
            )}
            <div className="border-t border-line-strong">
              {order.lessonLogs.length === 0 && (
                <p className="text-[13px] text-dim py-8 border-b border-line">还没有课时记录。</p>
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

            {order.status !== "FINISHED" && (
              <p className="help mb-4">撮合结束后即可互相评价。</p>
            )}

            {order.status === "FINISHED" && !myReview && (
              <form action={submitReviewAction} className="card p-6 mb-4 space-y-4">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label" htmlFor="rating">给这位教员打分 / Rating</label>
                  <select id="rating" name="rating" className="select !w-40" defaultValue="5">
                    <option value="5">★★★★★ 非常满意</option>
                    <option value="4">★★★★ 满意</option>
                    <option value="3">★★★ 一般</option>
                    <option value="2">★★ 不太满意</option>
                    <option value="1">★ 不满意</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="comment">评价内容 / Comment</label>
                  <textarea id="comment" name="comment" className="textarea !min-h-24" placeholder="教学风格、沟通体验、值得推荐的地方…" />
                </div>
                <button className="btn btn-primary btn-sm">提交评价</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="mono text-[9px] tracking-[0.22em] text-dim uppercase mb-3">家长 → 教员</p>
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
              <div className="card p-5">
                <p className="mono text-[9px] tracking-[0.22em] text-dim uppercase mb-3">教员 → 家长</p>
                {tutorReview ? (
                  <>
                    <Stars value={tutorReview.rating} />
                    {tutorReview.comment && <p className="text-[13px] leading-[1.9] text-mute mt-2">{tutorReview.comment}</p>}
                    <p className="mono text-[9px] text-dim mt-2">{fmtDate(tutorReview.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-[13px] text-dim">{order.status === "FINISHED" ? "教员还没有评价" : "待撮合结束"}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
