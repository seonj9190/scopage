<script setup>
import { ref } from 'vue'
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import LightboxModal from '@/components/LightboxModal.vue'
import { galleryPhotos, galleryVideos } from '@/data/gallery.js'

const activePhoto = ref(null)
const activeVideo = ref(null)
</script>

<template>
  <div>
    <PageHero
      eyebrow="Gallery"
      title="갤러리"
      description="공연과 활동 현장의 사진, 영상을 만나보세요."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Videos" title="영상" />
      <ul class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="video in galleryVideos" :key="video.id">
          <button
            type="button"
            class="group relative block aspect-video w-full overflow-hidden"
            @click="activeVideo = video"
          >
            <img
              :src="video.thumbnail"
              :alt="`${video.title} 썸네일`"
              class="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <span class="absolute inset-0 flex items-center justify-center bg-ink/20">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-base/90 text-ink">▶</span>
            </span>
          </button>
          <p class="mt-3 text-sm text-ink">{{ video.title }}</p>
        </li>
      </ul>
    </section>

    <section class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Photos" title="사진" />
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="photo in galleryPhotos" :key="photo.id">
            <button type="button" class="block aspect-square w-full overflow-hidden" @click="activePhoto = photo">
              <img
                :src="photo.src"
                :alt="photo.alt"
                class="h-full w-full object-cover transition-transform hover:scale-105"
                loading="lazy"
              />
            </button>
          </li>
        </ul>
      </div>
    </section>

    <LightboxModal v-if="activePhoto" @close="activePhoto = null">
      <img :src="activePhoto.src" :alt="activePhoto.alt" class="max-h-[80vh] w-auto" />
    </LightboxModal>

    <LightboxModal v-if="activeVideo" @close="activeVideo = null">
      <div class="aspect-video w-[min(80vw,900px)]">
        <iframe
          v-if="activeVideo.youtubeId"
          class="h-full w-full"
          :src="`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`"
          :title="activeVideo.title"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        />
        <div v-else class="flex h-full w-full items-center justify-center bg-ink text-sm text-base">
          영상 준비중입니다.
        </div>
      </div>
    </LightboxModal>
  </div>
</template>
