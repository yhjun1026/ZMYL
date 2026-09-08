/**
 * 001 - 用户 + 角色表 + 13 角色种子 + admin/123456
 */
module.exports = {
  id: '001_init_users_roles',

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        rank INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        dept TEXT DEFAULT '',
        role_code TEXT NOT NULL,
        role TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        status TEXT DEFAULT '启用',
        permission_overrides TEXT DEFAULT '{}',
        last_login_at TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (role_code) REFERENCES roles(code)
      );

      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `);
  },

  seed(db) {
    // 13 角色（按数据包 init_db.py 顺序）
    const roles = [
      { code: 'sys_admin',      name: '系统管理员',  rank: 100, desc: '系统级最高权限' },
      { code: 'admin_dept',     name: '行政部',       rank: 80,  desc: '行政部员工' },
      { code: 'sales_director', name: '销售总监',     rank: 90,  desc: '销售总监' },
      { code: 'sales_mgr',      name: '销售经理',     rank: 70,  desc: '销售经理' },
      { code: 'quality_mgr',    name: '质量负责人',   rank: 95,  desc: '质量负责人（最终批准人）' },
      { code: 'quality_staff',  name: '质管员',       rank: 60,  desc: '质管员' },
      { code: 'warehouse',      name: '库管员',       rank: 60,  desc: '库管员' },
      { code: 'purchaser',      name: '采购员',       rank: 60,  desc: '采购员' },
      { code: 'salesman',       name: '业务员',       rank: 50,  desc: '业务员' },
      { code: 'finance',        name: '财务',         rank: 60,  desc: '财务' },
      { code: 'hr',             name: '人事',         rank: 60,  desc: '人事' },
      { code: 'trainer',        name: '培训员',       rank: 50,  desc: '培训员' },
      { code: 'viewer',         name: '只读访客',     rank: 10,  desc: '只读访客' },
    ];

    const insertRole = db.prepare(
      'INSERT OR IGNORE INTO roles (code, name, rank, description) VALUES (?, ?, ?, ?)'
    );
    for (const r of roles) {
      insertRole.run(r.code, r.name, r.rank, r.desc);
    }

    // admin / 123456（默认 bcrypt 哈希在 lazy 阶段重写）
    // 这里用 bcryptjs 同步 hash
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('123456', 10);

    const adminExists = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
      db.prepare(
        `INSERT INTO users (username, password_hash, name, dept, role_code, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run('admin', hash, '系统管理员', '系统部', 'sys_admin', '系统管理员', '启用');
    }
  },
};