import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { db } from "@/lib/db";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/constants";

export default async function HomePage() {
  const [tutorCount, demandCount, orderCount, ratingAgg, subjectCount] = await Promise.all([
    db.tutorProfile.count({ where: { auditStatus: "APPROVED" } }),
    db.demand.count({ where: { reviewStatus: "APPROVED" } }),
    db.order.count({ where: { status: "FINISHED" } }),
    db.review.aggregate({ _avg: { rating: true }, where: { authorRole: "PARENT" } }),
    db.subject.count(),
  ]);

  const stats = [
    { num: `${tutorCount}`, label: "认证教员 / VERIFIED TUTORS" },
    { num: `${demandCount}`, label: "累计需求 / DEMANDS POSTED" },
    { num: `${orderCount}`, label: "完成撮合 / MATCHES MADE" },
    { num: ratingAgg._avg.rating ? ratingAgg._avg.rating.toFixed(1) : "—", label: "家长评分 / PARENT RATING" },
  ];

  return (
    <main className="flex-1">
      {/* ============ HERO ============ */}
      <section id="top" className="relative min-h-svh flex flex-col justify-between overflow-hidden">
        <div className="ghost absolute top-[16%] -right-[6vw] text-[13vw] opacity-80 select-none">STUDYBRIDGE</div>

        <div className="container-x flex-1 flex flex-col justify-center pt-28 pb-16">
          <div className="rise-1 mono text-[10px] tracking-[0.32em] text-dim uppercase flex flex-wrap items-center gap-x-6 gap-y-2 mb-10">
            <span className="text-accent-soft">31.29°N 121.52°E</span>
            <span>EST. 2026</span>
            <span>INFORMATION MATCHING ONLY</span>
          </div>

          <h1 className="rise-2 font-serifcn font-black leading-[1.15] text-[clamp(2.6rem,7vw,6.5rem)] max-w-5xl">
            让每一份学问，
            <br />
            找到<span className="text-accent-soft">需要它的人</span>。
          </h1>

          <p className="rise-3 mt-8 text-[15px] lg:text-[16px] leading-[2] text-mute max-w-xl">
            学桥是一座桥：一端是经过认证的大学生教员，一端是正在寻找陪伴式辅导的家庭。
            我们只做信息撮合 —— 认证、展示、报名、互评，其余交给真实的教学相长。
          </p>

          <div className="rise-4 flex flex-wrap gap-4 mt-12">
            <Link href="/tutors" className="btn btn-primary">浏览教员库</Link>
            <Link href="/register" className="btn">发布求教需求</Link>
            <Link href="/register?role=TUTOR" className="btn btn-ghost">我是大学生，入驻 →</Link>
          </div>
        </div>

        <div className="container-x pb-8 rise-5 flex items-center justify-between border-t border-line pt-5">
          <span className="mono text-[10px] tracking-[0.3em] text-dim uppercase">Scroll / 向下滚动</span>
          <span className="mono text-[10px] tracking-[0.3em] text-dim animate-bounce">↓</span>
          <span className="mono text-[10px] tracking-[0.3em] text-dim uppercase">{subjectCount} SUBJECTS</span>
        </div>
      </section>

      {/* ============ 01 定位 ============ */}
      <section id="about" className="section-y border-t border-line relative overflow-hidden">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 reveal">
            <Eyebrow num="01" en="About" zh="平台定位" />
            <h2 className="font-serifcn font-black text-[clamp(2rem,4.5vw,3.8rem)] leading-snug mt-8">
              只做信息撮合，
              <br />
              把教学还给当事人。
            </h2>
            <div className="mt-8 space-y-5 text-[14px] leading-[2.1] text-mute max-w-xl">
              <p>
                学桥不组织培训、不雇佣教员、不代收课时费。我们做的事情朴素而克制：
                核验教员的在校身份，把他们的所长与时间展示出来；帮家长把需求说清楚，
                让合适的教员看到并报名。
              </p>
              <p>
                课时费由家长与教员直接结算，上课地点与方式由双方自行商定。
                平台不介入教学过程，只在每一个关键节点 —— 认证、报名、成单、课时记录、互评 —— 留下可回溯的档案。
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28 card p-7 reveal-late">
              <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-5">Compliance / 合规要点</p>
              <ul className="space-y-4 text-[13px] leading-[1.9] text-mute">
                <li className="flex gap-3"><span className="mono text-accent-soft text-[10px] mt-1.5">01</span>平台仅提供信息发布与撮合服务，非培训机构</li>
                <li className="flex gap-3"><span className="mono text-accent-soft text-[10px] mt-1.5">02</span>不面向义务教育阶段学科类培训组织课程</li>
                <li className="flex gap-3"><span className="mono text-accent-soft text-[10px] mt-1.5">03</span>课时费由家长与教员直接结算，平台不经手</li>
                <li className="flex gap-3"><span className="mono text-accent-soft text-[10px] mt-1.5">04</span>现阶段为免费体验期，撮合服务不收取任何费用</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 02 科目矩阵 ============ */}
      <section id="subjects" className="section-y border-t border-line">
        <div className="container-x">
          <div className="reveal"><Eyebrow num="02" en="Subjects" zh="科目矩阵" /></div>
          <h2 className="reveal font-serifcn font-black text-[clamp(2rem,4.5vw,3.8rem)] leading-snug mt-8 mb-14">
            六个方向，
            <span className="text-dim">各有分寸。</span>
          </h2>

          <div className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-line">
            {CATEGORY_ORDER.map((key, i) => {
              const c = CATEGORY_LABEL[key];
              return (
                <Link
                  key={key}
                  href={`/tutors?cat=${key}`}
                  className="group border-b border-r border-line p-8 lg:p-10 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--fg)_2.5%,transparent)]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="mono text-[10px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-serif italic text-[15px] text-dim group-hover:text-accent-soft transition-colors duration-300">
                      {c.en}
                    </span>
                  </div>
                  <h3 className="font-serifcn font-black text-2xl mt-6 mb-3 group-hover:text-accent-soft transition-colors duration-300">
                    {c.label}
                  </h3>
                  <p className="text-[13px] leading-[1.9] text-mute">{c.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 03 撮合流程 ============ */}
      <section id="process" className="section-y border-t border-line">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 reveal">
              <Eyebrow num="03" en="Process" zh="撮合流程" />
              <h2 className="font-serifcn font-black text-[clamp(2rem,4vw,3.4rem)] leading-snug mt-8">
                四步成桥。
              </h2>
              <p className="mt-6 text-[13.5px] leading-[2] text-mute">
                每一步都留下档案。家长看得到教员是谁，教员看得到需求是什么，
                平台看得到每一次撮合的来龙去脉。
              </p>
              <Link href="/register" className="btn mt-8">从发布需求开始</Link>
            </div>
          </div>

          <div className="lg:col-span-7 lg:col-start-6 border-t border-line-strong">
            {[
              { t: "发布与认证", d: "家长填写求教需求（年级、科目、频次、期望）；教员提交学生证与成绩单，平台人工核验后进入教员库。" },
              { t: "报名与沟通", d: "教员在需求大厅看到合适的需求后报名并留言；家长在报名列表里比较教员的档案、评分与可用时间。" },
              { t: "撮合成单", d: "家长接受心仪的报名，生成撮合单。双方自行商定试听与正式课安排，课时费直接结算。" },
              { t: "课时与互评", d: "每次课后家长记录课时反馈；任一方结束撮合后双向互评，评分沉淀进教员档案。" },
            ].map((s, i) => (
              <div key={s.t} className="row-item reveal group">
                <div className="flex items-start gap-6">
                  <span className="idx pt-1.5">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-serifcn text-[17px] font-semibold group-hover:text-accent-soft transition-colors">{s.t}</h3>
                    <p className="text-[13.5px] leading-[1.9] text-mute mt-2">{s.d}</p>
                  </div>
                  <span className="ml-auto mono text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-300">↗</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 数字带 ============ */}
      <section className="border-t border-line">
        <div className="container-x">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-line border-x border-line">
            {stats.map((s) => (
              <div key={s.label} className="p-8 lg:p-12 reveal">
                <p className="stat-num">{s.num}</p>
                <p className="mono text-[9px] tracking-[0.22em] text-dim mt-4 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 04 互信机制 ============ */}
      <section id="trust" className="section-y border-t border-line">
        <div className="container-x">
          <div className="reveal"><Eyebrow num="04" en="Trust" zh="互信机制" /></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10 mb-14">
            <h2 className="lg:col-span-7 reveal font-serifcn font-black text-[clamp(2rem,4.5vw,3.8rem)] leading-snug">
              信任不是口号，
              <br />
              是一页页留下的档案。
            </h2>
            <p className="lg:col-span-4 lg:col-start-9 reveal-late text-[13.5px] leading-[2] text-mute self-end">
              家教最贵的是试错成本。我们把「可回溯」做进每个环节，
              让第一次见面之前，彼此已经足够了解。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-line">
            {[
              { en: "VERIFIED", t: "实名认证", d: "学生证 + 成绩单双材料人工审核，档案页展示认证徽章与所在院校。" },
              { en: "TRIAL", t: "自由试听", d: "是否安排试听课、试听是否收费，均由双方在报名沟通中自行商定。" },
              { en: "LESSON LOG", t: "课时反馈", d: "家长每次课后记录时长与反馈，形成学员的成长曲线与出勤档案。" },
              { en: "REVIEW", t: "双向互评", d: "撮合结束后家长与教员互评，评分与评价沉淀为公开的信用资产。" },
            ].map((f, i) => (
              <div key={f.en} className="reveal border-b border-r border-line p-8 lg:p-10">
                <p className="mono text-[10px] tracking-[0.28em] text-accent-soft uppercase">{String(i + 1).padStart(2, "0")} · {f.en}</p>
                <h3 className="font-serifcn font-black text-xl mt-5 mb-3">{f.t}</h3>
                <p className="text-[13px] leading-[1.9] text-mute">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 05 CTA ============ */}
      <section className="section-y border-t border-line relative overflow-hidden">
        <div className="ghost absolute bottom-[-2vw] left-[-2vw] text-[11vw] opacity-50">JOIN</div>
        <div className="container-x relative">
          <div className="reveal"><Eyebrow num="05" en="Join" zh="加入" /></div>
          <h2 className="reveal font-serifcn font-black text-[clamp(2.2rem,5vw,4.4rem)] leading-snug mt-8 max-w-3xl">
            桥已搭好，
            <br />
            就等你过河。
          </h2>
          <div className="reveal flex flex-wrap gap-4 mt-12">
            <Link href="/register?role=TUTOR" className="btn btn-primary">大学生入驻</Link>
            <Link href="/register" className="btn">家长注册</Link>
            <Link href="/tutors" className="btn btn-ghost">先逛逛教员库 →</Link>
          </div>
          <p className="reveal mt-14 text-[12px] leading-[2] text-dim max-w-2xl">
            免责声明：学桥为信息撮合平台，非培训机构，不组织学科类培训、不代收任何费用。
            用户应在遵守当地法律法规的前提下使用本平台；未成年人课程请家长全程知情参与，
            并注意核实身份、选择安全的上课环境。
          </p>
        </div>
      </section>
    </main>
  );
}
