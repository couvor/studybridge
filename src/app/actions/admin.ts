"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";
import { orderCode } from "@/lib/codes";

export async function auditTutorAction(fd: FormData) {
  await requireRole("ADMIN");
  const tutorId = String(fd.get("tutorId") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim();

  const tutor = await db.tutorProfile.findUnique({ where: { id: tutorId }, include: { user: true } });
  if (!tutor || tutor.auditStatus !== "PENDING") {
    redirect("/admin/audits?error=1");
  }

  if (decision === "APPROVE") {
    await db.tutorProfile.update({ where: { id: tutorId }, data: { auditStatus: "APPROVED", auditNote: "" } });
    await push(tutor.userId, "AUDIT", `恭喜！你的教员认证已通过，档案已进入公开教员库。`, `/tutors/${tutorId}`);
  } else if (decision === "REJECT") {
    await db.tutorProfile.update({ where: { id: tutorId }, data: { auditStatus: "REJECTED", auditNote: note || "材料不清晰，请重新提交" } });
    await push(tutor.userId, "AUDIT", `认证未通过：${note || "材料不清晰，请重新提交"}`, "/tutor/profile");
  } else {
    redirect("/admin/audits?error=1");
  }
  revalidatePath("/admin/audits");
  revalidatePath("/tutors");
  redirect(`/admin/audits?done=${decision === "APPROVE" ? "approve" : "reject"}`);
}

export async function reviewDemandAction(fd: FormData) {
  await requireRole("ADMIN");
  const demandId = String(fd.get("demandId") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim();

  const demand = await db.demand.findUnique({ where: { id: demandId }, include: { subject: true } });
  if (!demand || demand.reviewStatus !== "PENDING") {
    redirect("/admin/demands?error=1");
  }

  if (decision === "APPROVE") {
    await db.demand.update({ where: { id: demandId }, data: { reviewStatus: "APPROVED", auditNote: "" } });
    await push(demand.parentId, "DEMAND", `你的求教单 ${demand.code}（${demand.subject.name}）已通过审核，进入需求大厅。`, `/parent/demands/${demandId}`);
  } else if (decision === "REJECT") {
    await db.demand.update({ where: { id: demandId }, data: { reviewStatus: "REJECTED", auditNote: note || "信息不完整" } });
    await push(demand.parentId, "DEMAND", `求教单 ${demand.code} 审核未通过：${note || "信息不完整"}`, `/parent/demands/${demandId}`);
  } else {
    redirect("/admin/demands?error=1");
  }
  revalidatePath("/admin/demands");
  revalidatePath("/tutor/demands");
  redirect(`/admin/demands?done=${decision === "APPROVE" ? "approve" : "reject"}`);
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

  // 原子完成：占用需求（OPEN→MATCHED）、婉拒待确认报名、建撮合单。
  // updateMany 带 OPEN 条件防并发撮合/家长接受同一需求重复成单（demandId 唯一约束兜底）。
  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.demand.updateMany({
      where: { id: demandId, status: "OPEN" },
      data: { status: "MATCHED" },
    });
    if (claimed.count === 0) return null;
    const pending = await tx.application.findMany({
      where: { demandId, status: "PENDING" },
      include: { tutor: true },
    });
    await tx.application.updateMany({ where: { demandId, status: "PENDING" }, data: { status: "REJECTED" } });
    const order = await tx.order.create({
      data: {
        code: orderCode(),
        demandId,
        parentId: demand.parentId,
        tutorId,
        status: "ACTIVE",
        matchSource: "ADMIN_RECOMMEND",
      },
    });
    return { order, pending };
  });
  if (!result) return;
  const { order, pending } = result;

  await Promise.all([
    push(demand.parentId, "ORDER", `平台为你的求教单 ${demand.code}（${demand.subject.name}）推荐了教员 ${tutor.user.name}，撮合单 ${order.code} 已建立。`, `/parent/orders/${order.id}`),
    push(tutor.userId, "ORDER", `平台推荐：你与需求 ${demand.code}（${demand.subject.name}）的撮合单 ${order.code} 已建立，请尽快与家长联系。`, `/tutor/orders/${order.id}`),
    ...pending.map((p) => push(p.tutor.userId, "APPLICATION", `你对 ${demand.code}（${demand.subject.name}）的报名此次未能成行，感谢参与。`, "/tutor/applications")),
  ]);

  revalidatePath("/admin/recommends");
  revalidatePath("/admin/orders");
  redirect("/admin/recommends?done=1");
}
