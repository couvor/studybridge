"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function saveUpload(file: File | null, prefix: string): Promise<string> {
  if (!file || file.size === 0) return "";
  if (file.size > 10 * 1024 * 1024) throw new Error("文件过大");
  const ext = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0]?.slice(0, 8) ?? "";
  const safe = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safe), Buffer.from(await file.arrayBuffer()));
  return safe;
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

  const card = fd.get("studentCard") as File | null;
  const transcript = fd.get("transcript") as File | null;
  const cardName = await saveUpload(card, "card");
  const transcriptName = await saveUpload(transcript, "transcript");

  // 重新提交认证材料则回到待审核；仅编辑文字不重置认证状态
  const hasNewMaterial = cardName || transcriptName;
  const nextStatus = hasNewMaterial ? "PENDING" : profile.auditStatus === "REJECTED" ? "PENDING" : profile.auditStatus;

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
      auditNote: "",
      subjects: { set: subjects.map((x) => ({ id: x.id })) },
    },
  });
  if (phone) await db.user.update({ where: { id: s.uid }, data: { phone } });

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
  const message = String(fd.get("message") ?? "").trim();

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
  if (exists) return;

  await db.application.create({ data: { demandId, tutorId: profile.id, message } });
  await push(demand.parentId, "APPLICATION", `你的求教单 ${demand.code}（${demand.subject.name}）收到 ${s.name} 的报名，快去看看吧。`, `/parent/demands/${demandId}`);

  revalidatePath("/tutor/demands");
  revalidatePath("/tutor/applications");
  revalidatePath(`/parent/demands/${demandId}`);
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
