<script setup>
import { ref } from 'vue'

const props = defineProps({
  files: { type: Array, required: true },
  membersById: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  uploading: { type: Boolean, default: false },
  uploadProgress: { type: String, default: '' },
  currentMemberId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
})

const emit = defineEmits(['upload', 'remove'])

function canDelete(file) {
  return file.uploadedBy === props.currentMemberId || props.isAdmin
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const fileInput = ref(null)

function pickFiles() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const selected = Array.from(event.target.files || [])
  if (selected.length) emit('upload', selected)
  event.target.value = ''
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-sm text-muted">불러오는 중...</div>
    <p v-else-if="!files.length" class="mb-4 text-sm text-muted">아직 업로드된 파일이 없습니다.</p>
    <ul v-else class="mb-4 divide-y divide-line border border-line">
      <li v-for="file in files" :key="file.id" class="flex items-center justify-between gap-4 px-4 py-3">
        <div class="min-w-0">
          <a
            :href="`/api/files/${file.id}/download?inline=1`"
            target="_blank"
            rel="noopener noreferrer"
            class="block truncate text-base text-ink hover:text-accent hover:underline sm:text-sm"
          >
            {{ file.title }}
          </a>
          <p class="mt-0.5 text-sm text-muted sm:text-xs">
            {{ membersById[file.uploadedBy]?.name || '알 수 없음' }} ·
            {{ formatDate(file.createdAt) }} · {{ formatSize(file.size) }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <a
            :href="`/api/files/${file.id}/download`"
            class="flex h-9 w-9 items-center justify-center text-muted hover:text-ink sm:h-8 sm:w-8"
            title="다운로드"
            aria-label="다운로드"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true">
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
            class="flex h-9 w-9 items-center justify-center text-muted hover:text-rose-600 sm:h-8 sm:w-8"
            title="삭제"
            aria-label="삭제"
            @click="emit('remove', file)"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true">
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

    <input ref="fileInput" type="file" multiple class="hidden" @change="onFileChange" />
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
  </div>
</template>
