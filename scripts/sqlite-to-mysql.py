#!/usr/bin/env python3
"""把 Prisma 的 SQLite 库导出为 MySQL 可执行的 INSERT 脚本。

用法：
    python3 sqlite-to-mysql.py --sqlite prisma/dev.db --ddl prisma/migrations/20261020120000_init/migration.sql --out /tmp/data.sql

说明：
- Prisma 在 SQLite 里把 DateTime 存成 **整数毫秒时间戳**，在 MySQL 里要转成 DATETIME(3)，
  故以 DDL 里声明的列类型为准做转换（不靠列名猜）。
- Boolean 在 SQLite 里是 0/1，MySQL 的 TINYINT(1) 直接收整数。
- TEXT/VARCHAR 统一做转义（\\ ' " 与 NUL）。
- 生成的脚本自带 SET FOREIGN_KEY_CHECKS=0，可任意顺序导入。
"""

import argparse
import datetime as dt
import re
import sqlite3
import sys

CREATE_RE = re.compile(r"CREATE TABLE `(\w+)` \((.*?)\n\)", re.S)
COL_RE = re.compile(r"^\s+`(\w+)`\s+([A-Za-z]+)", re.M)


def parse_ddl(path):
    """返回 {表名: {列名: 类型}}，只取 CREATE TABLE 段里的列定义。"""
    ddl = open(path, encoding="utf-8").read()
    schema = {}
    for table, body in CREATE_RE.findall(ddl):
        cols = {}
        for line in body.splitlines():
            m = COL_RE.match(line)
            if not m:
                continue
            name, typ = m.group(1), m.group(2).upper()
            if typ in ("UNIQUE", "INDEX", "PRIMARY", "KEY", "CONSTRAINT"):
                continue
            cols[name] = typ
        schema[table] = cols
    return schema


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (bytes, bytearray)):
        return "0x" + bytes(v).hex()
    if isinstance(v, str):
        return "'" + v.replace("\\", "\\\\").replace("'", "\\'").replace("\x00", "") + "'"
    return str(v)


def to_datetime(v):
    """SQLite 里的值 → 'YYYY-MM-DD HH:MM:SS.mmm'。兼容整数毫秒、浮点秒、ISO 字符串。"""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        # Prisma 写的是毫秒；极端情况（手写数据）可能是秒
        ts = float(v)
        if abs(ts) > 1e11:
            ts /= 1000.0
        d = dt.datetime.fromtimestamp(ts, dt.timezone.utc).replace(tzinfo=None)
    else:
        s = str(v).strip().replace("T", " ").replace("Z", "")
        s = s.split("+")[0].strip()
        try:
            d = dt.datetime.fromisoformat(s)
        except ValueError:
            print(f"  ! 无法解析时间值 {v!r}，按 NULL 处理", file=sys.stderr)
            return None
    return d.strftime("%Y-%m-%d %H:%M:%S.") + f"{d.microsecond // 1000:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sqlite", required=True)
    ap.add_argument("--ddl", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--batch", type=int, default=200)
    args = ap.parse_args()

    schema = parse_ddl(args.ddl)
    con = sqlite3.connect(f"file:{args.sqlite}?mode=ro", uri=True)
    con.text_factory = str

    tables = [
        r[0]
        for r in con.execute(
            "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
        )
    ]

    counts = {}
    with open(args.out, "w", encoding="utf-8") as out:
        out.write("/* 由 scripts/sqlite-to-mysql.py 自动生成 */\n")
        out.write("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n")
        for t in tables:
            if t not in schema:
                print(f"! 跳过 {t}：DDL 中没有该表", file=sys.stderr)
                continue
            coltypes = schema[t]
            cur = con.execute(f'select * from "{t}"')
            names = [d[0] for d in cur.description]
            unknown = [n for n in names if n not in coltypes]
            if unknown:
                print(f"! {t} 有 DDL 未声明的列 {unknown}，该表跳过", file=sys.stderr)
                continue
            colsql = ",".join(f"`{n}`" for n in names)
            rows, n = [], 0
            for row in cur:
                vals = []
                for name, v in zip(names, row):
                    typ = coltypes[name]
                    if typ.startswith("DATETIME") or typ.startswith("TIMESTAMP"):
                        v = to_datetime(v)
                    elif typ in ("INT", "INTEGER", "BIGINT", "SMALLINT", "TINYINT", "BOOLEAN"):
                        v = None if v is None else int(v)
                    elif typ in ("DOUBLE", "FLOAT", "DECIMAL"):
                        v = None if v is None else float(v)
                    vals.append(esc(v))
                rows.append("(" + ",".join(vals) + ")")
                n += 1
                if len(rows) >= args.batch:
                    out.write(f"INSERT INTO `{t}` ({colsql}) VALUES\n" + ",\n".join(rows) + ";\n")
                    rows = []
            if rows:
                out.write(f"INSERT INTO `{t}` ({colsql}) VALUES\n" + ",\n".join(rows) + ";\n")
            counts[t] = n
            out.write("\n")
        out.write("SET FOREIGN_KEY_CHECKS=1;\n")

    total = sum(counts.values())
    for t, n in counts.items():
        print(f"  {t}: {n} 行")
    print(f"合计 {total} 行 → {args.out}")


if __name__ == "__main__":
    main()
