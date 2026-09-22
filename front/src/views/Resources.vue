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
const uploading = ref(false)
const uploadProgress = ref('')

function pickFiles() {
  fileInput.value?.click()
}

async function uploadFile() {
  const selected = Array.from(fileInput.value?.files || [])
  if (!selected.length || !activeFolderId.value) return
  uploading.value = true
  errorMsg.value = ''

  try {
    for (let i = 0; i < selected.length; i++) {
      uploadProgress.value = selected.length > 1 ? `업로드 중... (${i + 1}/${selected.length})` : '업로드 중...'
      const form = new FormData()
      form.append('file', selected[i])
      const { file } = await api(`/folders/${activeFolderId.value}/files`, {
        method: 'POST',
        body: form,
      })
      files.value.unshift(file)
    }
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    uploading.value = false
    uploadProgress.value = ''
    fileInput.value.value = ''
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

        <form class="mb-4 flex gap-2" @submit.prevent="createFolder">
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

        <div v-if="loadingFolders" class="text-sm text-muted">불러오는 중...</div>
        <ul v-else class="space-y-1">
          <li v-for="folder in folders" :key="folder.id">
            <button
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
              :class="activeFolderId === folder.id ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60'"
              @click="selectFolder(folder.id)"
            >
              <span class="flex min-w-0 items-center gap-2">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                  <path
                    d="M3 6a1.5 1.5 0 0 1 1.5-1.5h3.4a1.5 1.5 0 0 1 1.06.44l1.1 1.1a1.5 1.5 0 0 0 1.06.44h4.38A1.5 1.5 0 0 1 17 8v6.5A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5V6Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="truncate">{{ folder.name }}</span>
              </span>
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
      </aside>

      <!-- File list -->
      <section>
        <div v-if="!activeFolderId" class="py-10 text-center text-sm text-muted">
          폴더를 선택하면 업로드된 파일을 확인할 수 있습니다.
        </div>
        <template v-else>
          <div v-if="loadingFiles" class="text-sm text-muted">불러오는 중...</div>
          <p v-else-if="!files.length" class="mb-4 text-sm text-muted">아직 업로드된 파일이 없습니다.</p>
          <ul v-else class="mb-4 divide-y divide-line border border-line">
            <li v-for="file in files" :key="file.id" class="flex items-center justify-between gap-4 px-4 py-3">
              <div class="min-w-0">
                <a
                  :href="`/api/files/${file.id}/download?inline=1`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block truncate text-sm text-ink hover:text-accent hover:underline"
                >
                  {{ file.title }}
                </a>
                <p class="mt-0.5 text-xs text-muted">
                  {{ membersById[file.uploadedBy]?.name || '알 수 없음' }} ·
                  {{ formatDate(file.createdAt) }} · {{ formatSize(file.size) }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <a
                  :href="`/api/files/${file.id}/download`"
                  class="flex h-8 w-8 items-center justify-center text-muted hover:text-ink"
                  title="다운로드"
                  aria-label="다운로드"
                >
                  <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                    <path
                      d="M10 3v9m0 0 3-3m-3 3-3-3M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </a>
                <button
                  v-if="canDelete(file)"
                  type="button"
                  class="flex h-8 w-8 items-center justify-center text-muted hover:text-rose-600"
                  title="삭제"
                  aria-label="삭제"
                  @click="removeFile(file)"
                >
                  <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.4A1.5 1.5 0 0 0 8.1 17h3.8a1.5 1.5 0 0 0 1.5-1.6L14 6M8.5 9v5m3-5v5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          </ul>

          <input ref="fileInput" type="file" multiple class="hidden" @change="uploadFile" />
          <button
            type="button"
            :disabled="uploading"
            class="inline-flex items-center gap-2 border border-line px-4 py-2 text-sm text-ink hover:bg-accent-soft disabled:opacity-50"
            @click="pickFiles"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
              <path
                d="M10 3v10m0-10 3.5 3.5M10 3 6.5 6.5M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ uploading ? (uploadProgress || '업로드 중...') : '파일 업로드' }}
          </button>
        </template>
      </section>
    </div>
  </div>
</template>
