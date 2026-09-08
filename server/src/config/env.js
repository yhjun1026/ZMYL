/**
 * 极简 .env 加载器（替代 dotenv）
 * - 解析 KEY=VALUE 行
 * - 支持 # 注释和空行
 * - 支持双引号 / 单引号 / 无引号
 * - 不覆盖已存在的 process.env 值（保持 process.env 优先）
 */
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;

    const key = m[1];
    let val = m[2];

    // 去引号
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

const envFile = process.env.ENV_FILE ||
  path.resolve(__dirname, '..', '..', '.env');

loadEnv(envFile);