import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateTutorProfileAction } from "@/app/actions/tutor";
import { AUDIT_STATUS, CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/constants";

export const metadata = { title: "档案与认证 · 学桥" };

export default async function TutorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const s = await requireRole("TUTOR");
  const { saved } = await searchParams;

  const [profile, user, subjects] = await Promise.all([
    db.tutorProfile.findUnique({ where: { userId: s.uid }, include: { subjects: true } }),
    db.user.findUnique({ where: { id: s.uid } }),
    db.subject.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  if (!profile || !user) return null;

  const selected = new Set(profile.subjects.map((x) => x.id));
  const groups = CATEGORY_ORDER.map((c) => ({
    key: c,
    label: CATEGORY_LABEL[c].label,
    items: subjects.filter((x) => x.category === c),
  })).filter((g) => g.items.length > 0);
  const status = AUDIT_STATUS[profile.auditStatus];

  return (
    <div className="max-w-3xl space-y-8">
      {saved && (
        <div className="card-2 border-l-2 !border-l-accent px-5 py-4">
          <p className="text-[13.5px]">档案已保存。{profile.auditStatus === "PENDING" ? "认证材料已提交，等待平台人工核验。" : "修改即时生效。"}</p>
        </div>
      )}

      <div>
        <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase">Profile / 档案与认证</p>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <h1 className="font-serifcn font-black text-3xl">我的教员档案</h1>
          <span className={status?.cls}>{status?.label}</span>
        </div>
        {profile.auditStatus === "REJECTED" && profile.auditNote && (
          <p className="text-[12.5px] text-[#e0666a] mt-2">驳回原因：{profile.auditNote}</p>
        )}
        <p className="text-[13px] leading-[1.9] text-mute mt-3">
          认证通过后，档案将公开展示在教员库。上传新的认证材料会触发重新审核，仅编辑文字不影响认证状态。
        </p>
      </div>

      <form action={updateTutorProfileAction} className="card p-7 lg:p-9 space-y-6" encType="multipart/form-data">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="label" htmlFor="university">学校 / University</label>
            <input id="university" name="university" className="input" defaultValue={profile.university} placeholder="如：复旦大学" />
          </div>
          <div>
            <label className="label" htmlFor="major">院系专业 / Major</label>
            <input id="major" name="major" className="input" defaultValue={profile.major} placeholder="如：数学科学学院" />
          </div>
          <div>
            <label className="label" htmlFor="grade">年级 / Grade</label>
            <input id="grade" name="grade" className="input" defaultValue={profile.grade} placeholder="如：大三 / 研一" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="label" htmlFor="phone">联系电话 / Phone</label>
            <input id="phone" name="phone" className="input" defaultValue={user.phone} placeholder="成单后对家长可见" />
          </div>
          <div>
            <label className="label" htmlFor="mode">授课方式 / Mode</label>
            <select id="mode" name="mode" className="select" defaultValue={profile.mode}>
              <option value="ONLINE">线上</option>
              <option value="OFFLINE">线下</option>
              <option value="BOTH">线上 / 线下</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="region">所在地区 / Region</label>
            <input id="region" name="region" className="input" defaultValue={profile.region} placeholder="如：上海 · 杨浦区" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="availableTime">可用时间 / Availability</label>
          <input id="availableTime" name="availableTime" className="input" defaultValue={profile.availableTime} placeholder="如：工作日晚间 / 全天周末" />
        </div>

        <div>
          <label className="label" htmlFor="bio">教员自述 / Bio</label>
          <textarea id="bio" name="bio" className="textarea" defaultValue={profile.bio} placeholder="擅长的模块、带教经历、教学风格…这是家长最看重的部分" />
        </div>

        {/* 可教科目的复选 */}
        <div>
          <p className="label">可教科目 / Subjects</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
            {groups.map((g) => (
              <div key={g.key} className="contents">
                {g.items.map((sub) => (
                  <label key={sub.id} className="flex items-center gap-2.5 text-[13.5px] cursor-pointer py-0.5">
                    <input type="checkbox" name="subjects" value={sub.id} defaultChecked={selected.has(sub.id)} className="ck" />
                    <span>{sub.name}</span>
                    <span className="mono text-[9px] text-dim uppercase tracking-[0.15em]">{CATEGORY_LABEL[g.key].en}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 认证材料 */}
        <div className="border-t border-line pt-6 space-y-5">
          <div>
            <p className="mono text-[10px] tracking-[0.28em] text-dim uppercase mb-1">Certification / 认证材料</p>
            <p className="help mb-4">JPG / PNG / PDF，单张 10MB 以内。材料仅平台审核可见，不对外展示。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="studentCard">
                学生证 {profile.studentCardUrl && <span className="text-accent-soft normal-case tracking-normal">✓ 已上传</span>}
              </label>
              <input id="studentCard" name="studentCard" type="file" accept="image/*,.pdf" className="input !py-2.5 file:mr-3 file:btn-sm file:border-0 file:bg-transparent file:text-accent-soft file:cursor-pointer" />
            </div>
            <div>
              <label className="label" htmlFor="transcript">
                成绩单 {profile.transcriptUrl && <span className="text-accent-soft normal-case tracking-normal">✓ 已上传</span>}
              </label>
              <input id="transcript" name="transcript" type="file" accept="image/*,.pdf" className="input !py-2.5 file:mr-3 file:btn-sm file:border-0 file:bg-transparent file:text-accent-soft file:cursor-pointer" />
            </div>
          </div>
        </div>

        <button className="btn btn-primary">保存档案</button>
      </form>
    </div>
  );
}
