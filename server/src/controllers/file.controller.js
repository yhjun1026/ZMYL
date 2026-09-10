/**
 * 验收资料 PDF 上传/下载 —— 对齐数据包 acceptance-docs 端点
 * 仅 PDF、≤20MB、随业务单据（biz_type/biz_id）留档
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { success, fail } = require('../utils/response');
const auditLog = require('../utils/audit');

const UPLOAD_ROLES = ['sys_admin', 'purchaser', 'quality_staff', 'quality_mgr', 'warehouse', 'admin_dept'];
const MAX_PDF_MB = 20;

const ACCEPT_DIR = path.join(config.upload.dir, 'acceptance');

// multer 存储配置：随机安全文件名，保留原始名到 DB
const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(ACCEPT_DIR, { recursive: true });
    cb(null, ACCEPT_DIR);
  },
  filename(req, file, cb) {
    const safe = String(file.originalname || 'doc.pdf')
      .replace(/[^\w\u4e00-\u9fff.-]/g, '_').slice(-120);
    cb(null, `${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!/\.pdf$/i.test(file.originalname || '')) {
      return cb(new Error('仅支持PDF格式文件'));
    }
    cb(null, true);
  },
});

function nowStr() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
}
function nowFull() {
  return new Date().toLocaleString('sv-SE', { hour12: false });
}
function displayName(req) {
  return req.user.name || req.user.username;
}

/**
 * POST /api/acceptance_doc   multipart: file + biz_type + biz_id + order_no? + doc_type? + title? + remark?
 */
async function uploadDoc(req, res) {
  if (!UPLOAD_ROLES.includes(req.userRoleCode)) {
    return res.status(403).json(fail('无上传权限（需采购/质管/库管角色）', 403));
  }
  const f = req.file;
  if (!f) return res.status(400).json(fail('未选择文件', 400));

  const { biz_type = '', biz_id = 0, order_no = '', doc_type = '验收资料', title = '', remark = '' } = req.body || {};
  if (!biz_type || !biz_id) {
    // 上传的物理文件无关联信息，直接清掉
    try { fs.unlinkSync(f.path); } catch { /* ignore */ }
    return res.status(400).json(fail('缺少业务关联参数（biz_type / biz_id）', 400));
  }

  const relPath = path.posix.join('uploads', 'acceptance', path.basename(f.path));
  const info = await db.run(
    `INSERT INTO acceptance_doc
      (biz_type, biz_id, order_no, doc_type, title, file_name, file_path, file_size,
       remark, uploaded_by, uploaded_at, created_by, created_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [biz_type, biz_id, order_no, doc_type || '验收资料',
      title || f.originalname, f.originalname, relPath, f.size,
      remark, displayName(req), nowStr(), req.user.username, nowFull()]
  );

  auditLog('DOC_UPLOAD', req.userId, `acceptance_doc#${info.insertId}`, { biz_type, biz_id, file: f.originalname });
  try {
    await db.run(
      'INSERT INTO operation_log ("time", "text", "user", created_at, deleted) VALUES (?, ?, ?, ?, 0)',
      [nowFull(), `上传验收资料PDF: ${f.originalname}（biz=${biz_type}:${biz_id}）`, displayName(req), nowFull()]
    );
  } catch { /* 缺表忽略 */ }

  return res.json(success({ id: info.insertId, file_path: relPath, file_size: f.size }, '验收资料上传成功'));
}

/**
 * GET /api/acceptance_doc?biz_type=&biz_id=   列表（元数据）
 */
async function listDocs(req, res) {
  const { biz_type = '', biz_id = '' } = req.query;
  const where = ['deleted = 0'];
  const params = [];
  if (biz_type) { where.push('biz_type = ?'); params.push(biz_type); }
  if (biz_id) { where.push('biz_id = ?'); params.push(parseInt(biz_id, 10)); }

  const items = await db.all(
    `SELECT id, biz_type, biz_id, order_no, doc_type, title, file_name, file_path,
            file_size, remark, uploaded_by, uploaded_at
       FROM acceptance_doc WHERE ${where.join(' AND ')} ORDER BY id DESC`,
    params
  );
  return res.json(success(items));
}

/**
 * GET /api/acceptance_doc/:id/file   浏览器直接打开/下载 PDF
 * 支持 ?token= 查询参数认证（auth 中间件已兼容）
 */
async function downloadDoc(req, res) {
  const { id } = req.params;
  const doc = await db.get('SELECT * FROM acceptance_doc WHERE id = ? AND deleted = 0', [id]);
  if (!doc) return res.status(404).json(fail('验收资料不存在', 404));

  // 文件统一存放在 {upload.dir}/acceptance/ 下（防路径穿越：只取 basename）
  const absPath = path.join(ACCEPT_DIR, path.basename(doc.file_path));
  if (!fs.existsSync(absPath)) {
    return res.status(404).json(fail('PDF文件不存在或已被移除', 404));
  }

  // 中文文件名 RFC 5987 编码
  const dispName = doc.file_name || 'acceptance.pdf';
  let cd;
  try {
    dispName.encode('ascii');
    cd = `inline; filename="${dispName}"`;
  } catch {
    cd = `inline; filename="acceptance.pdf"; filename*=UTF-8''${encodeURIComponent(dispName)}`;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', cd);
  return res.sendFile(absPath);
}

/**
 * DELETE /api/acceptance_doc/:id   删除（物理文件 + 记录）
 */
async function removeDoc(req, res) {
  if (!UPLOAD_ROLES.includes(req.userRoleCode)) {
    return res.status(403).json(fail('无删除权限', 403));
  }
  const { id } = req.params;
  const doc = await db.get('SELECT * FROM acceptance_doc WHERE id = ? AND deleted = 0', [id]);
  if (!doc) return res.status(404).json(fail('验收资料不存在', 404));

  try { fs.unlinkSync(path.join(ACCEPT_DIR, path.basename(doc.file_path))); } catch { /* 已不存在 */ }
  await db.run('UPDATE acceptance_doc SET deleted = 1 WHERE id = ?', [id]);

  auditLog('DOC_DELETE', req.userId, `acceptance_doc#${id}`, { file: doc.file_name });
  return res.json(success(null, '验收资料已删除'));
}

module.exports = { upload, uploadDoc, listDocs, downloadDoc, removeDoc };
