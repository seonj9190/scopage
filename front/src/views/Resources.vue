<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { state: authState, api } = useAuth()

const folders = ref([])
const members = ref([])
const activeFolderId = ref(null)
const files = ref([])

const loadingFolders = ref(true)
const loadingFiles = ref(false)
const errorMsg = ref('')

const membersById = computed(() => Object.fromEntries(members.value.map((m) => [m.id, m])))

async function loadFolders() {
  loadingFolders.value = true
  errorMsg.value = ''
  try {
    const [{ folders: list }, { members: memberList }] = await Promise.all([
      api('/folders'),
      api('/members'),
    ])
    folders.value = list
    members.value = memberList
    if (!activeFolderId.value && list.length) {
      await selectFolder(list[0].id)
    }
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loadingFolders.value = false
  }
}

async function selectFolder(id) {
  activeFolderId.value = id
  loadingFiles.value = true
  errorMsg.value = ''
  try {
    const { files: list } = await api(`/folders/${id}/files`)
    files.value = list
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loadingFiles.value = false
  }
}

onMounted(loadFolders)

// ---- Folder create / delete ----

const newFolderName = ref('')
const creatingFolder = ref(false)

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  creatingFolder.value = true
  errorMsg.value = ''
  try {
    const { folder } = await api('/folders', { method: 'POST', body: JSON.stringify({ name }) })
    newFolderName.value = ''
    folders.value.push(folder)
    await selectFolder(folder.id)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creatingFolder.value = false
  }
}

async function removeFolder(folder) {
  if (!confirm(`"${folder.name}" 폴더와 안의 모든 파일을 삭제할까요?`)) return
  try {
    await api(`/folders/${folder.id}`, { method: 'DELETE' })
    folders.value = folders.value.filter((f) => f.id !== folder.id)
    if (activeFolderId.value === folder.id) {
      activeFolderId.value = null
      files.value = []
      if (folders.value.length) await selectFolder(folders.value[0].id)
    }
  } catch (err) {
    errorMsg.value = err.message
  }
}

// ---- File upload / delete ----

const fileInput = ref(null)
const uploadTitle = ref('')
const uploading = ref(false)

async function uploadFile() {
  const selected = fileInput.value?.files?.[0]
  if (!selected || !activeFolderId.value) return
  uploading.value = true
  errorMsg.value = ''
  try {
    const form = new FormData()
    form.append('file', selected)
    if (uploadTitle.value.trim()) form.append('title', uploadTitle.value.trim())
    const { file } = await api(`/folders/${activeFolderId.value}/files`, {
      method: 'POST',
      body: form,
    })
    files.value.unshift(file)
    uploadTitle.value = ''
    fileInput.value.value = ''
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    uploading.value = false
  }
}

async function removeFile(file) {
  if (!confirm(`"${file.title}" 파일을 삭제할까요?`)) return
  try {
    await api(`/files/${file.id}`, { method: 'DELETE' })
    files.value = files.value.filter((f) => f.id !== file.id)
  } catch (err) {
    errorMsg.value = err.message
  }
}

function canDelete(file) {
  return file.uploadedBy === authState.member?.id || authState.member?.isAdmin
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-light tracking-tight text-ink">단원 자료실</h1>
      <RouterLink to="/calendar" class="text-sm text-accent hover:underline">캘린더로 이동</RouterLink>
    </div>

    <p v-if="errorMsg" class="mb-4 text-sm text-rose-600">{{ errorMsg }}</p>

    <div class="grid gap-8 sm:grid-cols-[220px_1fr]">
      <!-- Folder list -->
      <aside>
        <h2 class="mb-2 text-xs font-medium tracking-wide text-muted uppercase">폴더</h2>
        <div v-if="loadingFolders" class="text-sm text-muted">불러오는 중...</div>
        <ul v-else class="space-y-1">
          <li v-for="folder in folders" :key="folder.id">
            <button
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
              :class="activeFolderId === folder.id ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60'"
              @click="selectFolder(folder.id)"
            >
              <span class="truncate">{{ folder.name }}</span>
              <button
                v-if="authState.member?.isAdmin"
                type="button"
                class="ml-2 shrink-0 text-xs text-muted hover:text-rose-600"
                @click.stop="removeFolder(folder)"
              >
                삭제
              </button>
            </button>
          </li>
        </ul>

        <form class="mt-4 flex gap-2" @submit.prevent="createFolder">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="새 폴더 이름"
            class="min-w-0 flex-1 border border-line px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            :disabled="creatingFolder"
            class="shrink-0 border border-line px-2 py-1.5 text-xs hover:bg-accent-soft disabled:opacity-50"
          >
            추가
          </button>
        </form>
      </aside>

      <!-- File list -->
      <section>
        <div v-if="!activeFolderId" class="py-10 text-center text-sm text-muted">
          왼쪽에서 폴더를 선택하거나 새로 만들어주세요.
        </div>
        <template v-else>
          <form class="mb-6 flex flex-wrap items-center gap-2 border border-line p-3" @submit.prevent="uploadFile">
            <input ref="fileInput" type="file" required class="flex-1 text-sm" />
            <input
              v-model="uploadTitle"
              type="text"
              placeholder="제목 (선택, 비우면 파일명 사용)"
              class="min-w-0 flex-1 border border-line px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              :disabled="uploading"
              class="shrink-0 bg-ink px-4 py-1.5 text-sm text-base hover:bg-accent disabled:opacity-50"
            >
              {{ uploading ? '업로드 중...' : '업로드' }}
            </button>
          </form>

          <div v-if="loadingFiles" class="text-sm text-muted">불러오는 중...</div>
          <p v-else-if="!files.length" class="text-sm text-muted">아직 업로드된 파일이 없습니다.</p>
          <ul v-else class="divide-y divide-line border border-line">
            <li v-for="file in files" :key="file.id" class="flex items-center justify-between gap-4 px-4 py-3">
              <div class="min-w-0">
                <a
                  :href="`/api/files/${file.id}/download`"
                  class="block truncate text-sm text-ink hover:text-accent hover:underline"
                >
                  {{ file.title }}
                </a>
                <p class="mt-0.5 text-xs text-muted">
                  {{ membersById[file.uploadedBy]?.name || '알 수 없음' }} ·
                  {{ formatDate(file.createdAt) }} · {{ formatSize(file.size) }}
                </p>
              </div>
              <button
                v-if="canDelete(file)"
                type="button"
                class="shrink-0 text-xs text-muted hover:text-rose-600"
                @click="removeFile(file)"
              >
                삭제
              </button>
            </li>
          </ul>
        </template>
      </section>
    </div>
  </div>
</template>
