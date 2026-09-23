<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { api } = useAuth()

const photos = ref([])
const videos = ref([])
const loading = ref(true)
const errorMsg = ref('')
const successMsg = ref('')

async function loadGallery() {
  loading.value = true
  errorMsg.value = ''
  try {
    // The public listing already returns everything — no separate
    // admin-only read endpoint is needed, only the mutations below are.
    const { photos: photoList, videos: videoList } = await api('/public/gallery')
    photos.value = photoList
    videos.value = videoList
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadGallery)

// ---- Videos ----

const videoTitle = ref('')
const videoUrl = ref('')
const creatingVideo = ref(false)

async function createVideo() {
  if (!videoTitle.value.trim() || !videoUrl.value.trim()) return
  creatingVideo.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const { video } = await api('/admin/gallery/videos', {
      method: 'POST',
      body: JSON.stringify({ title: videoTitle.value.trim(), youtubeUrl: videoUrl.value.trim() }),
    })
    videos.value.unshift(video)
    videoTitle.value = ''
    videoUrl.value = ''
    successMsg.value = '영상을 추가했습니다.'
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creatingVideo.value = false
  }
}

async function removeVideo(video) {
  if (!confirm(`"${video.title}" 영상을 삭제할까요?`)) return
  errorMsg.value = ''
  try {
    await api(`/admin/gallery/videos/${video.id}`, { method: 'DELETE' })
    videos.value = videos.value.filter((v) => v.id !== video.id)
  } catch (err) {
    errorMsg.value = err.message
  }
}

// ---- Photos ----

const photoAlt = ref('')
const photoInput = ref(null)
const creatingPhoto = ref(false)

async function createPhoto() {
  const file = photoInput.value?.files?.[0]
  if (!file) return
  creatingPhoto.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const form = new FormData()
    form.append('photo', file)
    if (photoAlt.value.trim()) form.append('alt', photoAlt.value.trim())
    const { photo } = await api('/admin/gallery/photos', { method: 'POST', body: form })
    photos.value.unshift(photo)
    photoAlt.value = ''
    photoInput.value.value = ''
    successMsg.value = '사진을 추가했습니다.'
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creatingPhoto.value = false
  }
}

async function removePhoto(photo) {
  if (!confirm('이 사진을 삭제할까요?')) return
  errorMsg.value = ''
  try {
    await api(`/admin/gallery/photos/${photo.id}`, { method: 'DELETE' })
    photos.value = photos.value.filter((p) => p.id !== photo.id)
  } catch (err) {
    errorMsg.value = err.message
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-light tracking-tight text-ink">갤러리 관리</h1>
      <div class="flex items-center gap-3 text-sm">
        <RouterLink to="/admin/members" class="text-accent hover:underline">멤버 관리</RouterLink>
        <RouterLink to="/admin/performances" class="text-accent hover:underline">공연 관리</RouterLink>
        <RouterLink to="/calendar" class="text-accent hover:underline">캘린더로 돌아가기</RouterLink>
      </div>
    </div>

    <p v-if="errorMsg" class="mb-4 text-sm text-rose-600">{{ errorMsg }}</p>
    <p v-if="successMsg" class="mb-4 text-sm text-emerald-600">{{ successMsg }}</p>

    <section class="mb-10 border border-line p-5">
      <h2 class="mb-4 text-sm font-medium text-ink">새 영상 추가</h2>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="createVideo">
        <input v-model="videoTitle" type="text" placeholder="영상 제목" required class="border border-line px-3 py-2 text-sm" />
        <input
          v-model="videoUrl"
          type="text"
          placeholder="유튜브 링크 (또는 영상 ID)"
          required
          class="border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          :disabled="creatingVideo"
          class="sm:col-span-2 bg-ink px-4 py-2 text-sm text-base hover:bg-accent disabled:opacity-50"
        >
          {{ creatingVideo ? '추가 중...' : '영상 추가' }}
        </button>
      </form>
    </section>

    <section class="mb-10 border border-line p-5">
      <h2 class="mb-4 text-sm font-medium text-ink">새 사진 추가</h2>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="createPhoto">
        <input v-model="photoAlt" type="text" placeholder="사진 설명 (선택)" class="border border-line px-3 py-2 text-sm" />
        <input ref="photoInput" type="file" accept="image/*" required class="text-sm" />
        <button
          type="submit"
          :disabled="creatingPhoto"
          class="sm:col-span-2 bg-ink px-4 py-2 text-sm text-base hover:bg-accent disabled:opacity-50"
        >
          {{ creatingPhoto ? '업로드 중...' : '사진 추가' }}
        </button>
      </form>
    </section>

    <div v-if="loading" class="text-sm text-muted">불러오는 중...</div>
    <template v-else>
      <section class="mb-10">
        <h2 class="mb-4 text-sm font-medium text-ink">등록된 영상 ({{ videos.length }})</h2>
        <p v-if="!videos.length" class="text-sm text-muted">등록된 영상이 없습니다.</p>
        <ul v-else class="divide-y divide-line border border-line">
          <li v-for="video in videos" :key="video.id" class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm text-ink">{{ video.title }}</p>
              <a
                :href="`https://www.youtube.com/watch?v=${video.youtubeId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-muted hover:text-accent hover:underline"
              >
                youtube.com/watch?v={{ video.youtubeId }}
              </a>
            </div>
            <button type="button" class="shrink-0 text-xs text-muted hover:text-rose-600" @click="removeVideo(video)">
              삭제
            </button>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-4 text-sm font-medium text-ink">등록된 사진 ({{ photos.length }})</h2>
        <p v-if="!photos.length" class="text-sm text-muted">등록된 사진이 없습니다.</p>
        <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <li v-for="photo in photos" :key="photo.id" class="group relative">
            <img :src="photo.imageUrl" :alt="photo.alt || ''" class="aspect-square w-full border border-line object-cover" />
            <button
              type="button"
              class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center bg-black/60 text-base opacity-0 transition-opacity group-hover:opacity-100"
              title="삭제"
              aria-label="삭제"
              @click="removePhoto(photo)"
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
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
