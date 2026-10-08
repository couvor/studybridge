import { db } from "./db";

export async function push(userId: string | null | undefined, type: string, content: string, link = "") {
  if (!userId) return;
  await db.notification.create({ data: { userId, type, content, link } });
}
