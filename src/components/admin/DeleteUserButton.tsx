"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUserAction } from "@/app/actions/admin";

// 删除用户：高危且不可逆。弹窗要求运营手动键入目标用户邮箱作为二次验证，
// 完全一致后才放行；服务端 deleteUserAction 会再核对一次。
export default function DeleteUserButton({
  userId,
  userName,
  userEmail,
  disabled,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matched = confirm.trim() === userEmail;

  async function handleConfirm() {
    if (!matched) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("confirmEmail", confirm.trim());
      const res = await deleteUserAction(fd);
      if (res.ok) {
        setOpen(false);
        router.push("/admin/users?deleted=1");
        router.refresh();
      } else {
        setError(res.error || "删除失败");
      }
    } catch {
      setError("删除失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setConfirm("");
    setError(null);
    setLoading(false);
  }

  if (disabled) {
    return <span className="text-dim text-[12px]">—</span>;
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        style={{ color: "#e0666a" }}
        onClick={() => setOpen(true)}
      >
        删除
      </button>
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{ maxWidth: 460, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serifcn font-black text-lg" style={{ color: "#e0666a" }}>
              删除用户？此操作不可撤销
            </p>
            <p className="text-[13px] text-mute mt-2 leading-[1.9]">
              将永久删除 <b>{userName}</b>（{userEmail}）的账号，同时移除其教员档案（若有）、
              发布的求教单、相关撮合单、课时记录与评价。账号与其历史数据均无法恢复。
            </p>

            <div className="mt-4">
              <label className="label" htmlFor={`del-${userId}`}>
                二次验证：请输入该用户的邮箱以确认
              </label>
              <input
                id={`del-${userId}`}
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={userEmail}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="help mt-1.5">需与账号邮箱完全一致：{userEmail}</p>
            </div>

            {error && (
              <p className="text-[13px] mt-3" style={{ color: "#e0666a" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button type="button" className="btn btn-block" onClick={close} disabled={loading}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleConfirm}
                disabled={loading || !matched}
                style={
                  !matched
                    ? undefined
                    : { background: "#e0666a", borderColor: "#e0666a" }
                }
              >
                {loading ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
