// 服务端 SSO state 存储（替代“仅依赖客户端 cookie”的脆弱方案）。
//
// 背景：之前只用客户端 cookie（sb_sso_state）保存 OAuth state。跨域往返
//   x.mingyanginfo.com → login.mingyanginfo.com（可能含密码 + 2FA 绑定）→ 回跳
// 时，该 cookie 可能因过期（原先仅 10 分钟，2FA 绑定耗时很容易超过）或浏览器策略
// 丢失，导致回调里 state 不匹配 → 登录卡在 /login?error=4。
//
// 改为服务端也留存一份 state（带 TTL），回调时“cookie 命中 或 服务端留存命中”任一
// 即可放行。URL 中的 state 仍是随机不可猜测的令牌，CSRF 防护不打折。
// 注意：当前 studybridge 为单进程 next-server，模块级 Map 跨请求共享即可；
// 若将来多实例/多 worker 部署，需换成 Redis 等共享存储。

const store = new Map<string, number>(); // state -> 过期时间戳(ms)

export function saveSsoState(state: string, ttlSec = 3600): void {
  store.set(state, Date.now() + ttlSec * 1000);
  // 防止内存无限增长：超过阈值时顺手清理已过期项
  if (store.size > 2000) {
    const now = Date.now();
    for (const [k, v] of store) if (v <= now) store.delete(k);
  }
}

// 消费 state：存在且未过期返回 true 并删除（一次性，防重放）
export function consumeSsoState(state: string): boolean {
  if (!state) return false;
  const exp = store.get(state);
  if (exp === undefined) return false;
  store.delete(state);
  return exp > Date.now();
}
