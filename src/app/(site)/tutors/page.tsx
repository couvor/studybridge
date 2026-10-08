import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { db } from "@/lib/db";
import { CATEGORY_LABEL, CATEGORY_ORDER, MODE_LABEL } from "@/lib/constants";
import { Avatar, Stars } from "@/components/Atoms";

export const metadata = { title: "教员库 · 学桥" };

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; mode?: string; q?: string }>;
}) {
  const { cat, mode, q } = await searchParams;

  const tutors = await db.tutorProfile.findMany({
    where: {
      auditStatus: "APPROVED",
      ...(cat && CATEGORY_LABEL[cat]
        ? { subjects: { some: { category: cat } } }
        : {}),
      ...(mode && ["ONLINE", "OFFLINE", "BOTH"].includes(mode)
        ? { OR: [{ mode }, { mode: "BOTH" }] }
        : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q } } },
              { university: { contains: q } },
              { major: { contains: q } },
              { region: { contains: q } },
            ],
          }
        : {}),
    },
    include: { user: true, subjects: true },
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
  });

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-line">
        <div className="ghost absolute -top-4 right-[-4vw] text-[10vw] opacity-60">TUTORS</div>
        <div className="container-x pt-16 pb-12 lg:pt-24 lg:pb-16">
          <div className="rise-1"><Eyebrow num="01" en="Library" zh="教员库" /></div>
          <h1 className="rise-2 font-serifcn font-black text-[clamp(2.4rem,5vw,4.5rem)] mt-6">
            认证教员
          </h1>
          <p className="rise-3 mt-5 text-[14px] leading-[2] text-mute max-w-xl">
            每一位教员都经过学生证与成绩单的人工核验。按方向、授课方式或关键词找到心仪的人，
            再到需求大厅正式发出邀约。
          </p>
        </div>
      </section>

      {/* 筛选器 */}
      <section className="border-b border-line sticky top-[76px] z-30 bg-bg/90 backdrop-blur-md">
        <div className="container-x py-4">
          <form className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/tutors"
                className={`btn btn-sm ${!cat ? "btn-primary" : ""}`}
              >
                全部
              </Link>
              {CATEGORY_ORDER.map((key) => (
                <Link
                  key={key}
                  href={`/tutors?cat=${key}${mode ? `&mode=${mode}` : ""}`}
                  className={`btn btn-sm ${cat === key ? "btn-primary" : ""}`}
                >
                  {CATEGORY_LABEL[key].label}
                </Link>
              ))}
            </div>
            <div className="flex-1" />
            <select name="mode" defaultValue={mode ?? ""} className="select !w-auto !h-9 !py-0 text-[13px]">
              <option value="">授课方式</option>
              <option value="ONLINE">线上</option>
              <option value="OFFLINE">线下</option>
            </select>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="搜索姓名 / 学校 / 地区…"
              className="input !w-48 !h-9 !py-0 text-[13px]"
            />
            <button className="btn btn-sm">筛选</button>
          </form>
        </div>
      </section>

      {/* 列表 */}
      <section className="container-x py-12 lg:py-16">
        <p className="mono text-[10px] tracking-[0.25em] text-dim uppercase mb-6">
          {tutors.length} verified tutors
        </p>
        {tutors.length === 0 ? (
          <div className="border-t border-line py-20 text-center">
            <p className="font-serifcn text-lg text-mute">没有找到符合条件的教员</p>
            <p className="text-[13px] text-dim mt-2">试试放宽筛选条件，或稍后再来看看。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tutors.map((t, i) => (
              <Link
                key={t.id}
                href={`/tutors/${t.id}`}
                className={`card p-6 group hover:border-line-strong transition-all duration-300 hover:-translate-y-0.5 ${i < 6 ? `rise-${Math.min(i + 1, 5)}` : ""}`}
              >
                <div className="flex items-start gap-4">
                  <Avatar name={t.user.name} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serifcn font-black text-lg group-hover:text-accent-soft transition-colors truncate">
                        {t.user.name}
                      </h3>
                      <span className="badge badge-ok shrink-0">已认证</span>
                    </div>
                    <p className="text-[12px] text-dim mt-1 truncate">
                      {t.university} · {t.major} · {t.grade}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <Stars value={t.ratingAvg} size="sm" />
                      <span className="mono text-[11px] text-dim">{t.ratingAvg.toFixed(1)}（{t.ratingCount}）</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {t.subjects.slice(0, 4).map((s) => (
                    <span key={s.id} className="badge">{s.name}</span>
                  ))}
                  {t.subjects.length > 4 && <span className="badge">+{t.subjects.length - 4}</span>}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-line text-[12px] text-dim">
                  <span className="truncate">{t.region || "线上授课"}</span>
                  <span className="mono shrink-0">{MODE_LABEL[t.mode]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
