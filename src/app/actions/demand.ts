"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";

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
  const description = String(fd.get("description") ?? "").trim();

  if (!subjectId || !learnerGrade) redirect(`/parent/demands/new?error=1`);

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) redirect(`/parent/demands/new?error=1`);

  const seq = (await db.demand.count()) + 1;
  const demand = await db.demand.create({
    data: {
      code: `D-${String(seq).padStart(4, "0")}`,
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

  await db.$transaction([
    db.application.update({ where: { id: applicationId }, data: { status: "ACCEPTED" } }),
    db.application.updateMany({
      where: { demandId: app.demandId, status: "PENDING", id: { not: applicationId } },
      data: { status: "REJECTED" },
    }),
    db.demand.update({ where: { id: app.demandId }, data: { status: "MATCHED" } }),
  ]);

  const seq = (await db.order.count()) + 1;
  const order = await db.order.create({
    data: {
      code: `O-${String(seq).padStart(4, "0")}`,
      demandId: app.demandId,
      parentId: s.uid,
      tutorId: app.tutorId,
      status: "ACTIVE",
      matchSource: "PARENT_ACCEPT",
    },
  });

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
