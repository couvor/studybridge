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
}
