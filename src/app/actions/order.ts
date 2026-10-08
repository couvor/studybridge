"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { push } from "@/lib/notify";

export async function addLessonLogAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const orderId = String(fd.get("orderId") ?? "");
  const date = String(fd.get("date") ?? "");
  const hours = parseFloat(String(fd.get("hours") ?? "0"));
  const feedback = String(fd.get("feedback") ?? "").trim();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { tutor: true } });
  if (!order || order.parentId !== s.uid || order.status !== "ACTIVE") return;
  if (!date || !hours || hours <= 0 || hours > 24) return;

  await db.lessonLog.create({ data: { orderId, date: new Date(date), hours, feedback } });
  await push(order.tutor.userId, "LESSON", `撮合单 ${order.code} 有一条新的课时记录（${hours} 小时）。`, `/tutor/orders/${orderId}`);
  revalidatePath(`/parent/orders/${orderId}`);
  revalidatePath(`/tutor/orders/${orderId}`);
}

export async function finishOrderAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const orderId = String(fd.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { tutor: true } });
  if (!order || order.parentId !== s.uid || order.status !== "ACTIVE") return;

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "FINISHED", finishedAt: new Date() } }),
    db.demand.update({ where: { id: order.demandId }, data: { status: "CLOSED" } }),
  ]);
  await push(order.tutor.userId, "ORDER", `撮合单 ${order.code} 已由家长结束，别忘了写下你的评价。`, `/tutor/orders/${orderId}`);
  revalidatePath(`/parent/orders/${orderId}`);
  revalidatePath("/parent/orders");
}

export async function cancelOrderAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const orderId = String(fd.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { tutor: true } });
  if (!order || order.parentId !== s.uid || order.status !== "ACTIVE") return;

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
    db.demand.update({ where: { id: order.demandId }, data: { status: "CLOSED" } }),
  ]);
  await push(order.tutor.userId, "ORDER", `撮合单 ${order.code} 已被家长取消。`, `/tutor/orders/${orderId}`);
  revalidatePath(`/parent/orders/${orderId}`);
  revalidatePath("/parent/orders");
}

export async function submitReviewAction(fd: FormData) {
  const s = await requireRole("PARENT");
  const orderId = String(fd.get("orderId") ?? "");
  const rating = Math.max(1, Math.min(5, parseInt(String(fd.get("rating") ?? "5"), 10) || 5));
  const comment = String(fd.get("comment") ?? "").trim();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { tutor: true } });
  if (!order || order.parentId !== s.uid || order.status !== "FINISHED") return;

  const exists = await db.review.findFirst({ where: { orderId, authorRole: "PARENT" } });
  if (exists) return;

  await db.review.create({ data: { orderId, authorRole: "PARENT", rating, comment } });

  // 家长评分沉淀进教员档案（全量重算，保证一致）
  const agg = await db.review.aggregate({
    _avg: { rating: true },
    _count: { _all: true },
    where: { authorRole: "PARENT", order: { tutorId: order.tutorId } },
  });
  await db.tutorProfile.update({
    where: { id: order.tutorId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
  });

  await push(order.tutor.userId, "REVIEW", `撮合单 ${order.code} 收到一条家长评价（${rating} 星）。`, `/tutor/orders/${orderId}`);
  revalidatePath(`/parent/orders/${orderId}`);
  revalidatePath(`/tutors/${order.tutorId}`);
}
