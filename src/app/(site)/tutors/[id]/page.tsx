import Link from "next/link";
import { notFound } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";
import { db } from "@/lib/db";
import { MODE_LABEL, fmtDate } from "@/lib/constants";
import { Avatar, Stars } from "@/components/Atoms";
import { getSession } from "@/lib/auth";

export default async function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutor = await db.tutorProfile.findUnique({
    where: { id },
    include: { user: true, subjects: true },
  });
  if (!tutor || tutor.auditStatus !== "APPROVED") notFound();

  const [reviews, finishedCount] = await Promise.all([
    db.review.findMany({
      where: { authorRole: "PARENT", order: { tutorId: id } },
      include: { order: { include: { demand: { include: { subject: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.order.count({ where: { tutorId: id, status: "FINISHED" } }),
  ]);

  const session = await getSession();
  const isSelf = session?.role === "TUTOR" && (await db.tutorProfile.findUnique({ where: { userId: session.uid } }))?.id === id;

  const info: Array<[string, string]> = [
    ["院校 / UNIVERSITY", tutor.university || "—"],
    ["院系专业 / MAJOR", tutor.major || "—"],
    ["年级 / GRADE", tutor.grade || "—"],
    ["授课方式 / MODE", MODE_LABEL[tutor.mode]],
    ["地区 / REGION", tutor.region || "线上授课"],
    ["可用时间 / AVAILABILITY", tutor.availableTime || "详见沟通"],
  ];

  return (
    <main className="flex-1">
      {/* 头部 */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="ghost absolute -top-6 right-[-4vw] text-[11vw] opacity-60">PROFILE</div>
        <div className="container-x pt-16 pb-14 lg:pt-24 lg:pb-20">
          <Link href="/tutors" className="mono text-[10px] tracking-[0.25em] text-dim uppercase hover:text-accent-soft transition-colors">
            ← 返回教员库
          </Link>

          <div className="mt-10 flex flex-col lg:flex-row lg:items-end gap-8 rise-1">
            <Avatar name={tutor.user.name} size={96} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="font-serifcn font-black text-[clamp(2.2rem,5vw,4rem)]">{tutor.user.name}</h1>
                <span className="badge badge-ok">✓ 已认证教员</span>
              </div>
              <p className="text-[14px] text-mute mt-3">
                {tutor.university} · {tutor.major} · {tutor.grade}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Stars value={tutor.ratingAvg} />
                <span className="mono text-[12px] text-dim">
                  {tutor.ratingAvg.toFixed(1)} / 5 · {tutor.ratingCount} 条评价 · {finishedCount} 次完单
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {isSelf ? (
                <Link href="/tutor/profile" className="btn">编辑我的档案</Link>
              ) : session?.role === "PARENT" ? (
                <Link href="/parent/demands/new" className="btn btn-primary">发布求教需求</Link>
              ) : (
                <>
                  <Link href="/register" className="btn btn-primary">注册成为家长，发出邀约</Link>
                  <Link href="/login" className="btn btn-ghost">已有账号，去登录</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-x py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* 左：简介 + 评价 */}
        <div className="lg:col-span-7 space-y-16">
          <section>
            <Eyebrow num="01" en="About" zh="教员自述" />
            <p className="mt-7 text-[14.5px] leading-[2.2] text-mute whitespace-pre-line">
              {tutor.bio || "这位教员还没有写下自述，请在报名沟通中进一步了解。"}
            </p>
          </section>

          <section>
            <Eyebrow num="02" en="Reviews" zh="家长评价" />
            <div className="mt-7 border-t border-line-strong">
              {reviews.length === 0 && (
                <p className="text-[13.5px] text-dim py-10">还没有家长评价。第一位评价，也许就来自你们家。</p>
              )}
              {reviews.map((r, i) => (
                <div key={r.id} className="row-item">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[13px] text-mute">{r.order.demand.subject.name} · {r.order.demand.learnerGrade}</span>
                    </div>
                    <Stars value={r.rating} size="sm" />
                  </div>
                  {r.comment && <p className="text-[13.5px] leading-[1.9] text-mute mt-3">{r.comment}</p>}
                  <p className="mono text-[10px] tracking-[0.15em] text-dim mt-2">{fmtDate(r.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右：档案信息 */}
        <div className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-28 space-y-4">
            <div className="card p-7">
              <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-6">File / 档案</p>
              <dl className="space-y-4">
                {info.map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 pb-4 border-b border-line last:border-0 last:pb-0">
                    <dt className="mono text-[9px] tracking-[0.2em] text-dim">{k}</dt>
                    <dd className="text-[13.5px] leading-[1.8]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="card-2 p-6">
              <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-4">Subjects / 可教科目</p>
              <div className="flex flex-wrap gap-1.5">
                {tutor.subjects.map((s) => (
                  <span key={s.id} className="badge badge-accent">{s.name}</span>
                ))}
              </div>
            </div>
            <p className="help px-1">
              平台仅提供信息撮合。课时费、试听安排请与教员直接沟通；未成年人课程请家长全程知情参与。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
