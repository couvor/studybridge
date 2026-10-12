"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 6–20 位，允许 + - 与空格（国际号/分隔符）
const PHONE_RE = /^[0-9+\-\s]{6,20}$/;

// 角色无关的账户资料更新：当前仅开放姓名与手机号。
// 邮箱为登录标识、且与明旸账号（SSO）绑定，不在本端修改，避免破坏登录与 SSO 关联。
export async function updateAccountAction(fd: FormData) {
  const s = await getSession();
  if (!s) redirect("/login");

  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();

  if (!name) redirect("/parent/profile?error=name");
  if (phone && !PHONE_RE.test(phone)) redirect("/parent/profile?error=phone");

  await db.user.update({
    where: { id: s.uid },
    data: { name, phone },
  });

  revalidatePath("/parent/profile");
  revalidatePath("/parent");
  revalidatePath("/notifications");
  redirect("/parent/profile?saved=1");
}
