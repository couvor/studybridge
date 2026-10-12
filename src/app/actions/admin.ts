"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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

// ---------- 密码重置（运营后台）----------

// 生成 16 位强随机临时密码（大小写 + 数字 + 符号，避开易混淆字符）。
function genStrongPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const buf = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += chars[buf[i] % chars.length];
  return out;
}

// 联动 loginapp（SSO 账号密码与 2FA 所在地）：重置密码 + 清 2FA + 强制改密 + 踢会话。
async function callLoginappReset(ssoSub: string | null, newPassword: string): Promise<boolean> {
  if (!ssoSub) return false;
  const token = process.env.LOGINAPP_ADMIN_TOKEN;
  if (!token) {
    console.error("[admin] LOGINAPP_ADMIN_TOKEN 未配置，无法联动 loginapp 重置 SSO 账号");
    return false;
  }
  try {
    const res = await fetch("http://127.0.0.1:3000/admin/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ssoSub, newPassword }),
    });
    if (!res.ok) {
      console.error(`[admin] loginapp 重置失败: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[admin] loginapp 重置请求异常", e);
    return false;
  }
}

async function writeResetAudit(data: {
  actorId: string;
  actorName: string;
  actorRole: string;
  targetId: string;
  targetEmail: string;
  targetRole: string;
  action: string;
  detail?: string;
}) {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    await db.adminAuditLog.create({
      data: {
        actorId: data.actorId,
        actorName: data.actorName,
        actorRole: data.actorRole,
        targetId: data.targetId,
        targetEmail: data.targetEmail,
        targetRole: data.targetRole,
        action: data.action,
        detail: data.detail || "",
        ip,
      },
    });
  } catch (e) {
    console.error("[admin] 审计写入失败", e);
  }
}

// 运营重置某用户密码：生成随机强密码；LOCAL 账号改本地哈希，SSO 账号联动 loginapp；
// 返回临时密码供一次性展示（绝不写日志 / 不进 URL）。禁止管理员重置自己。
export async function adminResetPasswordAction(
  fd: FormData
): Promise<{ ok: boolean; tempPassword?: string; error?: string }> {
  const admin = await requireRole("ADMIN");
  const targetId = String(fd.get("userId") ?? "").trim();
  if (!targetId) return { ok: false, error: "缺少用户标识" };
  if (targetId === admin.uid) return { ok: false, error: "不能重置自己的账号" };

  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return { ok: false, error: "用户不存在" };

  const newPw = genStrongPassword();
  if (target.authSource === "SSO") {
    const ok = await callLoginappReset(target.ssoSub, newPw);
    if (!ok) return { ok: false, error: "联动登录服务失败，未修改任何数据" };
  } else {
    await db.user.update({
      where: { id: targetId },
      data: { passwordHash: await bcrypt.hash(newPw, 10), forcePasswordChange: true },
    });
  }

  // 站内通知（登录后可看到；临时密码不进通知正文）
  await push(
    target.id,
    "SECURITY",
    "您的登录密码已被平台管理员重置，请使用新密码登录，并重新完成二次验证设置。",
    "/"
  );

  await writeResetAudit({
    actorId: admin.uid,
    actorName: admin.name,
    actorRole: admin.role,
    targetId: target.id,
    targetEmail: target.email,
    targetRole: target.role,
    action: "RESET_PASSWORD",
    detail: `authSource=${target.authSource}`,
  });

  revalidatePath("/admin/users");
  // 仅返回临时密码用于一次性展示，绝不落盘日志或拼进跳转 URL
  return { ok: true, tempPassword: newPw };
}

// ---------- 删除用户（运营后台）----------

// 删除账号：高危操作，必须二次验证（前端弹窗要求键入目标邮箱，服务端再次核对）。
// 禁止管理员删除自己；删除前先清理其作为家长/教员产生的撮合单与发布的求教单，避免外键约束失败；
// 删除动作写入审计日志。删除不可逆。
export async function deleteUserAction(
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");
  const targetId = String(fd.get("userId") ?? "").trim();
  const confirmEmail = String(fd.get("confirmEmail") ?? "").trim();
  if (!targetId) return { ok: false, error: "缺少用户标识" };
  if (targetId === admin.uid) return { ok: false, error: "不能删除自己的账号" };

  const target = await db.user.findUnique({
    where: { id: targetId },
    include: { tutorProfile: true },
  });
  if (!target) return { ok: false, error: "用户不存在或已被删除" };

  // 二次验证：键入的邮箱必须与目标账号完全一致
  if (confirmEmail !== target.email) {
    return { ok: false, error: "输入的邮箱与目标账号不一致，请重新核对" };
  }

  // 统计将清理的关联数据（仅用于审计留痕）
  const [orderCount, demandCount] = await Promise.all([
    db.order.count({
      where: {
        OR: [
          { parentId: target.id },
          ...(target.tutorProfile ? [{ tutorId: target.tutorProfile.id }] : []),
        ],
      },
    }),
    db.demand.count({ where: { parentId: target.id } }),
  ]);

  // 先清理外键引用（撮合单引用了 demand 与 tutorProfile，否则删除用户会因 Restrict 失败）
  if (target.tutorProfile) {
    await db.order.deleteMany({ where: { tutorId: target.tutorProfile.id } });
  }
  await db.order.deleteMany({ where: { parentId: target.id } });
  await db.demand.deleteMany({ where: { parentId: target.id } });

  // 删除用户：级联移除 tutorProfile / notifications（demands 已清理，applications 随之级联）
  await db.user.delete({ where: { id: target.id } });

  await writeResetAudit({
    actorId: admin.uid,
    actorName: admin.name,
    actorRole: admin.role,
    targetId: target.id,
    targetEmail: target.email,
    targetRole: target.role,
    action: "DELETE_USER",
    detail: `name=${target.name}; orders=${orderCount}; demands=${demandCount}`,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
