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
      <ul class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-line">
        <li v-for="video in galleryVideos" :key="video.id" class=" p-2">
          <div class="aspect-video w-full overflow-hidden">
            <iframe
              v-if="video.youtubeId"
              class="h-full w-full"
              :src="video.youtubeId"
              :title="video.title"
              frameborder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
            <div v-else class="flex h-full w-full items-center justify-center bg-ink text-sm text-base">
              영상 준비중입니다.
            </div>
          </div>
          <p class="px-4 py-3 text-sm text-ink">{{ video.title }}</p>
        </li>
      </ul>
    </section>

    <section class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Photos" title="사진" />
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="photo in galleryPhotos" :key="photo.id">
            <img
              :src="photo.src"
              :alt="photo.alt"
              class="h-full w-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
            <!-- <button type="button" class="block aspect-square w-full overflow-hidden" @click="activePhoto = photo">
            </button> -->
          </li>
        </ul>
      </div>
    </section>

    <!-- <LightboxModal v-if="activePhoto" @close="activePhoto = null">
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
    </LightboxModal> -->
  </div>
</template>
