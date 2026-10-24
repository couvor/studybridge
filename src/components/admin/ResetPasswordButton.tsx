"use client";

import { useState } from "react";
import { adminResetPasswordAction } from "@/app/actions/admin";

export default function ResetPasswordButton({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await adminResetPasswordAction(fd);
      if (res.ok && res.tempPassword) {
        setTempPassword(res.tempPassword);
      } else {
        setError(res.error || "操作失败");
      }
    } catch {
      setError("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setTempPassword(null);
    setError(null);
    setLoading(false);
  }

  if (disabled) {
    return <span className="text-dim text-[12px]">—</span>;
  }

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        重置密码
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
            style={{ maxWidth: 440, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {tempPassword ? (
              <div>
                <p className="font-serifcn font-black text-lg">密码已重置</p>
                <p className="text-[13px] text-mute mt-2">
                  请复制下方临时密码并安全转交用户 <b>{userName}</b>。关闭弹窗后将不可再查看。
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <code className="mono text-[15px] px-3 py-2 bg-black/5 rounded flex-1 select-all">
                    {tempPassword}
                  </code>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => navigator.clipboard?.writeText(tempPassword)}
                  >
                    复制
                  </button>
                </div>
                <button type="button" className="btn btn-block mt-4" onClick={close}>
                  完成
                </button>
              </div>
            ) : (
              <div>
                <p className="font-serifcn font-black text-lg">重置该用户密码？</p>
                <p className="text-[13px] text-mute mt-2">
                  将为 <b>{userName}</b> 生成随机强密码，账号（用户名/邮箱）保持不变；并强制其下次登录时重新设置二次验证，且首次登录必须修改密码。该用户当前所有登录会话将立即失效。
                </p>
                {error && (
                  <p className="text-[13px] mt-3" style={{ color: "#e0666a" }}>
                    {error}
                  </p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-block"
                    onClick={close}
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleConfirm}
                    disabled={loading}
                    aria-busy={loading}
                  >
                    确认重置
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
