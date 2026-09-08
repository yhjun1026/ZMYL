import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth as authApi } from '../api';

const TOKEN_KEY = 'zmyl_token';
const USER_KEY = 'zmyl_user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'));

  const isLoggedIn = computed(() => !!token.value);
  const isSysAdmin = computed(() => user.value?.role_code === 'sys_admin');
  const roleCode = computed(() => user.value?.role_code || '');

  function setToken(t) {
    token.value = t || '';
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function setUser(u) {
    user.value = u || null;
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }

  async function login(username, password) {
    const data = await authApi.login(username, password);
    setToken(data.token);
    setUser(data);
    return data;
  }

  async function logout() {
    try { await authApi.logout(); } catch {}
    setToken(null);
    setUser(null);
  }

  async function fetchMe() {
    const data = await authApi.me();
    setUser(data);
    return data;
  }

  function clear() {
    setToken(null);
    setUser(null);
  }

  return {
    token, user,
    isLoggedIn, isSysAdmin, roleCode,
    setToken, setUser, login, logout, fetchMe, clear,
  };
});