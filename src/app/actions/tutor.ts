"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";
import { cosConfigured, putObjectBuffer, uidTag } from "@/lib/cos";
import { materialExt, materialContentType } from "@/lib/materials";
import { rateLimit } from "@/lib/rateLimit";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// 浏览器直传产物名（含上传者标签，防止伪造指向他人材料）
const DIRECT_NAME_RE = /^(card|transcript)-u[a-f0-9]{8}-[0-9]{10,16}-[a-f0-9]{4,10}\.[a-z0-9]{2,8}$/i;

async function saveUpload(file: File | null, prefix: string): Promise<string> {
  if (!file || file.size === 0) return "";
  if (file.size > 10 * 1024 * 1024) throw new Error("文件超过 10MB 上限");
  const ext = materialExt(file.name);
  if (!ext) throw new Error("仅支持 JPG / PNG / GIF / WebP / PDF");
  const safe = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  if (cosConfigured()) {
    // 非文本数据一律进 COS（浏览器直传失败时的服务端中转回退）
    await putObjectBuffer(safe, Buffer.from(await file.arrayBuffer()), materialContentType(ext));
    return safe;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safe), Buffer.from(await file.arrayBuffer()));
  return safe;
}

// 读取本次提交的材料：优先浏览器直传产物（隐藏 key），否则回退文件本体
async function resolveUpload(fd: FormData, kind: "card" | "transcript", uid: string): Promise<string> {
  const key = String(fd.get(kind === "card" ? "studentCardKey" : "transcriptKey") ?? "").trim();
  if (
    key &&
    DIRECT_NAME_RE.test(key) &&
    key.toLowerCase().startsWith(kind) &&
    key.includes(`-u${uidTag(uid)}-`) &&
    cosConfigured()
  ) {
    return key;
  }
  return saveUpload(fd.get(kind) as File | null, kind);
}

export async function updateTutorProfileAction(fd: FormData) {
  const s = await requireRole("TUTOR");
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return;

  const university = String(fd.get("university") ?? "").trim();
  const major = String(fd.get("major") ?? "").trim();
  const grade = String(fd.get("grade") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  const availableTime = String(fd.get("availableTime") ?? "").trim();
  const region = String(fd.get("region") ?? "").trim();
  const mode = ["ONLINE", "OFFLINE", "BOTH"].includes(String(fd.get("mode"))) ? String(fd.get("mode")) : "BOTH";
  const subjectIds = fd.getAll("subjects").map(String).filter(Boolean);
  const phone = String(fd.get("phone") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();

  let cardName = "";
  let transcriptName = "";
  try {
    cardName = await resolveUpload(fd, "card", s.uid);
    transcriptName = await resolveUpload(fd, "transcript", s.uid);
  } catch (err) {
    // 文件过大 / 扩展名不在白名单：回档案页提示，不静默丢弃
    redirect(`/tutor/profile?error=upload&msg=${encodeURIComponent((err as Error).message)}`);
  }

  // 重新提交认证材料则回到待审核；仅编辑文字不重置认证状态（含被驳回后必须重新交材料）
  const hasNewMaterial = cardName || transcriptName;
  const nextStatus = hasNewMaterial ? "PENDING" : profile.auditStatus;

  const subjects = subjectIds.length
    ? await db.subject.findMany({ where: { id: { in: subjectIds } } })
    : [];

  await db.tutorProfile.update({
    where: { userId: s.uid },
    data: {
      university, major, grade, bio, availableTime, region, mode,
      ...(cardName ? { studentCardUrl: cardName } : {}),
      ...(transcriptName ? { transcriptUrl: transcriptName } : {}),
      auditStatus: nextStatus,
      // 驳回原因保留到重新提交材料：文字编辑不再触发重审，也就没必要清掉它
      ...(hasNewMaterial ? { auditNote: "" } : {}),
      subjects: { set: subjects.map((x) => ({ id: x.id })) },
    },
  });
  if (phone || name) {
    await db.user.update({
      where: { id: s.uid },
      data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
    });
  }

  if (hasNewMaterial) {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(admins.map((a) => push(a.id, "AUDIT", `教员 ${s.name} 提交了新的认证材料，待审核。`, "/admin/audits")));
  }

  revalidatePath("/tutor/profile");
  revalidatePath(`/tutors/${profile.id}`);
  redirect("/tutor/profile?saved=1");
}

export async function applyToDemandAction(fd: FormData) {
  const s = await requireRole("TUTOR");
  const demandId = String(fd.get("demandId") ?? "");
  const message = String(fd.get("message") ?? "").trim().slice(0, 500);

  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile || profile.auditStatus !== "APPROVED") return;

  const demand = await db.demand.findUnique({
    where: { id: demandId },
    include: { subject: true },
  });
  if (!demand || demand.status !== "OPEN" || demand.reviewStatus !== "APPROVED") return;

  const exists = await db.application.findUnique({
    where: { demandId_tutorId: { demandId, tutorId: profile.id } },
  });
  if (exists) {
    // 被婉拒（REJECTED）的报名可重新提交：更新留言并回到待确认，其余状态不重复报名
    if (exists.status !== "REJECTED" || !rateLimit(`apply:${s.uid}`, 20, 60 * 60_000)) return;
    await db.application.update({ where: { id: exists.id }, data: { message, status: "PENDING" } });
  } else {
    if (!rateLimit(`apply:${s.uid}`, 20, 60 * 60_000)) return;
    await db.application.create({ data: { demandId, tutorId: profile.id, message } });
  }
  await push(demand.parentId, "APPLICATION", `你的求教单 ${demand.code}（${demand.subject.name}）收到 ${s.name} 的报名，快去看看吧。`, `/parent/demands/${demandId}`);

  revalidatePath("/tutor/demands");
  revalidatePath("/tutor/applications");
  revalidatePath(`/parent/demands/${demandId}`);
  redirect(`/tutor/demands?applied=${demandId}`);
}

export async function withdrawApplicationAction(fd: FormData) {
  const s = await requireRole("TUTOR");
  const applicationId = String(fd.get("applicationId") ?? "");
  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return;

  const app = await db.application.findUnique({ where: { id: applicationId } });
  if (!app || app.tutorId !== profile.id || app.status !== "PENDING") return;

  await db.application.delete({ where: { id: applicationId } });
  revalidatePath("/tutor/applications");
  revalidatePath("/tutor/demands");
}

export async function submitTutorReviewAction(fd: FormData) {
  const s = await requireRole("TUTOR");
  const orderId = String(fd.get("orderId") ?? "");
  const rating = Math.max(1, Math.min(5, parseInt(String(fd.get("rating") ?? "5"), 10) || 5));
  const comment = String(fd.get("comment") ?? "").trim();

  const profile = await db.tutorProfile.findUnique({ where: { userId: s.uid } });
  if (!profile) return;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.tutorId !== profile.id || order.status !== "FINISHED") return;

  const exists = await db.review.findFirst({ where: { orderId, authorRole: "TUTOR" } });
  if (exists) return;

  await db.review.create({ data: { orderId, authorRole: "TUTOR", rating, comment } });
  await push(order.parentId, "REVIEW", `撮合单 ${order.code} 收到一条教员评价（${rating} 星）。`, `/parent/orders/${orderId}`);
  revalidatePath(`/tutor/orders/${orderId}`);
  revalidatePath(`/parent/orders/${orderId}`);
}
