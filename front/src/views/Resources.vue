<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'
import ResourceFilePanel from '@/components/ResourceFilePanel.vue'

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
const folderModalOpen = ref(false)
const newFolderInput = ref(null)

function openFolderModal() {
  newFolderName.value = ''
  folderModalOpen.value = true
  nextTick(() => newFolderInput.value?.focus())
}

function closeFolderModal() {
  folderModalOpen.value = false
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  creatingFolder.value = true
  errorMsg.value = ''
  try {
    const { folder } = await api('/folders', { method: 'POST', body: JSON.stringify({ name }) })
    folders.value.push(folder)
    folderModalOpen.value = false
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

const uploading = ref(false)
const uploadProgress = ref('')

const currentFolderName = computed(
  () => folders.value.find((f) => f.id === activeFolderId.value)?.name || ''
)

function closeFileModal() {
  activeFolderId.value = null
}

async function uploadFile(selected) {
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

        <button
          type="button"
          class="mb-4 flex w-full items-center justify-center gap-2 border border-line bg-accent-soft/60 px-4 py-2.5 text-sm font-medium text-ink hover:bg-accent-soft"
          @click="openFolderModal"
        >
          <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5 shrink-0" aria-hidden="true">
            <path
              d="M3 6a1.5 1.5 0 0 1 1.5-1.5h3.4a1.5 1.5 0 0 1 1.06.44l1.1 1.1a1.5 1.5 0 0 0 1.06.44h4.38A1.5 1.5 0 0 1 17 8v6.5A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5V6Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M10 9.5v4M8 11.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          폴더 추가
        </button>

        <div v-if="loadingFolders" class="text-sm text-muted">불러오는 중...</div>
        <ul v-else class="divide-y divide-line border border-line">
          <li v-for="folder in folders" :key="folder.id">
            <button
              type="button"
              class="flex w-full items-center justify-between border-l-4 px-3 py-3 text-left text-lg sm:py-2.5 sm:text-sm"
              :class="
                activeFolderId === folder.id
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-transparent text-muted hover:bg-accent-soft/60'
              "
              @click="selectFolder(folder.id)"
            >
              <span class="flex min-w-0 items-center gap-2">
                <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5 shrink-0 text-muted sm:h-4 sm:w-4" aria-hidden="true">
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
                class="ml-2 shrink-0 text-sm text-muted hover:text-rose-600 sm:text-xs"
                @click.stop="removeFolder(folder)"
              >
                삭제
              </button>
            </button>
          </li>
        </ul>
      </aside>

      <!-- File list (desktop: inline panel beside the folder list) -->
      <section class="hidden sm:block">
        <div v-if="!activeFolderId" class="py-10 text-center text-sm text-muted">
          폴더를 선택하면 업로드된 파일을 확인할 수 있습니다.
        </div>
        <ResourceFilePanel
          v-else
          :files="files"
          :members-by-id="membersById"
          :loading="loadingFiles"
          :uploading="uploading"
          :upload-progress="uploadProgress"
          :current-member-id="authState.member?.id"
          :is-admin="authState.member?.isAdmin"
          @upload="uploadFile"
          @remove="removeFile"
        />
      </section>
    </div>

    <!-- File list (mobile: modal opened by tapping a folder) -->
    <div
      v-if="activeFolderId"
      class="fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden"
      @click.self="closeFileModal"
    >
      <div class="max-h-[85vh] w-full overflow-y-auto bg-base p-4 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="truncate text-lg text-ink">{{ currentFolderName }}</h3>
          <button type="button" class="shrink-0 text-sm text-muted hover:text-ink" @click="closeFileModal">닫기</button>
        </div>
        <ResourceFilePanel
          :files="files"
          :members-by-id="membersById"
          :loading="loadingFiles"
          :uploading="uploading"
          :upload-progress="uploadProgress"
          :current-member-id="authState.member?.id"
          :is-admin="authState.member?.isAdmin"
          @upload="uploadFile"
          @remove="removeFile"
        />
      </div>
    </div>

    <!-- Folder create modal -->
    <div
      v-if="folderModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      @click.self="closeFolderModal"
    >
      <div class="w-full max-w-sm bg-base p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg text-ink">새 폴더</h3>
          <button type="button" class="text-muted hover:text-ink" @click="closeFolderModal">닫기</button>
        </div>
        <form class="space-y-4" @submit.prevent="createFolder">
          <input
            ref="newFolderInput"
            v-model="newFolderName"
            type="text"
            placeholder="새 폴더 이름"
            class="w-full border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            :disabled="creatingFolder || !newFolderName.trim()"
            class="w-full bg-ink px-4 py-2 text-sm text-base hover:bg-accent disabled:opacity-50"
          >
            {{ creatingFolder ? '만드는 중...' : '만들기' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
