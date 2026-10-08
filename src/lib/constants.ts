export const CATEGORY_LABEL: Record<string, { label: string; en: string; desc: string }> = {
  LANGUAGE: { label: "语言", en: "LANGUAGES", desc: "口语陪练与第二外语入门" },
  CODING: { label: "编程", en: "CODING", desc: "从图形化创意到算法思维" },
  ART: { label: "艺术", en: "ARTS", desc: "器乐、美术与声乐基础训练" },
  SPORT: { label: "体育", en: "SPORTS", desc: "伴随成长的运动技能陪练" },
  UNI_COURSE: { label: "大学课业", en: "UNIVERSITY", desc: "挂科预警与绩点保卫" },
  EXAM: { label: "考试考证", en: "EXAMINATIONS", desc: "四六级、考研与留学语考" },
};

export const CATEGORY_ORDER = ["LANGUAGE", "CODING", "ART", "SPORT", "UNI_COURSE", "EXAM"];

export const MODE_LABEL: Record<string, string> = { ONLINE: "线上", OFFLINE: "线下", BOTH: "线上 / 线下" };

export const AUDIT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待审核", cls: "badge badge-warn" },
  APPROVED: { label: "已认证", cls: "badge badge-ok" },
  REJECTED: { label: "已驳回", cls: "badge badge-bad" },
};

export const DEMAND_STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "撮合中", cls: "badge badge-accent" },
  MATCHED: { label: "已成单", cls: "badge badge-ok" },
  CLOSED: { label: "已关闭", cls: "badge" },
};

export const REVIEW_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待平台审核", cls: "badge badge-warn" },
  APPROVED: { label: "已通过", cls: "badge badge-ok" },
  REJECTED: { label: "未通过", cls: "badge badge-bad" },
};

export const APP_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待家长确认", cls: "badge badge-warn" },
  ACCEPTED: { label: "已接受", cls: "badge badge-ok" },
  REJECTED: { label: "已婉拒", cls: "badge" },
};

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "进行中", cls: "badge badge-accent" },
  FINISHED: { label: "已完结", cls: "badge badge-ok" },
  CANCELLED: { label: "已取消", cls: "badge" },
};

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${p(date.getMonth() + 1)}.${p(date.getDate())}`;
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(date)} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
