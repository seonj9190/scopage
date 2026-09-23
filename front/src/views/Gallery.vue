<script setup>
import { ref, onMounted } from 'vue'
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import SnsIcon from '@/components/SnsIcon.vue'

const photos = ref([])
const videos = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/public/gallery')
    const data = await res.json()
    photos.value = data.photos || []
    videos.value = data.videos || []
  } catch {
    photos.value = []
    videos.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <PageHero
      eyebrow="Gallery"
      title="갤러리"
      description="공연과 활동 현장의 사진, 영상을 만나보세요."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle eyebrow="Videos" title="영상" />
        <a
          href="https://www.youtube.com/@seogwipochamber"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-sm text-accent hover:underline"
        >
          <span class="h-5 w-5 shrink-0"><SnsIcon name="youtube" /></span>
          유튜브 채널 바로가기
        </a>
      </div>
      <p v-if="loading" class="text-sm text-muted">불러오는 중...</p>
      <p v-else-if="!videos.length" class="text-sm text-muted">등록된 영상이 없습니다.</p>
      <ul v-else class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-line">
        <li v-for="video in videos" :key="video.id" class=" p-2">
          <div class="aspect-video w-full overflow-hidden">
            <iframe
              class="h-full w-full"
              :src="`https://www.youtube.com/embed/${video.youtubeId}`"
              :title="video.title"
              frameborder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>
          <p class="px-4 py-3 text-sm text-ink">{{ video.title }}</p>
        </li>
      </ul>
    </section>

    <section class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Photos" title="사진" />
          <a
            href="https://www.instagram.com/seogwipochamber/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <span class="h-5 w-5 shrink-0"><SnsIcon name="instagram" /></span>
            인스타그램 바로가기
          </a>
        </div>
        <p v-if="loading" class="text-sm text-muted">불러오는 중...</p>
        <p v-else-if="!photos.length" class="text-sm text-muted">등록된 사진이 없습니다.</p>
        <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="photo in photos" :key="photo.id">
            <img
              :src="photo.imageUrl"
              :alt="photo.alt || ''"
              class="aspect-square w-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
