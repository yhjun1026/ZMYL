#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MySQL -> SQLite 方言转换器（一次性工具，不入库）
读取:
  db/migration/V1__init_schema.sql   (DDL)
  db/migration/V2__migrate_data.sql  (存量数据 INSERT)
生成:
  server/src/db/migrations/sql/002_business_tables.sql  (SQLite DDL)
  server/src/db/migrations/sql/002_seed_data.sql        (SQLite INSERT)
跳过 users / roles（001 迁移已用更好的 schema 创建）
"""
import re
import os

ROOT = '/Users/yanghongjun/Downloads/ZMYLV3'
V1 = os.path.join(ROOT, 'db/migration/V1__init_schema.sql')
V2 = os.path.join(ROOT, 'db/migration/V2__migrate_data.sql')
OUT_DDL = os.path.join(ROOT, 'server/src/db/migrations/sql/002_business_tables.sql')
OUT_SEED = os.path.join(ROOT, 'server/src/db/migrations/sql/002_seed_data.sql')
SKIP_TABLES = {'users', 'roles'}

os.makedirs(os.path.dirname(OUT_DDL), exist_ok=True)

# ---------- 1. DDL 转换 ----------
v1 = open(V1, encoding='utf-8').read()

# 按表切分: 每个 "-- 原表: xxx" 注释 + DROP + CREATE ... ;
tables = re.findall(
    r'CREATE TABLE `(\w+)` \((.*?)\n\) ENGINE=[^;]+;',
    v1, re.S)

TYPE_MAP = [
    (re.compile(r'^`id` BIGINT NOT NULL AUTO_INCREMENT'), '`id` INTEGER PRIMARY KEY AUTOINCREMENT'),
    (re.compile(r'^`(\w+)` VARCHAR\(\d+\)'), None),   # -> TEXT
    (re.compile(r'^`(\w+)` TEXT'), None),             # -> TEXT
    (re.compile(r'^`(\w+)` DATETIME'), None),         # -> TEXT
    (re.compile(r'^`(\w+)` BIGINT'), r'`\1` INTEGER'),
    (re.compile(r'^`(\w+)` DOUBLE'), r'`\1` REAL'),
    (re.compile(r'^`(\w+)` TINYINT\(1\)'), r'`\1` INTEGER'),
]

ddl_out = []
index_out = []
table_names = []

for name, body in tables:
    if name in SKIP_TABLES:
        continue
    table_names.append(name)
    lines = []
    for raw in body.strip().split('\n'):
        line = raw.strip().rstrip(',')
        if not line:
            continue
        if line.startswith('PRIMARY KEY'):
            continue  # id 列已含 PRIMARY KEY
        if line.startswith('KEY `'):
            # KEY `idx_x` (`col1`, `col2`)
            m = re.match(r'^KEY `(\w+)` \(([^)]+)\)', line)
            if m:
                idx_name, cols = m.group(1), m.group(2)
                cols = cols.replace('`', '"')
                index_out.append(f'CREATE INDEX IF NOT EXISTS "{idx_name}" ON "{name}" ({cols});')
            continue
        # 类型转换
        m0 = re.match(r'^`(\w+)`', line)
        col = m0.group(1)
        rest = line[len(m0.group(0)):].strip()
        # 去掉 COMMENT
        rest = re.sub(r"\s+COMMENT\s+'(?:[^'\\]|\\.)*'", '', rest)
        # 去掉 ON UPDATE CURRENT_TIMESTAMP
        rest = re.sub(r'\s+ON UPDATE CURRENT_TIMESTAMP', '', rest)
        rest = rest.strip()
        # 映射类型
        if re.match(r'^BIGINT NOT NULL AUTO_INCREMENT', rest):
            lines.append(f'  "{col}" INTEGER PRIMARY KEY AUTOINCREMENT')
            continue
        if re.match(r'^VARCHAR\(\d+\)', rest):
            typ = 'TEXT'
        elif re.match(r'^(TEXT|DATETIME)\b', rest):
            typ = 'TEXT'
        elif re.match(r'^BIGINT\b', rest):
            typ = 'INTEGER'
        elif re.match(r'^DOUBLE\b', rest):
            typ = 'REAL'
        elif re.match(r'^TINYINT\(1\)', rest):
            typ = 'INTEGER'
        else:
            typ = 'TEXT'
        # DEFAULT 处理
        dm = re.search(r"DEFAULT\s+(CURRENT_TIMESTAMP|NULL|''|'[^']*'|-?\d+)", rest)
        default = ''
        if dm:
            dv = dm.group(1)
            if dv == 'CURRENT_TIMESTAMP':
                default = " DEFAULT (datetime('now','localtime'))"
            elif dv == 'NULL':
                default = ' DEFAULT NULL'
            else:
                default = f' DEFAULT {dv}'
        notnull = ' NOT NULL' if re.search(r'\bNOT NULL\b', rest) and default == '' else ''
        lines.append(f'  "{col}" {typ}{notnull}{default}')
    ddl_out.append(f'CREATE TABLE IF NOT EXISTS "{name}" (\n' + ',\n'.join(lines) + '\n);')

header = '-- 自动生成: 002 业务表 DDL（由 V1__init_schema.sql MySQL -> SQLite 转换）\n-- 生成时间: 2026-09-08  生成工具: scripts/mysql2sqlite.py（一次性）\n'
with open(OUT_DDL, 'w', encoding='utf-8') as f:
    f.write(header)
    f.write('\n\n'.join(ddl_out))
    f.write('\n\n' + '\n'.join(index_out))
    if index_out:
        f.write('\n')

# ---------- 2. 数据转换 ----------
v2 = open(V2, encoding='utf-8').read()

def unescape_mysql(s: str) -> str:
    """MySQL 反斜杠转义 -> 原字符"""
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == '\\' and i + 1 < len(s):
            nxt = s[i + 1]
            mapping = {'n': '\n', 'r': '\r', 't': '\t', '0': '\0',
                       '\\': '\\', "'": "'", '"': '"', 'Z': '\x1a'}
            out.append(mapping.get(nxt, nxt))
            i += 2
        else:
            out.append(c)
            i += 1
    return ''.join(out)

def sqlite_escape(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"

# 匹配 INSERT INTO `table` (...) VALUES (...);  —— 逐行处理避免贪婪跨语句
insert_re = re.compile(r"^INSERT INTO `(\w+)` \(([^)]+)\) VALUES \((.*)\);\s*$")

seed_out = []
skipped = {}
counts = {}
for line in v2.split('\n'):
    m = insert_re.match(line)
    if not m:
        continue
    table, cols, vals = m.group(1), m.group(2), m.group(3)
    if table in SKIP_TABLES:
        skipped[table] = skipped.get(table, 0) + 1
        continue
    if table not in table_names:
        # V2 有但 V1 没建的表，跳过并记录
        skipped[table] = skipped.get(table, 0) + 1
        continue
    # 去掉反引号列名 -> 双引号
    cols_sql = cols.replace('`', '"')
    # 逐字符解析 VALUES: 切分顶层逗号
    parsed = []
    i = 0
    depth = 0
    cur = ''
    in_str = False
    while i < len(vals):
        c = vals[i]
        if in_str:
            if c == '\\' and i + 1 < len(vals):
                cur += c + vals[i + 1]
                i += 2
                continue
            if c == "'":
                in_str = False
            cur += c
        else:
            if c == "'":
                in_str = True
                cur += c
            elif c == ',' :
                parsed.append(cur.strip())
                cur = ''
            else:
                cur += c
        i += 1
    if cur.strip():
        parsed.append(cur.strip())
    # 每个值转 SQLite 字面量
    new_vals = []
    for v in parsed:
        if v.upper() == 'NULL':
            new_vals.append('NULL')
        elif v.startswith("'") and v.endswith("'") and len(v) >= 2:
            inner = unescape_mysql(v[1:-1])
            new_vals.append(sqlite_escape(inner))
        else:
            new_vals.append(v)  # 数字
    seed_out.append(f'INSERT INTO "{table}" ({cols_sql}) VALUES ({", ".join(new_vals)});')
    counts[table] = counts.get(table, 0) + 1

seed_header = '-- 自动生成: 002 存量数据种子（由 V2__migrate_data.sql MySQL -> SQLite 转换）\n-- 注意: 显式携带主键 id；重复执行会因主键冲突被迁移层跳过\n'
with open(OUT_SEED, 'w', encoding='utf-8') as f:
    f.write(seed_header)
    f.write('\n'.join(seed_out))
    if seed_out:
        f.write('\n')

print(f'DDL: {len(table_names)} 张表 -> {OUT_DDL}')
print(f'  表清单: {", ".join(table_names)}')
print(f'索引: {len(index_out)} 个')
print(f'SEED: {sum(counts.values())} 行 INSERT -> {OUT_SEED}')
print(f'  分布: {counts}')
if skipped:
    print(f'  跳过: {skipped}')
