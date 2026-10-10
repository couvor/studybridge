// COS 一键初始化（由 set-cos-env.sh 在配置写入后调用）
// 功能：1) 配置桶 CORS（浏览器直传所需）2) 校验桶权限为私有 3) 密钥连通性自检 4) 迁移本地已有材料
// 直接读取学桥 .env，不依赖应用进程。
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const require = createRequire("/www/wwwroot/studybridge/");
const COS = require("cos-nodejs-sdk-v5");

const APP_DIR = "/www/wwwroot/studybridge";
const env = readFileSync(path.join(APP_DIR, ".env"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^(COS_[A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const { COS_SECRET_ID: SecretId, COS_SECRET_KEY: SecretKey, COS_BUCKET: Bucket, COS_REGION: Region } = process.env;
if (!SecretId || !SecretKey || !Bucket || !Region) {
  console.error("✘ COS 配置不完整（COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION）");
  process.exit(1);
}
const cos = new COS({ SecretId, SecretKey });
const P = { Bucket, Region };
let failed = 0;

const call = (fn, params) => new Promise((res, rej) => fn.call(cos, params, (e, d) => (e ? rej(e) : res(d))));

// 1) CORS：允许学桥域名浏览器直传
try {
  await call(cos.putBucketCors, {
    ...P,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["https://x.mingyanginfo.com", "http://localhost:3000"],
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 600,
        },
      ],
    },
  });
  console.log("✔ CORS 已配置（允许 x.mingyanginfo.com 浏览器直传）");
} catch (e) {
  failed++;
  console.warn("⚠️ CORS 配置失败：", e.message || e);
}

// 2) 桶权限检查
try {
  const acl = await call(cos.getBucketAcl, { ...P });
  if (acl && (acl.ACL === "private" || acl.ACL === "default")) {
    console.log("✔ 桶权限为私有（ACL:", acl.ACL + "）");
  } else {
    console.warn("⚠️ 桶权限非私有（ACL:", acl?.ACL, "）——学生证等隐私材料必须私有，请到控制台改为「私有读写」");
  }
} catch (e) {
  failed++;
  console.warn("⚠️ 桶权限检查失败：", e.message || e);
}

// 3) 密钥连通性自检：写入 → 读取 → 删除
const probe = `tutor-materials/.setup-check-${Date.now()}.txt`;
try {
  await call(cos.putObject, { ...P, Key: probe, Body: Buffer.from("ok") });
  const got = await call(cos.getObject, { ...P, Key: probe });
  if (!got.Body || got.Body.toString() !== "ok") throw new Error("读取内容不一致");
  await call(cos.deleteObject, { ...P, Key: probe });
  console.log("✔ 密钥连通性自检通过（写入/读取/删除）");
} catch (e) {
  failed++;
  console.warn("⚠️ 密钥自检失败：", e.message || e, "——请核对 Key 权限/桶名/地域");
}

// 4) 迁移本地已有材料（幂等：COS 已存在的跳过）
try {
  const dir = path.join(APP_DIR, "uploads");
  const files = readdirSync(dir).filter((f) => f !== ".gitkeep");
  let moved = 0;
  for (const f of files) {
    const key = `tutor-materials/${f}`;
    let exists = false;
    try {
      await call(cos.headObject, { ...P, Key: key });
      exists = true;
    } catch {}
    if (!exists) {
      await call(cos.putObject, { ...P, Key: key, Body: readFileSync(path.join(dir, f)) });
      moved++;
      console.log("  ↑ 已迁移", f);
    }
  }
  console.log(`✔ 本地材料迁移完成（新迁 ${moved} 个，本地文件保留作备份）`);
} catch (e) {
  console.warn("⚠️ 迁移检查异常：", e.message || e);
}

process.exit(failed ? 1 : 0);
