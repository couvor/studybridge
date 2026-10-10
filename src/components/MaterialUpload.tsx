"use client";

import { useRef, useState } from "react";

// 认证材料上传组件：选定文件 → 申请预签名 → 浏览器直传 COS → 提交时只传对象名。
// COS 未配置或直传失败时，保留原文件随表单提交（服务端中转/本地）的旧路径。

type Props = {
  kind: "card" | "transcript";
  fieldName: "studentCard" | "transcript";
  keyField: string;
  label: string;
  uploaded?: boolean;
};

export default function MaterialUpload({ kind, fieldName, keyField, label, uploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const [fileName, setFileName] = useState("");

  async function onPick(file: File | null) {
    if (!file) return;
    setKey("");
    setStatus("uploading");
    setFileName(file.name);
    try {
      const r = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, filename: file.name }),
      });
      const d = await r.json();
      if (!r.ok) {
        setStatus("failed");
        return;
      }
      if (!d.configured) {
        // 对象存储未配置：保持原逻辑，文件随表单提交
        setStatus("idle");
        return;
      }
      const put = await fetch(d.uploadUrl, { method: "PUT", body: file });
      if (!put.ok) {
        setStatus("failed");
        return;
      }
      setKey(d.key);
      setStatus("done");
      // 已直传成功：清空原生文件输入，表单不再重复上传文件本体
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div>
      <label className="label" htmlFor={fieldName}>
        {label}{" "}
        {uploaded && <span className="text-accent-soft normal-case tracking-normal">✓ 已上传</span>}
      </label>
      <input
        ref={inputRef}
        id={fieldName}
        name={fieldName}
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="input !py-2.5 file:mr-3 file:btn-sm file:border-0 file:bg-transparent file:text-accent-soft file:cursor-pointer"
      />
      <input type="hidden" name={keyField} value={key} />
      {status === "uploading" && (
        <p className="mono text-[10px] tracking-[0.15em] text-dim mt-1.5">正在上传 {fileName} …</p>
      )}
      {status === "done" && (
        <p className="mono text-[10px] tracking-[0.15em] text-accent-soft mt-1.5">已上传 ✓ {fileName}</p>
      )}
      {status === "failed" && (
        <p className="mono text-[10px] tracking-[0.15em] text-[#e0666a] mt-1.5">
          直传失败，保存时将自动改走服务器上传（请保持文件已选择）
        </p>
      )}
    </div>
  );
}
