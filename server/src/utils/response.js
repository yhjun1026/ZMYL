/**
 * 统一响应格式
 * 成功: { success: true, data, message }
 * 失败: { success: false, message }
 */

function success(data = null, message = '操作成功') {
  return { success: true, data, message };
}

function fail(message = '操作失败', code = 400) {
  return { success: false, message, code };
}

function okWith(data, extra = {}) {
  return { success: true, data, message: '操作成功', ...extra };
}

function parseJSON(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { success, fail, okWith, parseJSON };