// 业务单编号生成：日期 + 随机段，无 count() 依赖（防并发重复/唯一约束冲突）。
// 形如 O-241011-7F3K / D-241011-Q2M8：前缀保留可读语义，随机段保证唯一。
import { randomBytes } from "node:crypto";

function stamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}${mm}${dd}`;
}

function rand(len: number): string {
  return randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, len).toUpperCase();
}

export const orderCode = () => `O-${stamp()}-${rand(4)}`;
export const demandCode = () => `D-${stamp()}-${rand(4)}`;
