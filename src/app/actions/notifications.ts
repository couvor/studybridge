"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function markAllReadAction() {
  const session = await getSession();
  if (!session) return;
  await db.notification.updateMany({
    where: { userId: session.uid, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  // Navbar 未读红点来自各 layout 的服务端查询：标记已读后必须同时失效布局缓存，
  // 否则红点要等下次整页刷新才消失。
  revalidatePath("/", "layout");
}
