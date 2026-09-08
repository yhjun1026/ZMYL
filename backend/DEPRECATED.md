# ⚠️ DEPRECATED — Python FastAPI 后端（保留仅作回退）

本目录是 ZMYL 项目的**旧版 Python FastAPI 后端**，**当前不再维护**。

## 现状

- 项目正在进行**Node.js Express 后端迁移**（位于 `../server/`）
- 当前路由层有重复定义 bug（`workflow.py` 第 68-95 与 230-257 行）
- 字段类型 `Mapped[object]` 无法享受类型校验
- 缺少大量业务功能（销售出库 6 级流、产品验收 5 步、报表导出、冷链 IoT 等）

## 保留原因

1. P1（架构骨架）阶段作为**回退对照**
2. P4 完成后才会删除
3. 字段定义参考（42 张表）暂时还在用

## 何时删除

- **P4（高级特性阶段）完成后** 一次性删除
- 删除前会写 `migrate_data.py` 把 MySQL 数据导出为 SQLite（如果需要）

## 当前如何运行

- **新项目**：使用 `../server/` (Node.js)
- **回退**：使用本目录（Python），参考 `../README.md` 中"回退到 Python 后端"章节