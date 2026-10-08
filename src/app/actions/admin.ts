"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";

export async function auditTutorAction(fd: FormData) {
  await requireRole("ADMIN");
  const tutorId = String(fd.get("tutorId") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim();

  const tutor = await db.tutorProfile.findUnique({ where: { id: tutorId }, include: { user: true } });
  if (!tutor || tutor.auditStatus !== "PENDING") return;

  if (decision === "APPROVE") {
    await db.tutorProfile.update({ where: { id: tutorId }, data: { auditStatus: "APPROVED", auditNote: "" } });
    await push(tutor.userId, "AUDIT", `恭喜！你的教员认证已通过，档案已进入公开教员库。`, `/tutors/${tutorId}`);
  } else if (decision === "REJECT") {
    await db.tutorProfile.update({ where: { id: tutorId }, data: { auditStatus: "REJECTED", auditNote: note || "材料不清晰，请重新提交" } });
    await push(tutor.userId, "AUDIT", `认证未通过：${note || "材料不清晰，请重新提交"}`, "/tutor/profile");
  }
  revalidatePath("/admin/audits");
  revalidatePath("/tutors");
}

export async function reviewDemandAction(fd: FormData) {
  await requireRole("ADMIN");
  const demandId = String(fd.get("demandId") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim();

  const demand = await db.demand.findUnique({ where: { id: demandId }, include: { subject: true } });
  if (!demand || demand.reviewStatus !== "PENDING") return;

  if (decision === "APPROVE") {
    await db.demand.update({ where: { id: demandId }, data: { reviewStatus: "APPROVED", auditNote: "" } });
    await push(demand.parentId, "DEMAND", `你的求教单 ${demand.code}（${demand.subject.name}）已通过审核，进入需求大厅。`, `/parent/demands/${demandId}`);
  } else if (decision === "REJECT") {
    await db.demand.update({ where: { id: demandId }, data: { reviewStatus: "REJECTED", auditNote: note || "信息不完整" } });
    await push(demand.parentId, "DEMAND", `求教单 ${demand.code} 审核未通过：${note || "信息不完整"}`, `/parent/demands/${demandId}`);
  }
  revalidatePath("/admin/demands");
  revalidatePath("/tutor/demands");
}

export async function adminMatchAction(fd: FormData) {
  await requireRole("ADMIN");
  const demandId = String(fd.get("demandId") ?? "");
  const tutorId = String(fd.get("tutorId") ?? "");

  const demand = await db.demand.findUnique({ where: { id: demandId }, include: { subject: true } });
  const tutor = await db.tutorProfile.findUnique({ where: { id: tutorId }, include: { user: true } });
  if (!demand || !tutor) return;
  if (demand.status !== "OPEN" || demand.reviewStatus !== "APPROVED") return;
  if (tutor.auditStatus !== "APPROVED") return;

  // 该需求下所有待确认报名自动婉拒
  const pending = await db.application.findMany({
    where: { demandId, status: "PENDING" },
    include: { tutor: true },
  });
  await db.application.updateMany({ where: { demandId, status: "PENDING" }, data: { status: "REJECTED" } });

  const seq = (await db.order.count()) + 1;
  const order = await db.order.create({
    data: {
      code: `O-${String(seq).padStart(4, "0")}`,
      demandId,
      parentId: demand.parentId,
      tutorId,
      status: "ACTIVE",
      matchSource: "ADMIN_RECOMMEND",
    },
  });
  await db.demand.update({ where: { id: demandId }, data: { status: "MATCHED" } });

  await Promise.all([
    push(demand.parentId, "ORDER", `平台为你的求教单 ${demand.code}（${demand.subject.name}）推荐了教员 ${tutor.user.name}，撮合单 ${order.code} 已建立。`, `/parent/orders/${order.id}`),
    push(tutor.userId, "ORDER", `平台推荐：你与需求 ${demand.code}（${demand.subject.name}）的撮合单 ${order.code} 已建立，请尽快与家长联系。`, `/tutor/orders/${order.id}`),
    ...pending.map((p) => push(p.tutor.userId, "APPLICATION", `你对 ${demand.code}（${demand.subject.name}）的报名此次未能成行，感谢参与。`, "/tutor/applications")),
  ]);

  revalidatePath("/admin/recommends");
  revalidatePath("/admin/orders");
}
