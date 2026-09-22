<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'

const roster = ref([])
const loading = ref(true)

const conductor = computed(() => roster.value.find((m) => m.isConductor) || null)
const members = computed(() => roster.value.filter((m) => !m.isConductor))

onMounted(async () => {
  try {
    const res = await fetch('/api/public/members')
    const data = await res.json()
    roster.value = data.members || []
  } catch {
    roster.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <PageHero
      eyebrow="Members"
      title="단원소개"
      description="서귀포챔버오케스트라를 이끌어가는 지휘자와 단원들을 소개합니다."
    />

    <section v-if="loading || conductor" class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Conductor" title="음악감독, 상임지휘" />
      <p v-if="loading" class="text-sm text-muted">불러오는 중...</p>
      <div v-else class="grid gap-8 sm:grid-cols-[240px_1fr] ">
        <div class="flex items-center justify-center">
          <img
          :src="conductor.photoUrl"
          :alt="`${conductor.name} 프로필 사진`"
          class="h-auto w-full max-w-xs object-contain"
          loading="lazy"
          />
        </div>

        <div>
          <p class="text-lg text-ink">{{ conductor.name }}</p>
          <p class="mt-1 text-sm text-accent">{{ conductor.part }}</p>
          <p class="mt-4 max-w-xl text-sm leading-relaxed text-muted">{{ conductor.bio1 }}</p>
          <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted">{{ conductor.bio2 }}</p>
        </div>
      </div>
    </section>

    <section class="border-t border-line">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Members" title="단원" />
        <p v-if="loading" class="text-sm text-muted">불러오는 중...</p>
        <ul v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <li v-for="member in members" :key="member.id" class="rounded-base border border-line p-4 flex justify-center flex-col items-center shadow-lg">
            <div class="flex h-80 items-center justify-center overflow-hidden rounded-base sm:h-96">
              <img
                :src="member.photoUrl"
                :alt="`${member.name} 프로필 사진`"
                class="h-full w-auto max-w-full rounded-base object-contain"
                loading="lazy"
              />
            </div>
            <p class="mt-4 text-lg font-semibold text-ink">{{ member.name }}</p>
            <p class="mt-1 text-sm font-medium text-accent">{{ member.part }}</p>
            <p class="mt-2 text-xs leading-relaxed text-muted">{{ member.bio1 }}</p>
            <p class="mt-2 text-xs leading-relaxed text-muted">{{ member.bio2 }}</p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
