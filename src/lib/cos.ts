// 腾讯云 COS 封装：浏览器直传（预签名 PUT）+ 服务端读写（落库/回退/迁移）
// 环境变量（.env）：COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
// 未配置时全部走本地 uploads/ 旧逻辑（平滑过渡，配好后自动切换）

import COS from "cos-nodejs-sdk-v5";
import { createHash } from "node:crypto";

const KEY_PREFIX = process.env.COS_KEY_PREFIX || "tutor-materials/";

// 对象名绑定上传者（ub = uploader tag）：防止伪造指向他人材料的对象名
export function uidTag(uid: string): string {
  return createHash("sha256").update(uid).digest("hex").slice(0, 8);
}

export function cosConfigured(): boolean {
  return !!(
    process.env.COS_SECRET_ID &&
    process.env.COS_SECRET_KEY &&
    process.env.COS_BUCKET &&
    process.env.COS_REGION
  );
}

let client: COS | null = null;
function cos(): COS {
  if (!client) {
    client = new COS({
      SecretId: process.env.COS_SECRET_ID!,
      SecretKey: process.env.COS_SECRET_KEY!,
    });
  }
  return client;
}

const bucket = () => process.env.COS_BUCKET!;
const region = () => process.env.COS_REGION!;

// 数据库存的文件名 → COS 对象键（桶内目录前缀，见 COS_KEY_PREFIX）
export function cosKey(name: string): string {
  return KEY_PREFIX + name;
}

// 生成浏览器直传用的预签名 PUT URL（5 分钟有效，仅此一个对象、仅 PUT）。
// contentType 会签进签名：浏览器上传时必须带一致的 Content-Type 头，
// 类型不符 COS 直接 403，防止任意内容借道签名 URL 进桶。
export function presignPutUrl(name: string, contentType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cos().getObjectUrl(
      {
        Bucket: bucket(),
        Region: region(),
        Key: cosKey(name),
        Method: "PUT",
        Sign: true,
        Expires: 300,
        Headers: { "Content-Type": contentType },
      },
      (err, data) => (err ? reject(err) : resolve(data.Url))
    );
  });
}

// 服务端读取对象（供鉴权后的查看接口转发）
export function getObjectBuffer(name: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    cos().getObject(
      { Bucket: bucket(), Region: region(), Key: cosKey(name) },
      (err, data) => (err ? reject(err) : resolve(data.Body as Buffer))
    );
  });
}

// 服务端上传对象（回退中转 / 迁移旧文件）
export function putObjectBuffer(name: string, body: Buffer, contentType?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cos().putObject(
      {
        Bucket: bucket(),
        Region: region(),
        Key: cosKey(name),
        Body: body,
        ...(contentType ? { ContentType: contentType } : {}),
      },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

// 对象是否存在
export function objectExists(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    cos().headObject(
      { Bucket: bucket(), Region: region(), Key: cosKey(name) },
      (err) => resolve(!err)
    );
  });
}
