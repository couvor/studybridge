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
      <button type="button" className="btn btn-sm btn-danger" onClick={() => setOpen(true)}>
        删除
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className="card w-full max-w-[460px] max-h-[90vh] overflow-y-auto p-7 lg:p-8 rise-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow"><span className="rule" />Danger zone</p>
              <span className="badge badge-bad">不可逆</span>
            </div>

            <h2 className="font-serifcn font-black text-2xl mt-4">删除用户</h2>
            <p className="text-[13.5px] leading-[1.9] text-mute mt-3">
              将永久删除 <b className="text-fg">{userName}</b>
              （<span className="mono text-[12px]">{userEmail}</span>）的账号，并一并移除其
              教员档案、求教单、撮合单、课时记录与评价。
            </p>

            <div className="mt-6 border-t border-line pt-5">
              <label className="label" htmlFor={`del-${userId}`}>
                二次验证 / 键入该用户邮箱以确认
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
              <p className="help mt-2">需与账号邮箱完全一致，「确认删除」才可点击。</p>
            </div>

            {error && (
              <p className="text-[13px] mt-3 text-[#e0666a]">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button type="button" className="btn flex-1" onClick={close} disabled={loading}>
                取消
              </button>
              <button
                type="button"
                className={`btn flex-1 ${matched ? "btn-danger-solid" : ""}`}
                onClick={handleConfirm}
                disabled={loading || !matched}
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
