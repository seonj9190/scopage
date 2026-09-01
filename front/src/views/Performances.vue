<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { performances } from '@/data/performances.js'

const today = new Date()

const selectedImage = ref(null)

function openImage(perf) {
  selectedImage.value = { src: perf.poster, alt: `${perf.title} 포스터` }
}
function closeImage() {
  selectedImage.value = null
}
function handleKeydown(e) {
  if (e.key === 'Escape') closeImage()
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

const upcoming = computed(() =>
  performances
    .filter((p) => new Date(p.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
)
const past = computed(() =>
  performances
    .filter((p) => new Date(p.date) < today)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
)

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}
</script>

<template>
  <div>
    <PageHero
      eyebrow="Performances"
      title="공연일정"
      description="서귀포챔버오케스트라의 예정된 공연과 지난 공연 소식을 확인하세요."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Upcoming" title="예정된 공연" />
      <ul class="space-y-10">
        <li
          v-for="perf in upcoming"
          :key="perf.id"
          class="grid gap-6 border-b border-line pb-10 sm:grid-cols-[160px_1fr]"
        >
          <img
            :src="perf.poster"
            :alt="`${perf.title} 포스터`"
            class="h-auto w-full max-w-[160px] cursor-pointer object-contain"
            loading="lazy"
            @click="openImage(perf)"
          />
          <div>
            <p class="text-xs tracking-[0.2em] text-accent uppercase">
              {{ formatDate(perf.date) }} · {{ perf.time }}
            </p>
            <h3 class="mt-2 text-lg text-ink">{{ perf.title }}</h3>
            <p class="mt-1 text-sm text-muted">{{ perf.venue }}</p>
            <p class="mt-3 text-sm text-muted">{{ perf.program }}</p>
            <p class="mt-3 max-w-xl text-sm leading-relaxed text-muted">{{ perf.description }}</p>
          </div>
        </li>
        <li v-if="upcoming.length === 0" class="text-sm text-muted">예정된 공연이 없습니다.</li>
      </ul>
    </section>

    <section v-if="past.length" class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Archive" title="지난 공연" />
        <ul class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="perf in past" :key="perf.id">
            <img
              :src="perf.poster"
              :alt="`${perf.title} 포스터`"
              class="h-auto w-full cursor-pointer object-contain"
              loading="lazy"
              @click="openImage(perf)"
            />
            <p class="mt-3 text-xs text-accent">{{ formatDate(perf.date) }}</p>
            <p class="mt-1 text-sm text-ink">{{ perf.title }}</p>
            <p class="mt-1 text-xs text-muted">{{ perf.venue }}</p>
          </li>
        </ul>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        @click="closeImage"
      >
        <button
          type="button"
          class="absolute right-6 top-6 text-3xl leading-none text-white/80 hover:text-white"
          aria-label="닫기"
          @click="closeImage"
        >
          &times;
        </button>
        <img
          :src="selectedImage.src"
          :alt="selectedImage.alt"
          class="max-h-full max-w-full object-contain"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>
