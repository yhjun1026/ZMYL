<template>
  <div class="login-page">
  <div class="background-particles">
    <div class="dot" style="width:120px;height:120px;left:10%;top:20%;animation-delay:0s"></div>
    <div class="dot" style="width:80px;height:80px;left:25%;top:60%;animation-delay:2s"></div>
    <div class="dot" style="width:100px;height:100px;left:60%;top:15%;animation-delay:4s"></div>
    <div class="dot" style="width:90px;height:90px;left:75%;top:70%;animation-delay:1s"></div>
    <div class="dot" style="width:70px;height:70px;left:45%;top:80%;animation-delay:3s"></div>
    <div class="dot" style="width:110px;height:110px;left:85%;top:35%;animation-delay:5s"></div>
  </div>

  <div class="login-box">
    <div class="header">
      <div class="logo-icon">🏥</div>
      <div class="title-wrap">
        <h1>医疗器械智能管理平台</h1>
        <p class="subtitle">GSP合规 · 医疗器械经营质量管理规范</p>
      </div>
    </div>

    <form autocomplete="on" @submit.prevent="doLogin">
      <div class="form-group">
        <label for="username">用户名</label>
        <div class="input-wrap">
          <input type="text" id="username" v-model="username" placeholder="请输入用户名" maxlength="50" autocomplete="username" required>
        </div>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <div class="input-wrap">
          <input :type="showPwd ? 'text' : 'password'" id="password" v-model="password" placeholder="请输入密码" maxlength="128" autocomplete="current-password" required>
          <button type="button" class="pwd-toggle" :title="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
        </div>
      </div>

      <div class="options-row">
        <label><input type="checkbox" v-model="remember"> 记住登录 (7天)</label>
      </div>

      <div class="error-msg" :class="{ show: errorMsg, success: successMsg }">{{ errorMsg || successMsg }}</div>
      <button type="submit" class="btn-login" :class="{ loading }" :disabled="loading">
        <span class="spinner"></span> 登 录
      </button>
    </form>

    <div class="demo-section">
      <div style="font-weight:500;margin-bottom:4px">演示账号（仅开发环境显示）</div>
      <div class="demo-users">
        <span class="user-chip" v-for="u in demoUsers" :key="u.name" :title="u.title"
              @click="fillForm(u.name, u.pwd)">{{ u.name }}</span>
      </div>
      <div style="font-size:11px;color:#bdc3cc;margin-top:4px">生产环境下不显示演示账号</div>
    </div>
    <div class="version">医疗器械 v3.0 · 智能管理平台 · GSP合规</div>
  </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const showPwd = ref(false)
const remember = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const demoUsers = [
  { name: 'admin', pwd: '123456', title: '系统管理员' },
]

function fillForm(u, p) {
  username.value = u
  password.value = p
}

async function doLogin() {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  try {
    const data = await authStore.login(username.value, password.value)
    // 兼容 MainLayout 顶栏显示（zmyl_user_name）
    const displayName = data.username || data.name || username.value
    localStorage.setItem('zmyl_user_name', displayName)
    successMsg.value = '登录成功，正在进入系统...'
    await router.push('/dashboard')
  } catch (e) {
    errorMsg.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 原版 login.html 样式一比一拷贝 ===== */
* { box-sizing: border-box; margin: 0; padding: 0; }
.login-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #1e6fb8 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.background-particles { position: fixed; inset: 0; overflow: hidden; z-index: 0; }
.background-particles .dot {
  position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06);
  animation: float 8s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-40px) scale(1.3); }
}
.login-box {
  position: relative; z-index: 1; background: #fff; border-radius: 16px; padding: 44px 40px 36px;
  width: 420px; box-shadow: 0 24px 80px rgba(0,0,0,0.35);
}
/* 覆盖全局 legacy.css 的 .header（高度/阴影/两端分布），恢复原版登录头布局 */
.login-box .header { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 32px; height: auto; padding: 0; background: none; border: none; box-shadow: none; flex-shrink: 1; }
.login-box .logo-icon { font-size: 44px; line-height: 1; flex-shrink: 0; }
.login-box .title-wrap { flex: 1; min-width: 0; text-align: left; }
.login-box h1 { font-size: 21px; color: #1a2332; margin-bottom: 4px; white-space: nowrap; }
.login-box .subtitle { color: #95a5b8; font-size: 12px; white-space: nowrap; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 13px; color: #2c3e50; margin-bottom: 6px; font-weight: 500; }
.input-wrap { position: relative; }
.input-wrap input {
  width: 100%; padding: 11px 40px 11px 14px; border: 1.5px solid #e4e8ee; border-radius: 8px;
  font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
}
.input-wrap input:focus { border-color: #1e6fb8; box-shadow: 0 0 0 3px rgba(30,111,184,0.1); }
.input-wrap .pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 18px; color: #95a5b8;
  padding: 2px; line-height: 1; transition: color 0.2s;
}
.input-wrap .pwd-toggle:hover { color: #2c3e50; }
.options-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
  font-size: 13px; color: #7f8c9b;
}
.options-row label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.options-row input[type="checkbox"] { accent-color: #1e6fb8; width: 15px; height: 15px; cursor: pointer; }
.btn-login {
  width: 100%; padding: 13px; background: linear-gradient(135deg, #1e6fb8, #1aa690);
  color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s, transform 0.1s; position: relative;
}
.btn-login:hover { opacity: 0.92; }
.btn-login:active { transform: scale(0.98); }
.btn-login:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.btn-login .spinner {
  display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
  vertical-align: middle; margin-right: 6px; display: none;
}
.btn-login.loading .spinner { display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-msg {
  color: #e74c3c; font-size: 13px; text-align: center; margin-bottom: 14px;
  min-height: 20px; transition: opacity 0.2s; opacity: 0;
}
.error-msg.show { opacity: 1; }
.error-msg.success { color: #27ae60; }
.demo-section {
  margin-top: 24px; padding-top: 18px; border-top: 1px solid #eef1f5;
  font-size: 12px; color: #95a5b8; text-align: center;
}
.demo-users { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 8px; }
.demo-users .user-chip {
  padding: 5px 12px; background: #f5f7fa; border-radius: 20px; cursor: pointer;
  transition: background 0.2s, color 0.2s; font-size: 12px; color: #2c3e50;
  border: 1px solid transparent;
}
.demo-users .user-chip:hover { background: #dbeafe; border-color: #1e6fb8; color: #1e6fb8; }
.version { text-align: center; font-size: 11px; color: #bdc3cc; margin-top: 20px; }
</style>
