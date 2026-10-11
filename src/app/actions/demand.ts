"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";
import { demandCode, orderCode } from "@/lib/codes";
import { rateLimit } from "@/lib/rateLimit";

async function notifyAdmins(type: string, content: string, link: string) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(admins.map((a) => push(a.id, type, content, link)));
}

export async function createDemandAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const subjectId = String(fd.get("subjectId") ?? "");
  const learnerGrade = String(fd.get("learnerGrade") ?? "").trim();
  const mode = String(fd.get("mode") ?? "ONLINE") === "OFFLINE" ? "OFFLINE" : "ONLINE";
  const region = String(fd.get("region") ?? "").trim();
  const frequency = String(fd.get("frequency") ?? "").trim();
  const budgetNote = String(fd.get("budgetNote") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim().slice(0, 2000);

  if (!rateLimit(`demand:${s.uid}`, 10, 60 * 60_000)) redirect(`/parent/demands/new?error=3`);
  if (!subjectId || !learnerGrade) redirect(`/parent/demands/new?error=1`);

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) redirect(`/parent/demands/new?error=1`);

  const demand = await db.demand.create({
    data: {
      code: demandCode(),
      parentId: s.uid,
      subjectId,
      learnerGrade,
      mode,
      region,
      frequency,
      budgetNote,
      description,
      status: "OPEN",
      reviewStatus: "PENDING",
    },
  });

  await notifyAdmins("DEMAND", `新需求 ${demand.code}（${subject.name}）待审核`, "/admin/demands");
  redirect(`/parent/demands/${demand.id}?created=1`);
}

export async function closeDemandAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const id = String(fd.get("demandId") ?? "");
  const demand = await db.demand.findUnique({ where: { id }, include: { subject: true } });
  if (!demand || demand.parentId !== s.uid || demand.status !== "OPEN") return;

  await db.demand.update({ where: { id }, data: { status: "CLOSED" } });
  const apps = await db.application.findMany({ where: { demandId: id, status: "PENDING" }, select: { tutorId: true } });
  const tutors = await db.tutorProfile.findMany({ where: { id: { in: apps.map((a) => a.tutorId) } }, select: { userId: true } });
  await Promise.all(tutors.map((t) => push(t.userId, "DEMAND", `你报名的需求 ${demand.code}（${demand.subject.name}）已被家长关闭。`, "/tutor/applications")));
  revalidatePath(`/parent/demands/${id}`);
  revalidatePath("/parent/demands");
}

export async function acceptApplicationAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const applicationId = String(fd.get("applicationId") ?? "");

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { demand: { include: { subject: true } }, tutor: true },
  });
  if (!app || app.demand.parentId !== s.uid) return;
  if (app.demand.status !== "OPEN" || app.status !== "PENDING") return;

  // 原子完成：接受报名、婉拒其余、需求转 MATCHED、建撮合单。
  // demand.updateMany 带 OPEN 条件——并发接受两个报名时只有一个能改状态，
  // 另一个 updateMany 影响 0 行即回滚；Order.demandId 唯一约束兜底防重复成单。
  const order = await db.$transaction(async (tx) => {
    const claimed = await tx.demand.updateMany({
      where: { id: app.demandId, status: "OPEN" },
      data: { status: "MATCHED" },
    });
    if (claimed.count === 0) return null;
    await tx.application.update({ where: { id: applicationId }, data: { status: "ACCEPTED" } });
    await tx.application.updateMany({
      where: { demandId: app.demandId, status: "PENDING", id: { not: applicationId } },
      data: { status: "REJECTED" },
    });
    return tx.order.create({
      data: {
        code: orderCode(),
        demandId: app.demandId,
        parentId: s.uid,
        tutorId: app.tutorId,
        status: "ACTIVE",
        matchSource: "PARENT_ACCEPT",
      },
    });
  });
  if (!order) return; // 已被并发请求处理，本次不重复成单

  await push(app.tutor.userId, "ORDER", `恭喜！家长已接受你对 ${app.demand.code}（${app.demand.subject.name}）的报名，撮合单 ${order.code} 已建立。`, `/tutor/orders/${order.id}`);

  const others = await db.application.findMany({
    where: { demandId: app.demandId, status: "REJECTED", id: { not: applicationId } },
    select: { tutorId: true },
  });
  const otherTutors = await db.tutorProfile.findMany({ where: { id: { in: others.map((o) => o.tutorId) } }, select: { userId: true } });
  await Promise.all(otherTutors.map((t) => push(t.userId, "APPLICATION", `你对 ${app.demand.code}（${app.demand.subject.name}）的报名此次未能成行，感谢参与。`, "/tutor/applications")));

  redirect(`/parent/orders/${order.id}?matched=1`);
}

export async function rejectApplicationAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const applicationId = String(fd.get("applicationId") ?? "");
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { demand: { include: { subject: true } }, tutor: true },
  });
  if (!app || app.demand.parentId !== s.uid || app.status !== "PENDING") return;

  await db.application.update({ where: { id: applicationId }, data: { status: "REJECTED" } });
  await push(app.tutor.userId, "APPLICATION", `你对 ${app.demand.code}（${app.demand.subject.name}）的报名此次未能成行，感谢参与。`, "/tutor/applications");
  revalidatePath(`/parent/demands/${app.demandId}`);
}
