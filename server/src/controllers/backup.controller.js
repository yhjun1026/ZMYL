/**
 * 数据备份 —— 对齐数据包 app.py 自动备份机制
 *
 * - 手动备份：POST /api/backup/run（管理员）
 * - 自动备份：守护定时器，按 BACKUP_INTERVAL_HOURS 间隔执行（0=关闭），保留最近 BACKUP_KEEP 份
 * - 备份清单/下载/删除走 backup_record 表 + 文件系统双口径
 * better-sqlite3 的 db.backup() 是 WAL 安全的在线备份，不影响业务读写
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');

function backupDir() {
  return path.resolve(path.dirname(config.db.path), 'backup');
}

function ensureDir() {
  const dir = backupDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function tsName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 执行一次备份，返回 { fileName, filePath, size } */
async function doBackup(type, operator) {
  const dir = ensureDir();
  const fileName = `zmyl_${tsName()}.db`;
  const filePath = path.join(dir, fileName);
  try {
    await db.raw.backup(filePath);
    const size = fs.statSync(filePath).size;
    await db.run(
      `INSERT INTO backup_record (file_name, file_path, file_size, type, status, message, created_by)
       VALUES (?, ?, ?, ?, 'success', '', ?)`,
      [fileName, filePath, size, type, operator || '']
    );
    return { ok: true, fileName, filePath, size };
  } catch (err) {
    await db.run(
      `INSERT INTO backup_record (file_name, file_path, file_size, type, status, message, created_by)
       VALUES (?, ?, 0, ?, 'failed', ?, ?)`,
      [fileName, filePath, type, err.message, operator || '']
    );
    throw err;
  }
}

/** 清理旧备份，只保留最近 keep 份（含文件与记录） */
async function pruneBackups(keep) {
  const rows = await db.all(
    "SELECT * FROM backup_record WHERE deleted = 0 AND status = 'success' ORDER BY id DESC"
  );
  const stale = rows.slice(Math.max(keep, 1));
  for (const r of stale) {
    try { if (fs.existsSync(r.file_path)) fs.unlinkSync(r.file_path); } catch { /* 忽略 */ }
    await db.run('UPDATE backup_record SET deleted = 1 WHERE id = ?', [r.id]);
  }
  return stale.length;
}

/** POST /api/backup/run —— 手动备份 */
async function run(req, res) {
  if (req.userRoleCode !== 'sys_admin') {
    return res.status(403).json(fail('仅系统管理员可执行备份', 403));
  }
  const operator = req.user.name || req.user.username;
  const r = await doBackup('manual', operator);
  const pruned = await pruneBackups(config.backup.keep);
  auditLog('BACKUP_RUN', req.userId, r.fileName, { size: r.size });
  logger.info(`[backup] 手动备份完成: ${r.fileName}（${(r.size / 1024).toFixed(0)}KB，清理旧备份${pruned}份）`);
  return res.json(success(
    { file_name: r.fileName, file_size: r.size, pruned },
    `备份完成: ${r.fileName}（${(r.size / 1024 / 1024).toFixed(2)}MB），保留最近 ${config.backup.keep} 份`
  ));
}

/** GET /api/backup —— 备份清单 */
async function list(req, res) {
  const rows = await db.all('SELECT * FROM backup_record WHERE deleted = 0 ORDER BY id DESC LIMIT 100');
  const listRows = rows.map((r) => ({
    ...r,
    exists: fs.existsSync(r.file_path),
    size_mb: +(r.file_size / 1024 / 1024).toFixed(2),
  }));
  return res.json(success({
    list: listRows,
    total: listRows.length,
    config: {
      interval_hours: config.backup.intervalHours,
      keep: config.backup.keep,
      dir: backupDir(),
      auto_enabled: config.backup.intervalHours > 0,
    },
  }));
}

/** GET /api/backup/:id/download */
async function download(req, res) {
  if (req.userRoleCode !== 'sys_admin') {
    return res.status(403).json(fail('仅系统管理员可下载备份', 403));
  }
  const r = await db.get('SELECT * FROM backup_record WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!r) return res.status(404).json(fail('备份记录不存在', 404));
  if (!fs.existsSync(r.file_path)) return res.status(410).json(fail('备份文件已被清理', 410));
  auditLog('BACKUP_DOWNLOAD', req.userId, r.file_name, {});
  res.download(r.file_path, r.file_name);
}

/** DELETE /api/backup/:id */
async function remove(req, res) {
  if (req.userRoleCode !== 'sys_admin') {
    return res.status(403).json(fail('仅系统管理员可删除备份', 403));
  }
  const r = await db.get('SELECT * FROM backup_record WHERE id = ? AND deleted = 0', [req.params.id]);
  if (!r) return res.status(404).json(fail('备份记录不存在', 404));
  try { if (fs.existsSync(r.file_path)) fs.unlinkSync(r.file_path); } catch { /* 忽略 */ }
  await db.run('UPDATE backup_record SET deleted = 1 WHERE id = ?', [r.id]);
  auditLog('BACKUP_DELETE', req.userId, r.file_name, {});
  return res.json(success(null, `备份 ${r.file_name} 已删除`));
}

// ==================== 自动备份调度 ====================

let _timer = null;

/** 启动自动备份守护定时器（幂等；BACKUP_INTERVAL_HOURS=0 关闭） */
function startAutoBackup() {
  if (_timer) return;
  const hours = config.backup.intervalHours;
  if (!hours || hours <= 0) {
    logger.info('[backup] 自动备份已通过 BACKUP_INTERVAL_HOURS=0 关闭');
    return;
  }
  _timer = setInterval(async () => {
    try {
      const r = await doBackup('auto', 'system');
      const pruned = await pruneBackups(config.backup.keep);
      logger.info(`[backup] 自动备份完成: ${r.fileName}（保留最近 ${config.backup.keep} 份，清理${pruned}份）`);
    } catch (err) {
      logger.error(`[backup] 自动备份失败: ${err.message}`);
    }
  }, hours * 3600 * 1000);
  _timer.unref(); // 不阻止进程退出
  logger.info(`[backup] 自动备份已启动，间隔 ${hours} 小时，保留最近 ${config.backup.keep} 份`);
}

module.exports = { run, list, download, remove, startAutoBackup, doBackup, pruneBackups };
