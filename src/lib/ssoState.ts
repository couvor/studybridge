// 服务端 SSO state 存储（替代"仅依赖客户端 cookie"的脆弱方案）。
//
// 背景：之前只用客户端 cookie（sb_sso_state）保存 OAuth state。跨域往返
//   x.mingyanginfo.com → login.mingyanginfo.com（可能含密码 + 2FA 绑定）→ 回跳
// 时，该 cookie 可能因过期或浏览器策略丢失，导致回调里 state 不匹配 → 登录卡在
// /login?error=4。
//
// 现为双层校验：
//   1. cookie 层：回调携带的 sb_sso_state 与 URL state 一致（强校验）；
//   2. 服务端留存层：state 在服务端 Map 有记录，且与发起时写入的**同一浏览器的
//      匿名标识 cookie（sb_sso_anon）绑定**——攻击者无法替受害者预植可用的 state
//      （他种下的 state 绑定的是他自己的匿名标识）。两个 cookie 同域同 TTL，正常
//      往返同生共死；只要任一 cookie 存活即可通过。
// URL 中的 state 仍是随机不可猜测的令牌。单进程 Map 即可；多实例需换 Redis 等共享存储。

type Entry = { exp: number; anon: string };

const store = new Map<string, Entry>(); // state -> {过期时间戳, 匿名标识}

export function saveSsoState(state: string, anon: string, ttlSec = 3600): void {
  store.set(state, { exp: Date.now() + ttlSec * 1000, anon });
  // 防止内存无限增长：超过阈值时顺手清理已过期项
  if (store.size > 2000) {
    const now = Date.now();
    for (const [k, v] of store) if (v.exp <= now) store.delete(k);
  }
}

// 消费 state：存在、未过期且匿名标识匹配才返回 true 并删除（一次性，防重放）
export function consumeSsoState(state: string, anon: string): boolean {
  if (!state || !anon) return false;
  const entry = store.get(state);
  if (entry === undefined) return false;
  store.delete(state);
  return entry.exp > Date.now() && entry.anon === anon;
}
