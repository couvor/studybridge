import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createDemandAction } from "@/app/actions/demand";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/constants";

export const metadata = { title: "发布需求 · 学桥" };

export default async function NewDemandPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("PARENT");
  const { error } = await searchParams;

  const subjects = await db.subject.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const groups = CATEGORY_ORDER.map((c) => ({
    key: c,
    label: CATEGORY_LABEL[c].label,
    items: subjects.filter((s) => s.category === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">New demand / 发布需求</p>
        <h1 className="font-serifcn font-black text-3xl mt-3">把需求说清楚</h1>
        <p className="text-[13.5px] leading-[1.9] text-mute mt-3">
          需求越具体，报名就越对味。发布后平台会先做一次人工审核（通常一个工作日内），
          通过后进入教员端的需求大厅。
        </p>
      </div>

      <form action={createDemandAction} className="card p-7 lg:p-10 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="subjectId">科目 / Subject *</label>
            <select id="subjectId" name="subjectId" required className="select" defaultValue="">
              <option value="" disabled>选择科目</option>
              {groups.map((g) => (
                <optgroup key={g.key} label={`── ${g.label} ──`}>
                  {g.items.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="learnerGrade">学员年级 / Grade *</label>
            <input id="learnerGrade" name="learnerGrade" required className="input" placeholder="如：初二 / 大一 / 小学三年级" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="mode">授课方式 / Mode *</label>
            <select id="mode" name="mode" className="select" defaultValue="ONLINE">
              <option value="ONLINE">线上</option>
              <option value="OFFLINE">线下</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="region">地区 / Region</label>
            <input id="region" name="region" className="input" placeholder="线下授课时填写，如：上海 · 杨浦区" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="frequency">频次 / Frequency</label>
            <input id="frequency" name="frequency" className="input" placeholder="如：每周 2 次，每次 2 小时" />
          </div>
          <div>
            <label className="label" htmlFor="budgetNote">预算备注 / Budget</label>
            <input id="budgetNote" name="budgetNote" className="input" placeholder="仅作沟通参考，如：150 元/小时上下" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">补充说明 / Description</label>
          <textarea
            id="description"
            name="description"
            className="textarea"
            maxLength={2000}
            placeholder="学员基础、目标、希望的教学风格、是否需要试听…"
          />
        </div>

        {error && (
          <p className="mono text-[11px] text-[#e0666a]">
            {error === "3" ? "发布过于频繁，请稍后再试" : "请至少填写科目与学员年级"}
          </p>
        )}

        <button className="btn btn-primary w-full sm:w-auto">提交需求，等待平台审核</button>
      </form>

      <div className="card-2 p-6">
        <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-3">Safety / 安全提示</p>
        <ul className="space-y-2 text-[12.5px] leading-[1.9] text-mute">
          <li>· 平台仅提供信息撮合，不参与教学组织与费用结算，课时费请与教员直接沟通。</li>
          <li>· 未成年人课程请家长全程知情参与，首次见面建议选择公共场所并由家长陪同。</li>
          <li>· 请勿在需求中填写家庭住址、身份证号等敏感信息，具体地址在确定人选后再行沟通。</li>
        </ul>
      </div>
    </div>
  );
}
