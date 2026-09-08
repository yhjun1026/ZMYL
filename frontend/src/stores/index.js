import { createPinia } from 'pinia';
import { useAuthStore } from './auth';

export const pinia = createPinia();
export { useAuthStore };