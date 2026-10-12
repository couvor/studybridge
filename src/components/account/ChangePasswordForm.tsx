"use client";

import { changePasswordAction } from "@/app/actions/auth";

export default function ChangePasswordForm() {
  return (
    <form action={changePasswordAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-[13px] text-dim mb-1">
          新密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className="input"
          placeholder="至少 8 位"
        />
      </div>
      <div>
        <label htmlFor="password2" className="block text-[13px] text-dim mb-1">
          确认新密码
        </label>
        <input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className="input"
          placeholder="再输入一次"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        确认修改
      </button>
    </form>
  );
}
