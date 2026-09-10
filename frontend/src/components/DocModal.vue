<template>
  <div class="modal-overlay" :class="{ show: true }">
    <div class="modal" style="max-width:640px;width:92%">
      <div class="modal-header">
        <div class="modal-title">📎 资料管理 — {{ title }}</div>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <!-- 上传区 -->
        <div class="upload-row">
          <label class="btn btn-primary" :class="{ disabled: uploading || !canUpload }">
            {{ uploading ? '上传中...' : '⬆ 上传 PDF 资料' }}
            <input type="file" accept=".pdf,application/pdf" style="display:none" :disabled="uploading || !canUpload" @change="onFileChange">
          </label>
          <span v-if="!canUpload" style="font-size:12px;color:var(--text-muted)">当前角色无上传权限（需采购/质管/库管/综合行政）</span>
          <span v-else style="font-size:12px;color:var(--text-muted)">仅支持 PDF，≤20MB</span>
        </div>
        <div v-if="uploadMsg" class="upload-msg" :class="{ err: uploadMsgErr }">{{ uploadMsg }}</div>

        <!-- 资料列表 -->
        <div class="table-wrap" v-if="docs.length">
          <table>
            <thead>
              <tr><th>文件名</th><th>类型</th><th>大小</th><th>上传人</th><th>上传时间</th><th style="width:150px">操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in docs" :key="d.id">
                <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="d.title">{{ d.title || d.file_name }}</td>
                <td><span class="tag tag-info">{{ d.doc_type || '资料' }}</span></td>
                <td>{{ fmtSize(d.file_size) }}</td>
                <td>{{ d.uploaded_by || '-' }}</td>
                <td>{{ (d.uploaded_at || '').slice(0, 16) }}</td>
                <td class="action-cell">
                  <a class="btn btn-sm btn-outline" :href="fileApi.docUrl(d.id)" target="_blank">查看</a>
                  <a class="btn btn-sm btn-outline" :href="fileApi.docUrl(d.id)" :download="d.file_name">下载</a>
                  <button class="btn btn-sm btn-danger" :disabled="!canUpload" @click="doRemove(d)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无资料</div>
          <div class="empty-hint">点击上方"上传 PDF 资料"添加首营/验收资料</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" style="background:#f0f2f5" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fileApi } from '../api'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  bizType: { type: String, required: true },
  bizId: { type: [Number, String], required: true },
  title: { type: String, default: '业务单据' },
})
defineEmits(['close'])

const auth = useAuthStore()
const docs = ref([])
const uploading = ref(false)
const uploadMsg = ref('')
const uploadMsgErr = ref(false)

const UPLOAD_ROLES = ['sys_admin', 'purchaser', 'quality_staff', 'quality_mgr', 'warehouse', 'admin_dept']
const canUpload = computed(() => UPLOAD_ROLES.includes(auth.user?.role_code))

function fmtSize(n) {
  if (!n) return '-'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}

async function load() {
  try {
    const d = await fileApi.listDocs({ biz_type: props.bizType, biz_id: props.bizId })
    docs.value = d.records || d.items || (Array.isArray(d) ? d : []) || []
  } catch (e) { showMsg('加载资料列表失败：' + e.message, true) }
}

function showMsg(text, err = false) {
  uploadMsg.value = text
  uploadMsgErr.value = err
  if (!err) setTimeout(() => { uploadMsg.value = '' }, 3000)
}

async function onFileChange(ev) {
  const file = ev.target.files && ev.target.files[0]
  ev.target.value = ''
  if (!file) return
  if (!/\.pdf$/i.test(file.name)) { showMsg('仅支持 PDF 格式', true); return }
  if (file.size > 20 * 1024 * 1024) { showMsg('文件超过 20MB 限制', true); return }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('biz_type', props.bizType)
    fd.append('biz_id', props.bizId)
    fd.append('doc_type', '随单资料')
    fd.append('title', file.name)
    await fileApi.uploadDoc(fd)
    showMsg('上传成功')
    await load()
  } catch (e) { showMsg('上传失败：' + e.message, true) }
  finally { uploading.value = false }
}

async function doRemove(d) {
  if (!window.confirm(`确定删除资料「${d.title || d.file_name}」吗？`)) return
  try {
    await fileApi.removeDoc(d.id)
    await load()
  } catch (e) { showMsg('删除失败：' + e.message, true) }
}

onMounted(load)
</script>

<style scoped>
.upload-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.btn.disabled { opacity: 0.5; pointer-events: none; }
.upload-msg { padding: 6px 10px; border-radius: 6px; font-size: 13px; background: #e8f5e9; color: #27ae60; margin-bottom: 10px; }
.upload-msg.err { background: #fdecea; color: #e74c3c; }
</style>
